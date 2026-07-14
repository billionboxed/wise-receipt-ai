import { useMemo, useRef, useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { motion, useMotionValue, useTransform, animate, PanInfo } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import { MessageSquare, Check, Trash2, AlertTriangle, Loader2, RotateCcw, Edit2, Info, ChevronDown, ChevronRight, Undo2 } from 'lucide-react';
import { useExpense } from '@/context/ExpenseContext';
import { useCurrency } from '@/context/CurrencyContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useSmsImport, type PendingSms } from '@/hooks/useSmsImport';
import { toast } from '@/hooks/use-toast';
import { SmsPendingDialog } from '@/components/sms/SmsPendingDialog';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

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

interface SwipeRowProps {
  row: PendingSms;
  isDup: boolean;
  dupOf?: { description: string; date: string } | null;
  selected: boolean;
  onToggleSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  categoryLabel: string;
  accountLabel: string;
  amountLabel: string;
}

function SwipeRow({ row, isDup, dupOf, selected, onToggleSelect, onEdit, onDelete, categoryLabel, accountLabel, amountLabel }: SwipeRowProps) {
  const x = useMotionValue(0);
  const deleteOpacity = useTransform(x, [0, 8, 80], [0, 0.25, 1]);
  const editOpacity = useTransform(x, [-80, -8, 0], [1, 0.25, 0]);
  const isDragging = useRef(false);

  const handleDragStart = () => { isDragging.current = true; };
  const handleDragEnd = (_: any, info: PanInfo) => {
    isDragging.current = false;
    const threshold = 60;
    if (info.offset.x < -threshold) onEdit();
    else if (info.offset.x > threshold) onDelete();
    animate(x, 0);
  };

  return (
    <div className="relative overflow-hidden rounded-xl">
      <motion.div style={{ opacity: deleteOpacity }} className="absolute left-0 top-0 bottom-0 flex items-center z-0 pointer-events-none">
        <div className="h-full px-6 bg-destructive text-destructive-foreground flex items-center justify-center">
          <Trash2 className="w-5 h-5" />
        </div>
      </motion.div>
      <motion.div style={{ opacity: editOpacity }} className="absolute right-0 top-0 bottom-0 flex items-center z-0 pointer-events-none">
        <div className="h-full px-6 bg-primary text-primary-foreground flex items-center justify-center">
          <Edit2 className="w-5 h-5" />
        </div>
      </motion.div>

      <motion.div
        style={{ x }}
        drag="x"
        dragConstraints={{ left: -80, right: 80 }}
        dragElastic={0.2}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          'p-3 rounded-xl border bg-background flex items-start gap-3 relative z-10 cursor-grab active:cursor-grabbing',
          isDup ? 'border-amber-500/40 bg-amber-500/5' : 'border-border'
        )}
      >
        <Checkbox checked={selected} onCheckedChange={onToggleSelect} className="mt-1" onClick={e => e.stopPropagation()} />
        <div className="flex-1 min-w-0" onClick={() => { if (!isDragging.current) onEdit(); }}>
          <div className="flex items-center justify-between gap-2">
            <p className="font-medium truncate">{row.suggestedDescription || 'SMS Transaction'}</p>
            <span className="font-semibold whitespace-nowrap">{amountLabel}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {format(parseISO(row.parsedDate), 'dd MMM yyyy')}
            {row.smsSender && <> • {row.smsSender}</>}
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
            {isDup && dupOf && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="border-amber-500/60 text-amber-600 dark:text-amber-400 gap-1">
                    <AlertTriangle className="w-3 h-3" /> Possible duplicate
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  Same date and amount as "{dupOf.description}" on {format(parseISO(dupOf.date), 'dd MMM yyyy')}.
                </TooltipContent>
              </Tooltip>
            )}
            <Badge variant="secondary" className="text-xs">{categoryLabel}</Badge>
            <Badge variant="outline" className="text-xs">{accountLabel}</Badge>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 italic">Tap to edit · Swipe ← edit · Swipe → delete</p>
        </div>
      </motion.div>
    </div>
  );
}

