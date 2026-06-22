import { useMemo, useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { motion } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import { MessageSquare, Check, Trash2, Edit2 } from 'lucide-react';
import { useExpense } from '@/context/ExpenseContext';
import { useCurrency } from '@/context/CurrencyContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TransactionDialog } from '@/components/transactions/TransactionDialog';
import type { Transaction } from '@/types/expense';
import { toast } from '@/hooks/use-toast';

export default function SmsReview() {
  const { transactions, updateTransaction, deleteTransaction, categories, accounts, tags } = useExpense();
  const { formatAmount } = useCurrency();
  const [showReviewed, setShowReviewed] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<Transaction | null>(null);

  const rows = useMemo(() => {
    return transactions
      .filter(t => t.source === 'sms')
      .filter(t => showReviewed ? true : t.smsReviewed === false)
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [transactions, showReviewed]);

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const markReviewed = async () => {
    for (const id of selected) await updateTransaction(id, { smsReviewed: true });
    toast({ title: 'Marked reviewed', description: `${selected.size} transaction(s) confirmed.` });
    setSelected(new Set());
  };

  const bulkCategory = async (categoryId: string) => {
    for (const id of selected) await updateTransaction(id, { categoryId });
    toast({ title: 'Categories updated' });
    setSelected(new Set());
  };

  const bulkAccount = async (accountId: string) => {
    for (const id of selected) await updateTransaction(id, { accountId });
    toast({ title: 'Accounts updated' });
    setSelected(new Set());
  };

  const removeAll = async () => {
    for (const id of selected) await deleteTransaction(id);
    toast({ title: `${selected.size} deleted` });
    setSelected(new Set());
  };

  const getCat = (id: string | null) => categories.find(c => c.id === id);
  const getAcc = (id: string | null) => accounts.find(a => a.id === id);

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold flex items-center gap-2">
              <MessageSquare className="w-7 h-7 text-primary" />
              SMS Inbox
            </h1>
            <p className="text-muted-foreground mt-1">Review transactions auto-imported from SMS</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowReviewed(s => !s)}>
            {showReviewed ? 'Hide reviewed' : 'Show reviewed'}
          </Button>
        </div>

        {selected.size > 0 && (
          <div className="p-3 rounded-xl glass-card border border-primary/30 flex flex-wrap items-center gap-2">
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
            <Button size="sm" onClick={markReviewed}><Check className="w-4 h-4 mr-1" />Mark reviewed</Button>
            <Button size="sm" variant="destructive" onClick={removeAll}><Trash2 className="w-4 h-4 mr-1" />Delete</Button>
          </div>
        )}

        {rows.length === 0 ? (
          <div className="p-8 rounded-xl glass-card border border-white/5 text-center text-muted-foreground">
            No SMS transactions {showReviewed ? '' : 'to review'}. Imports show up here automatically.
          </div>
        ) : (
          <div className="space-y-2">
            {rows.map((t, i) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.02, 0.3) }}
                className="p-3 rounded-xl border border-border bg-background flex items-start gap-3"
              >
                <Checkbox checked={selected.has(t.id)} onCheckedChange={() => toggle(t.id)} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <p className="font-medium truncate">{t.description}</p>
                      {!t.smsReviewed && <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />}
                    </div>
                    <span className={`font-semibold whitespace-nowrap ${t.type === 'credit' ? 'text-success' : 'text-foreground'}`}>
                      {t.type === 'credit' ? '+' : ''}{formatAmount(t.amount)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {format(parseISO(t.date), 'dd MMM yyyy')}
                    {t.smsSender && <> • from {t.smsSender}</>}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2 text-xs text-muted-foreground">
                    <Badge variant="secondary" className="text-xs">{getCat(t.categoryId)?.combined ?? 'Uncategorized'}</Badge>
                    <Badge variant="outline" className="text-xs">{getAcc(t.accountId)?.name ?? 'No account'}</Badge>
                  </div>
                  {t.smsRaw && (
                    <details className="mt-2 text-xs">
                      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Original SMS</summary>
                      <p className="mt-1 p-2 rounded bg-muted/50 whitespace-pre-wrap break-words">{t.smsRaw}</p>
                    </details>
                  )}
                </div>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditing(t)}>
                  <Edit2 className="w-4 h-4" />
                </Button>
              </motion.div>
            ))}
          </div>
        )}

        <TransactionDialog
          open={!!editing}
          onOpenChange={(o) => !o && setEditing(null)}
          transaction={editing}
          mode="edit"
        />
      </div>
    </Layout>
  );
}