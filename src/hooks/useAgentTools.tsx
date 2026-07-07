import { useCallback, useMemo } from 'react';
import { format, startOfMonth, startOfYear, endOfMonth, subMonths } from 'date-fns';
import { useExpense } from '@/context/ExpenseContext';
import { useSmsImport, PendingSms } from '@/hooks/useSmsImport';
import type { Transaction, Category, Tag, Account } from '@/types/expense';
import { useAgentUndo, UndoEntry } from './useAgentUndo';
import { supabase } from '@/integrations/supabase/client';

export interface ToolExecutionResult {
  ok: boolean;
  data?: any;
  error?: string;
  undo?: UndoEntry;
}

function safe<T>(fn: () => Promise<T> | T): Promise<ToolExecutionResult> {
  return Promise.resolve()
    .then(() => fn())
    .then((data) => ({ ok: true, data }))
    .catch((err: any) => ({ ok: false, error: err?.message || String(err) }));
}

function slim(t: Transaction) {
  return {
    id: t.id,
    date: t.date,
    description: t.description,
    amount: t.amount,
    type: t.type,
    categoryId: t.categoryId,
    accountId: t.accountId,
    tagIds: t.tagIds,
  };
}
function slimPending(p: PendingSms) {
  return {
    id: p.id,
    date: p.parsedDate,
    amount: p.parsedAmount,
    description: p.suggestedDescription,
    categoryId: p.suggestedCategoryId,
    accountId: p.suggestedAccountId,
    sender: p.smsSender,
    body: p.smsRaw?.slice(0, 200),
    status: p.status,
  };
}