export default function SmsReview() {
  const { transactions, categories, accounts } = useExpense();
  const { formatAmount } = useCurrency();
  const {
    pending, busy, supported, prefs, identifiers,
    scanInbox, confirmPending, confirmMany,
    deletePending, deleteMany, updatePending,
    restorePending, purgePending, emptyTrash,
  } = useSmsImport();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editRow, setEditRow] = useState<PendingSms | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showTrash, setShowTrash] = useState(false);

  const activeRows = useMemo(() => pending.filter(p => p.status === 'pending'), [pending]);
  const trash = useMemo(() => pending.filter(p => p.status === 'deleted'), [pending]);

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
    const { added, removed, autoAssigned } = await scanInbox({ fullRescan: true });
    const parts: string[] = [];
    if (added) parts.push(`${added} added`);
    if (removed) parts.push(`${removed} cleaned`);
    if (autoAssigned) parts.push(`${autoAssigned} account-assigned`);
    toast({
      title: parts.length ? 'Scan complete' : 'No new SMS',
      description: parts.length
        ? parts.join(' · ')
        : 'Every bank SMS in your inbox has already been handled.',
    });
  };

  const getCat = (id: string | null) => categories.find(c => c.id === id);
  const getAcc = (id: string | null) => accounts.find(a => a.id === id);

  const renderRow = (entry: { row: PendingSms; dup?: any }) => {
    const t = entry.row;
    return (
      <SwipeRow
        key={t.id}
        row={t}
        isDup={!!entry.dup}
        dupOf={entry.dup ? { description: entry.dup.description, date: entry.dup.date } : null}
        selected={selected.has(t.id)}
        onToggleSelect={() => toggle(t.id)}
        onEdit={() => { setEditRow(t); setDialogOpen(true); }}
        onDelete={async () => {
          await deletePending(t.id);
          toast({ title: 'Moved to Deleted SMS', description: 'Restore from Settings → SMS Auto-Import.' });
        }}
        categoryLabel={getCat(t.suggestedCategoryId)?.combined ?? 'Uncategorized'}
        accountLabel={getAcc(t.suggestedAccountId)?.name ?? 'No account'}
        amountLabel={formatAmount(t.parsedAmount)}
      />
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
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={busy} onClick={onScan}>
                {busy ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <RotateCcw className="w-4 h-4 mr-1" />}
                Scan
              </Button>
            </div>
          )}
        </div>

        {supported && prefs.enabled && activeRows.length > 0 && identifiers.length === 0 && (
          <div className="p-3 rounded-lg border border-primary/30 bg-primary/5 text-xs flex items-start gap-2">
            <Info className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-foreground">No account identifiers configured</p>
              <p className="text-muted-foreground mt-0.5">
                Add identifiers (card last-4, account number, etc.) so only SMS for accounts you track land here.{' '}
                <Link to="/settings/sms" className="text-primary underline underline-offset-2">Open SMS settings</Link>
              </p>
            </div>
          </div>
        )}

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

        <SmsPendingDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          row={editRow}
          onConfirm={async (id, overrides) => {
            const ok = await confirmPending(id, overrides as any);
            if (ok) toast({ title: 'Added to transactions' });
            setSelected(prev => { const n = new Set(prev); n.delete(id); return n; });
          }}
          onDelete={async (id) => {
            await deletePending(id);
            toast({ title: 'Moved to Deleted SMS', description: 'Restore from Settings → SMS Auto-Import.' });
          }}
        />

        <section className="rounded-xl glass-card border border-white/5">
          <button
            type="button"
            onClick={() => setShowTrash(v => !v)}
            className="w-full flex items-center justify-between gap-2 p-3 text-left"
          >
            <span className="flex items-center gap-2 text-sm font-medium">
              {showTrash ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              Deleted <span className="text-muted-foreground">({trash.length})</span>
            </span>
            {showTrash && trash.length > 0 && (
              <span
                role="button"
                onClick={(e) => { e.stopPropagation(); emptyTrash(); }}
                className="text-xs text-destructive inline-flex items-center gap-1 hover:underline"
              >
                <Trash2 className="w-3.5 h-3.5" /> Empty
              </span>
            )}
          </button>
          {showTrash && (
            <div className="px-3 pb-3">
              {trash.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nothing deleted yet.</p>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {trash.map(t => (
                    <div key={t.id} className="p-2 rounded-lg border border-border bg-background flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium truncate">{t.suggestedDescription || 'SMS Transaction'}</p>
                          <span className="text-sm font-semibold whitespace-nowrap">{formatAmount(t.parsedAmount)}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {format(parseISO(t.parsedDate), 'dd MMM yyyy')}
                          {t.smsSender && <> • {t.smsSender}</>}
                        </p>
                      </div>
                      <Button size="icon" variant="ghost" className="h-7 w-7" title="Restore" onClick={() => restorePending(t.id)}>
                        <Undo2 className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" title="Delete permanently" onClick={() => purgePending(t.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
}