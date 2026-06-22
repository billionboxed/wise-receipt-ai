import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useExpense } from '@/context/ExpenseContext';
import { toast } from '@/hooks/use-toast';
import {
  isSmsSupported,
  checkSmsPermission,
  requestSmsPermission,
  readInbox,
  startSmsListener,
} from '@/lib/sms/native';
import { parseSmsBatch, ParsedSms, parseSms } from '@/lib/sms/parser';
import { isLikelyBankSender, normalizeSender } from '@/lib/sms/senders';
import type { Transaction } from '@/types/expense';
import { findBestCategory } from '@/utils/categoryMatcher';

export interface SmsPreferences {
  enabled: boolean;
  defaultAccountId: string | null;
  lastScanAt: string | null;
}

const DEFAULT_PREFS: SmsPreferences = {
  enabled: false,
  defaultAccountId: null,
  lastScanAt: null,
};

export function useSmsImport() {
  const { user } = useAuth();
  const { accounts, categories, addTransactions, transactions } = useExpense();

  const [prefs, setPrefs] = useState<SmsPreferences>(DEFAULT_PREFS);
  const [allowlist, setAllowlist] = useState<{ id: string; sender: string; enabled: boolean }[]>([]);
  const [cardMap, setCardMap] = useState<{ last4: string; accountId: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const supported = isSmsSupported();

  const loadAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [p, a, c] = await Promise.all([
      supabase.from('sms_preferences').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('sms_sender_allowlist').select('id,sender,enabled').eq('user_id', user.id),
      supabase.from('account_card_map').select('last4,account_id').eq('user_id', user.id),
    ]);
    if (p.data) {
      setPrefs({
        enabled: p.data.enabled,
        defaultAccountId: p.data.default_account_id,
        lastScanAt: p.data.last_scan_at,
      });
    }
    setAllowlist((a.data || []).map(r => ({ id: r.id, sender: r.sender, enabled: r.enabled })));
    setCardMap((c.data || []).map(r => ({ last4: r.last4, accountId: r.account_id })));
    setLoading(false);
  }, [user]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const savePrefs = useCallback(async (next: Partial<SmsPreferences>) => {
    if (!user) return;
    const merged = { ...prefs, ...next };
    setPrefs(merged);
    await supabase.from('sms_preferences').upsert({
      user_id: user.id,
      enabled: merged.enabled,
      default_account_id: merged.defaultAccountId,
      last_scan_at: merged.lastScanAt,
    });
  }, [user, prefs]);

  const addSender = useCallback(async (sender: string) => {
    if (!user) return;
    const norm = normalizeSender(sender) || sender.toUpperCase();
    const { data } = await supabase
      .from('sms_sender_allowlist')
      .upsert({ user_id: user.id, sender: norm, enabled: true }, { onConflict: 'user_id,sender' })
      .select()
      .single();
    if (data) {
      setAllowlist(prev => {
        const without = prev.filter(s => s.sender !== norm);
        return [...without, { id: data.id, sender: data.sender, enabled: data.enabled }];
      });
    }
  }, [user]);

  const toggleSender = useCallback(async (id: string, enabled: boolean) => {
    setAllowlist(prev => prev.map(s => s.id === id ? { ...s, enabled } : s));
    await supabase.from('sms_sender_allowlist').update({ enabled }).eq('id', id);
  }, []);

  const removeSender = useCallback(async (id: string) => {
    setAllowlist(prev => prev.filter(s => s.id !== id));
    await supabase.from('sms_sender_allowlist').delete().eq('id', id);
  }, []);

  /** Build a dedupe set from existing transactions' (date, amount, type). */
  const existingHashSet = useCallback(() => {
    const set = new Set<string>();
    for (const t of transactions) {
      // bucket by date + amount + type so SMS-after-statement-upload don't double
      set.add(`${t.date}|${t.amount.toFixed(2)}|${t.type}`);
    }
    return set;
  }, [transactions]);

  const resolveAccountId = useCallback((p: ParsedSms): string | null => {
    if (p.last4) {
      const hit = cardMap.find(c => c.last4 === p.last4);
      if (hit) return hit.accountId;
    }
    return prefs.defaultAccountId;
  }, [cardMap, prefs.defaultAccountId]);

  /** Convert parsed SMS into Transaction inserts (without dedupe or categorize). */
  const toTransactions = useCallback((parsed: ParsedSms[]): Omit<Transaction, 'id'>[] => {
    return parsed.map(p => {
      const match = findBestCategory(p.merchant, categories);
      const catId = match.categoryId ?? null;
      return {
        date: p.date,
        description: p.merchant,
        amount: p.amount,
        type: p.type,
        categoryId: catId,
        accountId: resolveAccountId(p),
        tagIds: [],
        status: 'confirmed' as const,
        aiSuggested: true,
        source: 'sms' as const,
        smsSender: p.sender,
        smsRaw: p.raw,
        smsReviewed: false,
      };
    });
  }, [categories, resolveAccountId]);

  /** Read inbox, filter by allowlist, parse, dedupe vs existing transactions, insert. */
  const scanInbox = useCallback(async (sinceEpochMs?: number): Promise<number> => {
    if (!supported) return 0;
    setBusy(true);
    try {
      const granted = await checkSmsPermission();
      if (!granted) {
        const ok = await requestSmsPermission();
        if (!ok) {
          toast({ title: 'Permission denied', description: 'Enable SMS access in system settings.', variant: 'destructive' });
          return 0;
        }
      }
      const raw = await readInbox(sinceEpochMs);
      const enabledSenders = new Set(
        allowlist.filter(s => s.enabled).map(s => s.sender.toUpperCase())
      );
      const filtered = raw.filter(m => {
        const n = normalizeSender(m.address);
        if (enabledSenders.size === 0) return isLikelyBankSender(m.address);
        return enabledSenders.has(n) || isLikelyBankSender(m.address);
      });
      const parsed = parseSmsBatch(filtered);

      const existing = existingHashSet();
      const fresh = parsed.filter(p => !existing.has(`${p.date}|${p.amount.toFixed(2)}|${p.type}`));

      if (fresh.length === 0) {
        await savePrefs({ lastScanAt: new Date().toISOString() });
        return 0;
      }

      await addTransactions(toTransactions(fresh));
      await savePrefs({ lastScanAt: new Date().toISOString() });
      return fresh.length;
    } finally {
      setBusy(false);
    }
  }, [supported, allowlist, addTransactions, existingHashSet, savePrefs, toTransactions]);

  /** Discover candidate senders from the inbox so the user can opt in. */
  const discoverSenders = useCallback(async (): Promise<string[]> => {
    if (!supported) return [];
    const granted = await checkSmsPermission() || await requestSmsPermission();
    if (!granted) return [];
    const ninetyDays = Date.now() - 90 * 24 * 60 * 60 * 1000;
    const raw = await readInbox(ninetyDays);
    const senders = new Map<string, number>();
    for (const m of raw) {
      const parsed = parseSms(m);
      if (!parsed) continue;
      const n = normalizeSender(m.address);
      if (!n) continue;
      senders.set(n, (senders.get(n) || 0) + 1);
    }
    return [...senders.entries()].sort((a, b) => b[1] - a[1]).map(([s]) => s);
  }, [supported]);

  /** Foreground live listener — wires the native receiver into the import path. */
  useEffect(() => {
    if (!supported || !prefs.enabled) return;
    let stop: (() => void) | null = null;
    let cancelled = false;

    const enabledSenders = new Set(
      allowlist.filter(s => s.enabled).map(s => s.sender.toUpperCase())
    );

    (async () => {
      stop = await startSmsListener((msg) => {
        const n = normalizeSender(msg.address);
        if (enabledSenders.size > 0 && !enabledSenders.has(n) && !isLikelyBankSender(msg.address)) return;
        const p = parseSms(msg);
        if (!p) return;
        const existing = existingHashSet();
        if (existing.has(`${p.date}|${p.amount.toFixed(2)}|${p.type}`)) return;
        if (cancelled) return;
        addTransactions(toTransactions([p]));
      });
    })();

    return () => {
      cancelled = true;
      stop?.();
    };
  }, [supported, prefs.enabled, allowlist, addTransactions, existingHashSet, toTransactions]);

  return {
    supported,
    loading,
    busy,
    prefs,
    allowlist,
    cardMap,
    savePrefs,
    addSender,
    toggleSender,
    removeSender,
    scanInbox,
    discoverSenders,
    reload: loadAll,
  };
}