export function useAgentTools() {
  const expense = useExpense();
  const sms = useSmsImport();
  const undo = useAgentUndo();

  const {
    transactions, categories, tags, accounts,
    addTransaction, deleteTransaction, updateTransaction,
    addCategory, addTag, addAccount, deleteAccount, updateAccount,
  } = expense;

  const execute = useCallback(async (name: string, args: any): Promise<ToolExecutionResult> => {
    switch (name) {
      // -------- Reads --------
      case 'list_accounts':
        return { ok: true, data: accounts };
      case 'list_categories':
        return { ok: true, data: categories.map((c) => ({ id: c.id, name: c.combined })) };
      case 'list_tags':
        return { ok: true, data: tags };
      case 'list_transactions': {
        const limit = Math.min(Math.max(args?.limit ?? 20, 1), 50);
        let out = transactions.filter((t) => t.status === 'confirmed');
        if (args?.since) out = out.filter((t) => t.date >= args.since);
        if (args?.until) out = out.filter((t) => t.date <= args.until);
        if (args?.categoryName) {
          const cat = categories.find((c) => c.combined.toLowerCase().includes(String(args.categoryName).toLowerCase()));
          if (cat) out = out.filter((t) => t.categoryId === cat.id);
        }
        if (args?.accountName) {
          const acc = accounts.find((a) => a.name.toLowerCase().includes(String(args.accountName).toLowerCase()));
          if (acc) out = out.filter((t) => t.accountId === acc.id);
        }
        return { ok: true, data: out.slice(0, limit).map(slim) };
      }
      case 'get_spending_summary': {
        const now = new Date();
        const p = String(args?.period || 'this_month');
        let start: Date, end: Date | null = null;
        if (p === 'this_month') { start = startOfMonth(now); end = endOfMonth(now); }
        else if (p === 'last_month') { const m = subMonths(now, 1); start = startOfMonth(m); end = endOfMonth(m); }
        else if (p === 'this_year') { start = startOfYear(now); end = now; }
        else { start = new Date(0); end = now; }
        const s = format(start, 'yyyy-MM-dd');
        const e = end ? format(end, 'yyyy-MM-dd') : format(now, 'yyyy-MM-dd');
        const txns = transactions.filter((t) => t.status === 'confirmed' && t.type === 'debit' && t.date >= s && t.date <= e);
        const total = txns.reduce((a, t) => a + t.amount, 0);
        const byCat: Record<string, number> = {};
        txns.forEach((t) => {
          const cn = categories.find((c) => c.id === t.categoryId)?.combined || 'Uncategorized';
          byCat[cn] = (byCat[cn] || 0) + t.amount;
        });
        return { ok: true, data: { period: p, from: s, to: e, total, count: txns.length, byCategory: byCat } };
      }
      case 'list_sms_identifiers':
        return { ok: true, data: sms.identifiers.map((i) => ({
          id: i.id, identifier: i.identifier, accountId: i.accountId,
          accountName: accounts.find((a) => a.id === i.accountId)?.name,
        })) };
      case 'list_pending_sms': {
        let out = sms.pending.filter((p) => p.status === 'pending');
        if (args?.accountId) out = out.filter((p) => p.suggestedAccountId === args.accountId);
        if (args?.accountName) {
          const needle = String(args.accountName).toLowerCase();
          const acc = accounts.find((a) => a.name.toLowerCase().includes(needle));
          if (acc) {
            const idSet = new Set(sms.identifiers.filter((i) => i.accountId === acc.id).map((i) => i.identifier.toLowerCase()));
            out = out.filter((p) => {
              if (p.suggestedAccountId === acc.id) return true;
              const hay = `${p.smsSender ?? ''} ${p.smsRaw ?? ''}`.toLowerCase();
              for (const n of idSet) if (hay.includes(n)) return true;
              return hay.includes(needle);
            });
          } else {
            out = out.filter((p) => `${p.smsSender ?? ''} ${p.smsRaw ?? ''}`.toLowerCase().includes(needle));
          }
        }
        return { ok: true, data: out.map(slimPending) };
      }
      case 'list_deleted_sms': {
        let out = sms.pending.filter((p) => p.status === 'deleted');
        if (args?.accountName) {
          const needle = String(args.accountName).toLowerCase();
          out = out.filter((p) => `${p.smsSender ?? ''} ${p.smsRaw ?? ''}`.toLowerCase().includes(needle));
        }
        return { ok: true, data: out.map(slimPending) };
      }

      // -------- Single mutations (with undo) --------
      case 'add_expense': {
        const payload: Omit<Transaction, 'id'> = {
          date: args.date,
          description: args.description,
          amount: Number(args.amount),
          type: 'debit',
          categoryId: args.categoryId,
          accountId: args.accountId,
          tagIds: args.tagIds || [],
          status: 'confirmed',
          source: 'manual',
        };
        return safe(async () => {
          const before = new Set(transactions.map((t) => t.id));
          await addTransaction(payload);
          // Locate the new row from Supabase (addTransaction returns void).
          const { data } = await supabase.from('transactions')
            .select('id').order('created_at', { ascending: false }).limit(5);
          const newId = (data || []).map((r: any) => r.id).find((id: string) => !before.has(id));
          if (newId) {
            undo.set({
              label: `Undo: delete "${payload.description}"`,
              run: async () => { await deleteTransaction(newId); },
            });
          }
          return { added: true, id: newId };
        });
      }
      case 'delete_expense': {
        const snap = transactions.find((t) => t.id === args.id);
        if (!snap) return { ok: false, error: 'Transaction not found' };
        return safe(async () => {
          await deleteTransaction(args.id);
          undo.set({
            label: `Undo: restore "${snap.description}"`,
            run: async () => {
              const { id: _drop, ...rest } = snap;
              await addTransaction(rest);
            },
          });
          return { deleted: true };
        });
      }
      case 'update_expense': {
        const snap = transactions.find((t) => t.id === args.id);
        if (!snap) return { ok: false, error: 'Transaction not found' };
        const updates: Partial<Transaction> = {};
        for (const k of ['date','description','categoryId','accountId'] as const) {
          if (args[k] !== undefined) (updates as any)[k] = args[k];
        }
        if (args.amount !== undefined) updates.amount = Number(args.amount);
        return safe(async () => {
          await updateTransaction(args.id, updates);
          const before: Partial<Transaction> = {};
          for (const k of Object.keys(updates) as (keyof Transaction)[]) (before as any)[k] = (snap as any)[k];
          undo.set({
            label: `Undo: revert "${snap.description}"`,
            run: async () => { await updateTransaction(args.id, before); },
          });
          return { updated: true };
        });
      }
      case 'add_category': {
        const combined = `${args.main} > ${args.sub}`;
        return safe(async () => {
          const before = new Set(categories.map((c) => c.id));
          await addCategory({ main: args.main, sub: args.sub, combined });
          const { data } = await supabase.from('categories').select('id').order('created_at', { ascending: false }).limit(5);
          const newId = (data || []).map((r: any) => r.id).find((id: string) => !before.has(id));
          if (newId) {
            undo.set({
              label: `Undo: remove category "${combined}"`,
              run: async () => { await expense.deleteCategory(newId); },
            });
          }
          return { added: true, id: newId, combined };
        });
      }
      case 'rename_category': {
        const snap = categories.find((c) => c.id === args.id);
        if (!snap) return { ok: false, error: 'Category not found' };
        const main = args.main ?? snap.main;
        const sub = args.sub ?? snap.sub;
        const combined = `${main} > ${sub}`;
        return safe(async () => {
          await expense.updateCategory(args.id, { main, sub, combined });
          undo.set({
            label: `Undo: restore category "${snap.combined}"`,
            run: async () => { await expense.updateCategory(args.id, { main: snap.main, sub: snap.sub, combined: snap.combined }); },
          });
          return { renamed: true, combined };
        });
      }
      case 'delete_category': {
        const snap = categories.find((c) => c.id === args.id);
        if (!snap) return { ok: false, error: 'Category not found' };
        return safe(async () => {
          await expense.deleteCategory(args.id);
          undo.set({
            label: `Undo: recreate category "${snap.combined}"`,
            run: async () => { await addCategory({ main: snap.main, sub: snap.sub, combined: snap.combined }); },
          });
          return { deleted: true };
        });
      }
      case 'add_tag': {
        return safe(async () => {
          const before = new Set(tags.map((t) => t.id));
          await addTag({ name: args.name, color: args.color || '#6366f1' });
          const { data } = await supabase.from('tags').select('id').order('created_at', { ascending: false }).limit(5);
          const newId = (data || []).map((r: any) => r.id).find((id: string) => !before.has(id));
          if (newId) {
            undo.set({
              label: `Undo: remove tag "${args.name}"`,
              run: async () => { await expense.deleteTag(newId); },
            });
          }
          return { added: true, id: newId };
        });
      }
      case 'rename_tag': {
        const snap = tags.find((t) => t.id === args.id);
        if (!snap) return { ok: false, error: 'Tag not found' };
        const updates: Partial<Tag> = {};
        if (args.name !== undefined) updates.name = args.name;
        if (args.color !== undefined) updates.color = args.color;
        return safe(async () => {
          await expense.updateTag(args.id, updates);
          undo.set({
            label: `Undo: restore tag "${snap.name}"`,
            run: async () => { await expense.updateTag(args.id, { name: snap.name, color: snap.color }); },
          });
          return { renamed: true };
        });
      }
      case 'archive_tag': {
        const snap = tags.find((t) => t.id === args.id);
        if (!snap) return { ok: false, error: 'Tag not found' };
        const target = !!args.archived;
        return safe(async () => {
          await expense.updateTag(args.id, { archived: target } as any);
          undo.set({
            label: `Undo: ${target ? 'un-archive' : 'archive'} tag "${snap.name}"`,
            run: async () => { await expense.updateTag(args.id, { archived: !target } as any); },
          });
          return { archived: target };
        });
      }
      case 'delete_tag': {
        const snap = tags.find((t) => t.id === args.id);
        if (!snap) return { ok: false, error: 'Tag not found' };
        return safe(async () => {
          await expense.deleteTag(args.id);
          undo.set({
            label: `Undo: recreate tag "${snap.name}"`,
            run: async () => { await addTag({ name: snap.name, color: snap.color }); },
          });
          return { deleted: true };
        });
      }
      case 'add_account': {
        const type = ['bank','credit','cash','wallet'].includes(args.type) ? args.type : 'bank';
        return safe(async () => {
          const before = new Set(accounts.map((a) => a.id));
          await addAccount({ name: args.name, type });
          const { data } = await supabase.from('accounts').select('id').order('created_at', { ascending: false }).limit(5);
          const newId = (data || []).map((r: any) => r.id).find((id: string) => !before.has(id));
          if (newId) {
            undo.set({
              label: `Undo: remove account "${args.name}"`,
              run: async () => { await deleteAccount(newId); },
            });
          }
          return { added: true, id: newId };
        });
      }
      case 'delete_account': {
        const snap = accounts.find((a) => a.id === args.id);
        if (!snap) return { ok: false, error: 'Account not found' };
        return safe(async () => {
          await deleteAccount(args.id);
          undo.set({
            label: `Undo: restore account "${snap.name}"`,
            run: async () => { await addAccount({ name: snap.name, type: snap.type }); },
          });
          return { deleted: true };
        });
      }
      case 'rename_account': {
        const snap = accounts.find((a) => a.id === args.id);
        if (!snap) return { ok: false, error: 'Account not found' };
        const updates: Partial<Account> = {};
        if (args.name !== undefined) updates.name = args.name;
        if (args.type !== undefined && ['bank','credit','cash','wallet'].includes(args.type)) updates.type = args.type;
        return safe(async () => {
          await updateAccount(args.id, updates);
          undo.set({
            label: `Undo: restore account "${snap.name}"`,
            run: async () => { await updateAccount(args.id, { name: snap.name, type: snap.type }); },
          });
          return { renamed: true };
        });
      }
      case 'edit_pending_sms': {
        const snap = sms.pending.find((p) => p.id === args.id);
        if (!snap) return { ok: false, error: 'Pending SMS not found' };
        const updates: any = {};
        if (args.description !== undefined) updates.suggestedDescription = args.description;
        if (args.categoryId !== undefined) updates.suggestedCategoryId = args.categoryId;
        if (args.accountId !== undefined) updates.suggestedAccountId = args.accountId;
        return safe(async () => {
          await sms.updatePending(args.id, updates);
          const revert: any = {
            suggestedDescription: snap.suggestedDescription,
            suggestedCategoryId: snap.suggestedCategoryId,
            suggestedAccountId: snap.suggestedAccountId,
          };
          undo.set({
            label: 'Undo: revert pending SMS edit',
            run: async () => { await sms.updatePending(args.id, revert); },
          });
          return { updated: true };
        });
      }
      case 'add_sms_identifier': {
        return safe(async () => {
          const before = new Set(sms.identifiers.map((i) => i.id));
          await sms.addIdentifier(args.accountId, args.identifier);
          // sms.identifiers state updates async; fetch fresh from DB to find id
          const { data } = await supabase.from('account_sms_identifiers')
            .select('id').order('created_at', { ascending: false }).limit(5);
          const newId = (data || []).map((r: any) => r.id).find((id: string) => !before.has(id));
          if (newId) {
            undo.set({
              label: `Undo: remove identifier "${args.identifier}"`,
              run: async () => { await sms.removeIdentifier(newId); },
            });
          }
          return { added: true, id: newId };
        });
      }
      case 'remove_sms_identifier': {
        const snap = sms.identifiers.find((i) => i.id === args.id);
        if (!snap) return { ok: false, error: 'Identifier not found' };
        return safe(async () => {
          await sms.removeIdentifier(args.id);
          undo.set({
            label: `Undo: re-add identifier "${snap.identifier}"`,
            run: async () => { await sms.addIdentifier(snap.accountId, snap.identifier); },
          });
          return { deleted: true };
        });
      }
      case 'confirm_pending_sms': {
        return safe(async () => {
          const ok = await sms.confirmPending(args.id);
          // Non-reversible cleanly (would need to rebuild the SMS row); skip undo.
          undo.set(null);
          return { confirmed: ok };
        });
      }
      case 'delete_pending_sms': {
        return safe(async () => {
          await sms.deletePending(args.id);
          undo.set({
            label: 'Undo: restore SMS to pending',
            run: async () => { await sms.restorePending(args.id); },
          });
          return { deleted: true };
        });
      }
      case 'restore_deleted_sms': {
        return safe(async () => {
          await sms.restorePending(args.id);
          undo.set({
            label: 'Undo: move SMS back to Deleted',
            run: async () => { await sms.deletePending(args.id); },
          });
          return { restored: true };
        });
      }

      // -------- Bulk / approval-required --------
      case 'scan_sms': {
        return safe(async () => {
          if (!sms.supported) throw new Error('SMS scanning is only available in the Android app.');
          const res = await sms.scanInbox({ fullRescan: !!args.fullRescan });
          undo.set(null);
          const newPending = sms.pending.filter((p) => p.status === 'pending').slice(0, 20).map(slimPending);
          return { ...res, newPendingPreview: newPending };
        });
      }
      case 'confirm_pending_sms_bulk': {
        return safe(async () => {
          const n = await sms.confirmMany(args.ids || []);
          undo.set(null);
          return { confirmed: n };
        });
      }
      case 'delete_pending_sms_bulk': {
        return safe(async () => {
          const ids: string[] = args.ids || [];
          await sms.deleteMany(ids);
          undo.set({
            label: `Undo: restore ${ids.length} SMS`,
            run: async () => { for (const id of ids) await sms.restorePending(id); },
          });
          return { deleted: ids.length };
        });
      }
      case 'purge_deleted_sms_all': {
        return safe(async () => {
          await sms.emptyTrash();
          undo.set(null);
          return { purged: true, reversible: false };
        });
      }
      case 'reapply_identifiers': {
        return safe(async () => {
          const res = await sms.reapplyIdentifiers();
          undo.set(null);
          return res;
        });
      }

      default:
        return { ok: false, error: `Unknown tool: ${name}` };
    }
  }, [
    transactions, categories, tags, accounts, sms, expense,
    addTransaction, deleteTransaction, addCategory, addTag, addAccount, deleteAccount, undo,
  ]);

  // Small snapshot the model always gets so it can resolve names → ids without extra tool calls
  const summaryContext = useMemo(() => {
    return [
      `Accounts (${accounts.length}): ${accounts.map((a) => `${a.name} [${a.id}]`).join(', ') || 'none'}`,
      `Categories (${categories.length}): ${categories.slice(0, 40).map((c) => `${c.combined} [${c.id}]`).join('; ')}`,
      `Tags (${tags.length}): ${tags.slice(0, 30).map((t) => `${t.name} [${t.id}]`).join(', ') || 'none'}`,
      `SMS identifiers: ${sms.identifiers.length} configured across ${new Set(sms.identifiers.map((i) => i.accountId)).size} account(s)`,
      `Pending SMS: ${sms.pending.filter((p) => p.status === 'pending').length}; Deleted SMS: ${sms.pending.filter((p) => p.status === 'deleted').length}`,
      `SMS scanning supported on this device: ${sms.supported ? 'yes' : 'no (web/PWA)'}`,
    ].join('\n');
  }, [accounts, categories, tags, sms.identifiers, sms.pending, sms.supported]);

  return { execute, summaryContext, undo };
}