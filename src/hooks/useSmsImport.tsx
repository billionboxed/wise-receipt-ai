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
import { isLikelyBankSender } from '@/lib/sms/senders';
import type { Transaction } from '@/types/expense';
import { findBestCategory } from '@/utils/categoryMatcher';
import { aiExtractSms, type SmsCandidate, type AiSmsResult } from '@/lib/sms/aiExtract';
import { useCurrency } from '@/context/CurrencyContext';

export interface SmsPreferences {
  enabled: boolean;
  defaultAccountId: string | null;
  lastScanAt: string | null;
}

export interface PendingSms {
  id: string;
  smsHash: string;
  smsSender: string | null;
  smsRaw: string | null;
  occurredAt: string | null;
  parsedDate: string;
  parsedAmount: number;
  parsedType: 'debit' | 'credit';
  suggestedDescription: string | null;
  suggestedCategoryId: string | null;
  suggestedAccountId: string | null;
  status: 'pending' | 'deleted';
  createdAt: string;
}

const DEFAULT_PREFS: SmsPreferences = {
  enabled: false,
  defaultAccountId: null,
  lastScanAt: null,
};

function mapPending(r: any): PendingSms {
  return {
    id: r.id,
    smsHash: r.sms_hash,
    smsSender: r.sms_sender ?? null,
    smsRaw: r.sms_raw ?? null,
    occurredAt: r.occurred_at ?? null,
    parsedDate: r.parsed_date,
    parsedAmount: Number(r.parsed_amount),
    parsedType: r.parsed_type,
    suggestedDescription: r.suggested_description ?? null,
    suggestedCategoryId: r.suggested_category_id ?? null,
    suggestedAccountId: r.suggested_account_id ?? null,
    status: r.status,
    createdAt: r.created_at,
  };
}

