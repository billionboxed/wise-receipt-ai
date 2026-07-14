import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check, Trash2, AlertTriangle, X } from 'lucide-react';
import { useExpense } from '@/context/ExpenseContext';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { format, parseISO } from 'date-fns';
import type { PendingSms } from '@/hooks/useSmsImport';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: PendingSms | null;
  onConfirm: (id: string, overrides: { date: string; description: string; amount: number; type: 'debit' | 'credit'; categoryId: string | null; accountId: string | null; tagIds: string[]; }) => Promise<void> | void;
  onDelete: (id: string) => Promise<void> | void;
}

export function SmsPendingDialog({ open, onOpenChange, row, onConfirm, onDelete }: Props) {
  const { categories, accounts, tags, transactions } = useExpense();
  const sortedCategories = useMemo(() => [...categories].sort((a, b) => a.combined.localeCompare(b.combined)), [categories]);
  const sortedAccounts = useMemo(() => [...accounts].sort((a, b) => a.name.localeCompare(b.name)), [accounts]);

  const [form, setForm] = useState({
    date: '',
    description: '',
    amount: '',
    categoryId: '',
    accountId: '',
    tagIds: [] as string[],
  });

  useEffect(() => {
    if (!row) return;
    setForm({
      date: row.parsedDate,
      description: row.suggestedDescription ?? '',
      amount: String(row.parsedAmount),
      categoryId: row.suggestedCategoryId ?? '',
      accountId: row.suggestedAccountId ?? '',
      tagIds: [],
    });
  }, [row, open]);

  const dup = useMemo(() => {
    const amt = parseFloat(form.amount);
    if (!form.date || isNaN(amt)) return null;
    return transactions.find(t => t.date.slice(0, 10) === form.date && Math.floor(t.amount) === Math.floor(amt)) || null;
  }, [form.date, form.amount, transactions]);

  if (!row) return null;

  const handleConfirm = async () => {
    const amt = parseFloat(form.amount);
    if (!form.description || !amt || amt <= 0 || !form.accountId) return;
    await onConfirm(row.id, {
      date: form.date,
      description: form.description,
      amount: amt,
      type: 'debit',
      categoryId: form.categoryId || null,
      accountId: form.accountId || null,
      tagIds: form.tagIds,
    });
    onOpenChange(false);
  };

  const toggleTag = (id: string) => {
    setForm(f => ({
      ...f,
      tagIds: f.tagIds.includes(id) ? f.tagIds.filter(t => t !== id) : [...f.tagIds, id],
    }));
  };

  const handleDelete = async () => {
    await onDelete(row.id);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto bg-card border-border/50">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Review SMS Transaction</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {dup && (
            <Alert className="border-amber-500/50 bg-amber-500/10">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <AlertDescription className="text-xs">
                Possible duplicate of "{dup.description}" on {format(parseISO(dup.date), 'dd MMM yyyy')}. Confirm only if it's a separate spend.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label>Date</Label>
            <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="bg-background/50" />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="bg-background/50" />
          </div>

          <div className="space-y-2">
            <Label>Amount</Label>
            <Input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} className="bg-background/50" />
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={form.categoryId || 'none'} onValueChange={v => setForm(f => ({ ...f, categoryId: v === 'none' ? '' : v }))}>
              <SelectTrigger className="bg-background/50"><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent className="max-h-60">
                <SelectItem value="none"><span className="text-muted-foreground italic">Uncategorized</span></SelectItem>
                {sortedCategories.map(c => <SelectItem key={c.id} value={c.id}>{c.combined}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Account</Label>
            <Select value={form.accountId} onValueChange={v => setForm(f => ({ ...f, accountId: v }))}>
              <SelectTrigger className="bg-background/50"><SelectValue placeholder="Select account" /></SelectTrigger>
              <SelectContent>
                {sortedAccounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-2 p-3 rounded-lg bg-background/50 border border-border/50 min-h-[48px]">
              {tags.filter(t => !t.isArchived || form.tagIds.includes(t.id)).length === 0 && (
                <span className="text-xs text-muted-foreground">No tags yet.</span>
              )}
              {tags
                .filter(t => !t.isArchived || form.tagIds.includes(t.id))
                .map(tag => {
                  const isSelected = form.tagIds.includes(tag.id);
                  return (
                    <Badge
                      key={tag.id}
                      variant="secondary"
                      className={cn("cursor-pointer transition-all hover:scale-105", tag.isArchived && "opacity-60")}
                      style={{
                        backgroundColor: isSelected ? tag.color : 'transparent',
                        color: isSelected ? '#ffffff' : tag.color,
                        borderColor: tag.color,
                        borderWidth: '1px',
                        textShadow: isSelected ? '0 1px 2px rgba(0,0,0,0.3)' : 'none',
                      }}
                      onClick={() => toggleTag(tag.id)}
                    >
                      {tag.name}
                      {isSelected && <X className="w-3 h-3 ml-1" />}
                    </Badge>
                  );
                })}
            </div>
          </div>

          {row.smsRaw && (
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Original SMS</summary>
              <p className="mt-1 p-2 rounded bg-muted/50 whitespace-pre-wrap break-words">{row.smsRaw}</p>
            </details>
          )}
        </div>

        <DialogFooter className="flex-row justify-between sm:justify-between gap-2">
          <Button variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={handleDelete}>
            <Trash2 className="w-4 h-4 mr-1" /> Delete
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleConfirm} className="bg-gradient-to-r from-primary to-accent hover:opacity-90">
              <Check className="w-4 h-4 mr-1" /> Confirm
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}