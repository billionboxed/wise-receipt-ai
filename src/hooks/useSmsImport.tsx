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
import { aiExtractSms, type SmsCandidate, type AiSmsResult } from '@/lib/sms/aiExtract';
import { useCurrency } from '@/context/CurrencyContext';

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
  const currency = (() => {
    try { return useCurrency().currency.code; } catch { return undefined; }
  })();

  const [prefs, setPrefs] = useState<SmsPreferences>(DEFAULT_PREFS);
  const [cardMap, setCardMap] = useState<{ last4: string; accountId: string }[]>([]);
  const [identifiers, setIdentifiers] = useState<{ id: string; accountId: string; identifier: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const supported = isSmsSupported();

  const loadAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [p, c, ids] = await Promise.all([
      supabase.from('sms_preferences').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('account_card_map').select('last4,account_id').eq('user_id', user.id),
      supabase.from('account_sms_identifiers').select('id,account_id,identifier').eq('user_id', user.id),
    ]);
    if (p.data) {
      setPrefs({
        enabled: p.data.enabled,
        defaultAccountId: p.data.default_account_id,
        lastScanAt: p.data.last_scan_at,
      });
    }
    setCardMap((c.data || []).map(r => ({ last4: r.last4, accountId: r.account_id })));
    setIdentifiers((ids.data || []).map(r => ({ id: r.id, accountId: r.account_id, identifier: r.identifier })));
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

  const addIdentifier = useCallback(async (accountId: string, identifier: string) => {
    if (!user) return;
    const value = identifier.trim();
    if (!value) return;
    const { data, error } = await supabase
      .from('account_sms_identifiers')
      .insert({ user_id: user.id, account_id: accountId, identifier: value })
      .select()
      .single();
    if (error) {
      toast({ title: 'Could not add identifier', description: error.message, variant: 'destructive' });
      return;
    }
    if (data) {
      setIdentifiers(prev => [...prev, { id: data.id, accountId: data.account_id, identifier: data.identifier }]);
    }
  }, [user]);

  const removeIdentifier = useCallback(async (id: string) => {
    setIdentifiers(prev => prev.filter(i => i.id !== id));
    await supabase.from('account_sms_identifiers').delete().eq('id', id);
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

  /** Convert parsed SMS into Transaction inserts using AI extraction for category/account/description. */
  const toTransactionsAI = useCallback(async (parsed: ParsedSms[]): Promise<Omit<Transaction, 'id'>[]> => {
    if (parsed.length === 0) return [];

    const candidates: SmsCandidate[] = parsed.map((p, i) => ({
      id: `${i}_${p.hash}`,
      sender: p.sender,
      body: p.raw,
      occurredAt: p.occurredAt,
    }));

    const accountRefs = accounts.map(a => {
      const ids = identifiers.filter(i => i.accountId === a.id).map(i => i.identifier);
      const legacy = cardMap.find(c => c.accountId === a.id)?.last4;
      if (legacy && !ids.some(s => s.toLowerCase() === legacy.toLowerCase())) ids.push(legacy);
      return { id: a.id, name: a.name, identifiers: ids };
    });

    let ai: AiSmsResult[] = [];
    try {
      ai = await aiExtractSms(candidates, categories, accountRefs, currency);
    } catch (err) {
      console.error('AI SMS extraction failed, falling back to regex:', err);
      toast({ title: 'AI parsing unavailable', description: 'Using basic SMS parser instead.', variant: 'destructive' });
    }

    const aiById = new Map(ai.map(r => [r.id, r]));

    const out: Omit<Transaction, 'id'>[] = [];
    parsed.forEach((p, i) => {
      const key = `${i}_${p.hash}`;
      const r = aiById.get(key);

      // Skip non-transactions, credits (expense-only), and unmatched accounts
      if (r && r.isTransaction === false) return;
      if (r && r.type === 'credit') return;
      if (!r && p.type === 'credit') return;

      const fallbackCat = findBestCategory(p.merchant, categories).categoryId ?? null;
      const fallbackAcct = resolveAccountId(p);

      out.push({
        date: r?.date || p.date,
        description: (r?.description || p.merchant || '').slice(0, 200),
        amount: r?.amount && r.amount > 0 ? r.amount : p.amount,
        type: r?.type || p.type,
        categoryId: r?.categoryId ?? fallbackCat,
        accountId: r?.accountId ?? fallbackAcct,
        tagIds: [],
        status: 'confirmed' as const,
        aiSuggested: true,
        source: 'sms' as const,
        smsSender: p.sender,
        smsRaw: p.raw,
        smsReviewed: false,
      });
    });

    return out;
  }, [accounts, cardMap, identifiers, categories, currency, resolveAccountId]);

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
      const filtered = raw.filter(m => isLikelyBankSender(m.address));
      const parsed = parseSmsBatch(filtered);

      // Expense-only: drop credits before AI/DB hit
      const debits = parsed.filter(p => p.type === 'debit');

      // Pre-filter by tracked account identifiers (if any configured)
      const allIds = identifiers.map(i => i.identifier.toLowerCase()).filter(Boolean);
      const idFiltered = allIds.length === 0
        ? debits
        : debits.filter(p => {
            const hay = `${p.sender} ${p.raw}`.toLowerCase();
            return allIds.some(id => hay.includes(id));
          });

      const existing = existingHashSet();
      const fresh = idFiltered.filter(p => !existing.has(`${p.date}|${p.amount.toFixed(2)}|${p.type}`));

      if (fresh.length === 0) {
        await savePrefs({ lastScanAt: new Date().toISOString() });
        return 0;
      }

      toast({ title: 'AI is reading your SMS', description: `Analyzing ${fresh.length} new message(s)…` });
      const inserts = await toTransactionsAI(fresh);
      if (inserts.length > 0) await addTransactions(inserts);
      await savePrefs({ lastScanAt: new Date().toISOString() });
      return inserts.length;
    } finally {
      setBusy(false);
    }
  }, [supported, identifiers, addTransactions, existingHashSet, savePrefs, toTransactionsAI]);

  /** Foreground live listener — wires the native receiver into the import path. */
  useEffect(() => {
    if (!supported || !prefs.enabled) return;
    let stop: (() => void) | null = null;
    let cancelled = false;

    let pending: ParsedSms[] = [];
    let timer: ReturnType<typeof setTimeout> | null = null;
    const flush = async () => {
      timer = null;
      if (pending.length === 0 || cancelled) return;
      const batch = pending;
      pending = [];
      try {
        const inserts = await toTransactionsAI(batch);
        if (!cancelled && inserts.length > 0) await addTransactions(inserts);
      } catch (err) {
        console.error('Live SMS AI extract failed:', err);
      }
    };

    (async () => {
      stop = await startSmsListener((msg) => {
        if (!isLikelyBankSender(msg.address)) return;
        const p = parseSms(msg);
        if (!p) return;
        if (p.type === 'credit') return; // expense-only
        const allIds = identifiers.map(i => i.identifier.toLowerCase()).filter(Boolean);
        if (allIds.length > 0) {
          const hay = `${p.sender} ${p.raw}`.toLowerCase();
          if (!allIds.some(id => hay.includes(id))) return;
        }
        const existing = existingHashSet();
        if (existing.has(`${p.date}|${p.amount.toFixed(2)}|${p.type}`)) return;
        if (cancelled) return;
        pending.push(p);
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => { flush(); }, 2000);
      });
    })();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      stop?.();
    };
  }, [supported, prefs.enabled, identifiers, addTransactions, existingHashSet, toTransactionsAI]);

  return {
    supported,
    loading,
    busy,
    prefs,
    cardMap,
    identifiers,
    savePrefs,
    addIdentifier,
    removeIdentifier,
    scanInbox,
    reload: loadAll,
  };
}