export function useSmsImport() {
  const { user } = useAuth();
  const { accounts, categories, addTransaction } = useExpense();
  const currency = (() => {
    try { return useCurrency().currency.code; } catch { return undefined; }
  })();

  const [prefs, setPrefs] = useState<SmsPreferences>(DEFAULT_PREFS);
  const [cardMap, setCardMap] = useState<{ last4: string; accountId: string }[]>([]);
  const [identifiers, setIdentifiers] = useState<{ id: string; accountId: string; identifier: string }[]>([]);
  const [pending, setPending] = useState<PendingSms[]>([]);
  const [ingestedHashes, setIngestedHashes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const supported = isSmsSupported();

  const loadAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [p, c, ids, pend, ing] = await Promise.all([
      supabase.from('sms_preferences').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('account_card_map').select('last4,account_id').eq('user_id', user.id),
      supabase.from('account_sms_identifiers').select('id,account_id,identifier').eq('user_id', user.id),
      supabase.from('sms_pending').select('*').eq('user_id', user.id).order('parsed_date', { ascending: false }),
      supabase.from('sms_ingested').select('sms_hash').eq('user_id', user.id),
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
    setPending((pend.data || []).map(mapPending));
    setIngestedHashes(new Set((ing.data || []).map((r: any) => r.sms_hash)));
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

  const resolveAccountId = useCallback((p: ParsedSms): string | null => {
    if (p.last4) {
      const hit = cardMap.find(c => c.last4 === p.last4);
      if (hit) return hit.accountId;
    }
    return prefs.defaultAccountId;
  }, [cardMap, prefs.defaultAccountId]);

  /** Build pending-SMS row payloads from a batch of parsed SMS using AI extraction. */
  const toPendingRows = useCallback(async (parsed: ParsedSms[]): Promise<any[]> => {
    if (parsed.length === 0 || !user) return [];

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

    const out: any[] = [];
    parsed.forEach((p, i) => {
      const key = `${i}_${p.hash}`;
      const r = aiById.get(key);

      if (r && r.isTransaction === false) return;
      if (r && r.type === 'credit') return;
      if (!r && p.type === 'credit') return;

      const fallbackCat = findBestCategory(p.merchant, categories).categoryId ?? null;
      const fallbackAcct = resolveAccountId(p);

      out.push({
        user_id: user.id,
        sms_hash: p.hash,
        sms_sender: p.sender || null,
        sms_raw: p.raw,
        occurred_at: new Date(p.occurredAt).toISOString(),
        parsed_date: r?.date || p.date,
        parsed_amount: r?.amount && r.amount > 0 ? r.amount : p.amount,
        parsed_type: r?.type || p.type,
        suggested_description: (r?.description || p.merchant || '').slice(0, 200),
        suggested_category_id: r?.categoryId ?? fallbackCat,
        suggested_account_id: r?.accountId ?? fallbackAcct,
        status: 'pending',
      });
    });

    return out;
  }, [user, accounts, cardMap, identifiers, categories, currency, resolveAccountId]);

  /** Insert pending rows + ingested hashes. Returns saved rows. */
  const persistPending = useCallback(async (rows: any[]): Promise<PendingSms[]> => {
    if (!user || rows.length === 0) return [];
    const { data, error } = await supabase
      .from('sms_pending')
      .upsert(rows, { onConflict: 'user_id,sms_hash', ignoreDuplicates: true })
      .select();
    if (error) {
      console.error('Failed to save pending SMS:', error);
      return [];
    }
    const hashes = rows.map(r => ({ user_id: user.id, sms_hash: r.sms_hash }));
    await supabase.from('sms_ingested').upsert(hashes, { onConflict: 'user_id,sms_hash', ignoreDuplicates: true });
    const mapped = (data || []).map(mapPending);
    setPending(prev => {
      const have = new Set(prev.map(p => p.id));
      return [...mapped.filter(m => !have.has(m.id)), ...prev];
    });
    setIngestedHashes(prev => {
      const next = new Set(prev);
      rows.forEach(r => next.add(r.sms_hash));
      return next;
    });
    return mapped;
  }, [user]);

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
      const debits = parsed.filter(p => p.type === 'debit');

      const allIds = identifiers.map(i => i.identifier.toLowerCase()).filter(Boolean);
      const idFiltered = allIds.length === 0
        ? debits
        : debits.filter(p => {
            const hay = `${p.sender} ${p.raw}`.toLowerCase();
            return allIds.some(id => hay.includes(id));
          });

      const fresh = idFiltered.filter(p => !ingestedHashes.has(p.hash));

      if (fresh.length === 0) {
        await savePrefs({ lastScanAt: new Date().toISOString() });
        return 0;
      }

      toast({ title: 'AI is reading your SMS', description: `Analyzing ${fresh.length} new message(s)…` });
      const rows = await toPendingRows(fresh);
      const saved = await persistPending(rows);
      await savePrefs({ lastScanAt: new Date().toISOString() });
      return saved.length;
    } finally {
      setBusy(false);
    }
  }, [supported, identifiers, ingestedHashes, savePrefs, toPendingRows, persistPending]);

  useEffect(() => {
    if (!supported || !prefs.enabled) return;
    let stop: (() => void) | null = null;
    let cancelled = false;

    let batch: ParsedSms[] = [];
    let timer: ReturnType<typeof setTimeout> | null = null;
    const flush = async () => {
      timer = null;
      if (batch.length === 0 || cancelled) return;
      const b = batch;
      batch = [];
      try {
        const rows = await toPendingRows(b);
        if (!cancelled) await persistPending(rows);
      } catch (err) {
        console.error('Live SMS AI extract failed:', err);
      }
    };

    (async () => {
      stop = await startSmsListener((msg) => {
        if (!isLikelyBankSender(msg.address)) return;
        const p = parseSms(msg);
        if (!p) return;
        if (p.type === 'credit') return;
        const allIds = identifiers.map(i => i.identifier.toLowerCase()).filter(Boolean);
        if (allIds.length > 0) {
          const hay = `${p.sender} ${p.raw}`.toLowerCase();
          if (!allIds.some(id => hay.includes(id))) return;
        }
        if (ingestedHashes.has(p.hash)) return;
        if (cancelled) return;
        batch.push(p);
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => { flush(); }, 2000);
      });
    })();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      stop?.();
    };
  }, [supported, prefs.enabled, identifiers, ingestedHashes, toPendingRows, persistPending]);

  // ---- pending-row actions ----

  const confirmPending = useCallback(async (id: string, overrides?: Partial<Transaction>): Promise<boolean> => {
    const row = pending.find(p => p.id === id);
    if (!row) return false;
    const txn: Omit<Transaction, 'id'> = {
      date: (overrides?.date ?? row.parsedDate),
      description: (overrides?.description ?? row.suggestedDescription ?? 'SMS Transaction').slice(0, 200),
      amount: overrides?.amount ?? row.parsedAmount,
      type: (overrides?.type ?? row.parsedType) as 'debit' | 'credit',
      categoryId: overrides?.categoryId ?? row.suggestedCategoryId,
      accountId: overrides?.accountId ?? row.suggestedAccountId,
      tagIds: overrides?.tagIds ?? [],
      status: 'confirmed',
      aiSuggested: true,
      source: 'sms',
      smsSender: row.smsSender,
      smsRaw: row.smsRaw,
      smsReviewed: true,
    };
    try {
      await addTransaction(txn);
    } catch (err: any) {
      toast({ title: 'Could not add transaction', description: err?.message || 'Try again.', variant: 'destructive' });
      return false;
    }
    await supabase.from('sms_pending').delete().eq('id', id);
    setPending(prev => prev.filter(p => p.id !== id));
    return true;
  }, [pending, addTransaction]);

  const confirmMany = useCallback(async (ids: string[]) => {
    let ok = 0;
    for (const id of ids) {
      const success = await confirmPending(id);
      if (success) ok++;
    }
    return ok;
  }, [confirmPending]);

  const deletePending = useCallback(async (id: string) => {
    const { error } = await supabase.from('sms_pending').update({ status: 'deleted' }).eq('id', id);
    if (error) {
      toast({ title: 'Could not delete', description: error.message, variant: 'destructive' });
      return;
    }
    setPending(prev => prev.map(p => p.id === id ? { ...p, status: 'deleted' } : p));
  }, []);

  const deleteMany = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return;
    const { error } = await supabase.from('sms_pending').update({ status: 'deleted' }).in('id', ids);
    if (error) {
      toast({ title: 'Could not delete', description: error.message, variant: 'destructive' });
      return;
    }
    setPending(prev => prev.map(p => ids.includes(p.id) ? { ...p, status: 'deleted' } : p));
  }, []);

  const restorePending = useCallback(async (id: string) => {
    const { error } = await supabase.from('sms_pending').update({ status: 'pending' }).eq('id', id);
    if (error) {
      toast({ title: 'Could not restore', description: error.message, variant: 'destructive' });
      return;
    }
    setPending(prev => prev.map(p => p.id === id ? { ...p, status: 'pending' } : p));
  }, []);

  const purgePending = useCallback(async (id: string) => {
    await supabase.from('sms_pending').delete().eq('id', id);
    setPending(prev => prev.filter(p => p.id !== id));
  }, []);

  const emptyTrash = useCallback(async () => {
    if (!user) return;
    await supabase.from('sms_pending').delete().eq('user_id', user.id).eq('status', 'deleted');
    setPending(prev => prev.filter(p => p.status !== 'deleted'));
  }, [user]);

  /**
   * Re-apply the current identifier list to existing pending rows.
   * - Rows whose sender+body match no identifier → soft-deleted (recoverable from Deleted SMS).
   * - Rows that match and have no account → auto-filled with that identifier's account.
   * Returns { removed, autoAssigned }.
   */
  const reapplyIdentifiers = useCallback(async (): Promise<{ removed: number; autoAssigned: number }> => {
    const ids = identifiers
      .map(i => ({ accountId: i.accountId, needle: i.identifier.toLowerCase() }))
      .filter(i => i.needle);
    if (ids.length === 0) return { removed: 0, autoAssigned: 0 };

    const active = pending.filter(p => p.status === 'pending');
    const toRemove: string[] = [];
    const toAssign: { id: string; accountId: string }[] = [];

    for (const row of active) {
      const hay = `${row.smsSender ?? ''} ${row.smsRaw ?? ''}`.toLowerCase();
      const match = ids.find(i => hay.includes(i.needle));
      if (!match) {
        toRemove.push(row.id);
      } else if (!row.suggestedAccountId) {
        toAssign.push({ id: row.id, accountId: match.accountId });
      }
    }

    if (toRemove.length > 0) await deleteMany(toRemove);
    for (const a of toAssign) await updatePending(a.id, { suggestedAccountId: a.accountId });

    return { removed: toRemove.length, autoAssigned: toAssign.length };
  }, [identifiers, pending, deleteMany]);

  const updatePending = useCallback(async (
    id: string,
    updates: Partial<Pick<PendingSms, 'suggestedCategoryId' | 'suggestedAccountId' | 'suggestedDescription'>>,
  ) => {
    const payload: any = {};
    if (updates.suggestedCategoryId !== undefined) payload.suggested_category_id = updates.suggestedCategoryId;
    if (updates.suggestedAccountId !== undefined) payload.suggested_account_id = updates.suggestedAccountId;
    if (updates.suggestedDescription !== undefined) payload.suggested_description = updates.suggestedDescription;
    if (Object.keys(payload).length === 0) return;
    await supabase.from('sms_pending').update(payload).eq('id', id);
    setPending(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  }, []);

  return {
    supported,
    loading,
    busy,
    prefs,
    cardMap,
    identifiers,
    pending,
    savePrefs,
    addIdentifier,
    removeIdentifier,
    scanInbox,
    confirmPending,
    confirmMany,
    deletePending,
    deleteMany,
    restorePending,
    purgePending,
    emptyTrash,
    updatePending,
    reapplyIdentifiers,
    reload: loadAll,
  };
}