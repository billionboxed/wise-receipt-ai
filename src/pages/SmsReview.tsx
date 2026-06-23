import { useMemo, useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { motion } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import { MessageSquare, Check, Trash2, AlertTriangle, Loader2, RotateCcw } from 'lucide-react';
import { useExpense } from '@/context/ExpenseContext';
import { useCurrency } from '@/context/CurrencyContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useSmsImport, type PendingSms } from '@/hooks/useSmsImport';
import { toast } from '@/hooks/use-toast';

/**
 * Duplicate rule (mirrors statement-import):
 *  - same calendar date (YYYY-MM-DD)
 *  - same integer amount (decimals ignored)
 *  Account is intentionally not compared.
 */
function findDuplicate(row: PendingSms, transactions: { id: string; date: string; amount: number; description: string }[]) {
  const want = Math.floor(row.parsedAmount);
  return transactions.find(t =>
    t.date.slice(0, 10) === row.parsedDate && Math.floor(t.amount) === want
  );
}

export default function SmsReview() {
  const { transactions, categories, accounts } = useExpense();
  const { formatAmount } = useCurrency();
  const {
    pending, busy, supported, prefs,
    scanInbox, confirmPending, confirmMany,
    deletePending, deleteMany, updatePending,
  } = useSmsImport();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const activeRows = useMemo(() => pending.filter(p => p.status === 'pending'), [pending]);

  // Re-check every time pending or transactions change — picks up manual entries instantly.
  const annotated = useMemo(() => {
    return activeRows.map(r => ({ row: r, dup: findDuplicate(r, transactions) }));
  }, [activeRows, transactions]);

  const dupRows = annotated.filter(a => a.dup);
  const freshRows = annotated.filter(a => !a.dup);

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const onConfirmOne = async (id: string) => {
    const ok = await confirmPending(id);
    if (ok) toast({ title: 'Added to transactions' });
    setSelected(prev => { const n = new Set(prev); n.delete(id); return n; });
  };

  const onConfirmSelected = async () => {
    const ids = Array.from(selected);
    const n = await confirmMany(ids);
    toast({ title: `Added ${n} transaction${n === 1 ? '' : 's'}` });
    setSelected(new Set());
  };

  const onDeleteSelected = async () => {
    const ids = Array.from(selected);
    await deleteMany(ids);
    toast({ title: `Moved ${ids.length} to Deleted SMS`, description: 'Restore from Settings → SMS Auto-Import.' });
    setSelected(new Set());
  };

  const bulkCategory = async (categoryId: string) => {
    for (const id of selected) await updatePending(id, { suggestedCategoryId: categoryId });
    toast({ title: 'Categories updated' });
  };

  const bulkAccount = async (accountId: string) => {
    for (const id of selected) await updatePending(id, { suggestedAccountId: accountId });
    toast({ title: 'Accounts updated' });
  };

  const onScan = async () => {
    const n = await scanInbox(Date.now() - 30 * 24 * 60 * 60 * 1000);
    toast({
      title: n > 0 ? `Found ${n} new SMS` : 'No new SMS',
      description: n > 0 ? 'Review and confirm to add to transactions.' : 'Nothing new from your bank SMS.',
    });
  };

  const getCat = (id: string | null) => categories.find(c => c.id === id);
  const getAcc = (id: string | null) => accounts.find(a => a.id === id);

  const renderRow = (entry: { row: PendingSms; dup?: any }) => {
    const t = entry.row;
    const isDup = !!entry.dup;
    return (
      <motion.div
        key={t.id}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className={`p-3 rounded-xl border bg-background flex items-start gap-3 ${
          isDup ? 'border-amber-500/40 bg-amber-500/5' : 'border-border'
        }`}
      >
        <Checkbox checked={selected.has(t.id)} onCheckedChange={() => toggle(t.id)} className="mt-1" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="font-medium truncate">{t.suggestedDescription || 'SMS Transaction'}</p>
            <span className="font-semibold whitespace-nowrap">{formatAmount(t.parsedAmount)}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {format(parseISO(t.parsedDate), 'dd MMM yyyy')}
            {t.smsSender && <> • {t.smsSender}</>}
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
            {isDup && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="border-amber-500/60 text-amber-600 dark:text-amber-400 gap-1">
                    <AlertTriangle className="w-3 h-3" /> Possible duplicate
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  Same date and amount as "{entry.dup.description}" on {format(parseISO(entry.dup.date), 'dd MMM yyyy')}.
                </TooltipContent>
              </Tooltip>
            )}
            <Badge variant="secondary" className="text-xs">{getCat(t.suggestedCategoryId)?.combined ?? 'Uncategorized'}</Badge>
            <Badge variant="outline" className="text-xs">{getAcc(t.suggestedAccountId)?.name ?? 'No account'}</Badge>
          </div>
          {t.smsRaw && (
            <details className="mt-2 text-xs">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Original SMS</summary>
              <p className="mt-1 p-2 rounded bg-muted/50 whitespace-pre-wrap break-words">{t.smsRaw}</p>
            </details>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <Button size="sm" className="h-8" onClick={() => onConfirmOne(t.id)}>
            <Check className="w-4 h-4 mr-1" /> Confirm
          </Button>
          <Button size="sm" variant="ghost" className="h-8 text-muted-foreground hover:text-destructive" onClick={() => deletePending(t.id)}>
            <Trash2 className="w-4 h-4 mr-1" /> Delete
          </Button>
        </div>
      </motion.div>
    );
  };

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold flex items-center gap-2">
              <MessageSquare className="w-7 h-7 text-primary" />
              SMS Inbox
            </h1>
            <p className="text-muted-foreground mt-1">
              Review SMS-parsed expenses before they join your transactions.
            </p>
          </div>
          {supported && prefs.enabled && (
            <Button variant="outline" size="sm" onClick={onScan} disabled={busy}>
              {busy ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <RotateCcw className="w-4 h-4 mr-1" />}
              Scan now
            </Button>
          )}
        </div>

        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span><b className="text-foreground">{freshRows.length}</b> new</span>
          <span>·</span>
          <span><b className="text-amber-600 dark:text-amber-400">{dupRows.length}</b> possible duplicate{dupRows.length === 1 ? '' : 's'}</span>
        </div>

        {selected.size > 0 && (
          <div className="p-3 rounded-xl glass-card border border-primary/30 flex flex-wrap items-center gap-2 sticky top-2 z-10">
            <span className="text-sm font-medium">{selected.size} selected</span>
            <Select onValueChange={bulkCategory}>
              <SelectTrigger className="h-8 w-40 text-xs"><SelectValue placeholder="Change category" /></SelectTrigger>
              <SelectContent>
                {categories.map(c => <SelectItem key={c.id} value={c.id} className="text-xs">{c.combined}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select onValueChange={bulkAccount}>
              <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="Change account" /></SelectTrigger>
              <SelectContent>
                {accounts.map(a => <SelectItem key={a.id} value={a.id} className="text-xs">{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={onConfirmSelected}><Check className="w-4 h-4 mr-1" />Confirm</Button>
            <Button size="sm" variant="destructive" onClick={onDeleteSelected}><Trash2 className="w-4 h-4 mr-1" />Delete</Button>
          </div>
        )}

        {activeRows.length === 0 ? (
          <div className="p-8 rounded-xl glass-card border border-white/5 text-center text-muted-foreground">
            Nothing waiting. New bank SMS land here for you to confirm before they hit Transactions.
          </div>
        ) : (
          <div className="space-y-4">
            {dupRows.length > 0 && (
              <section className="space-y-2">
                <h2 className="text-sm font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" /> Possible duplicates
                </h2>
                <p className="text-xs text-muted-foreground">
                  An existing transaction has the same date and amount. Confirm only if it's a separate spend.
                </p>
                {dupRows.map(renderRow)}
              </section>
            )}
            {freshRows.length > 0 && (
              <section className="space-y-2">
                <h2 className="text-sm font-semibold">New from SMS</h2>
                {freshRows.map(renderRow)}
              </section>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}