import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { useExpense } from '@/context/ExpenseContext';
import { Transaction } from '@/types/expense';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { X, AlertTriangle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export interface PrefillData {
  date: string;
  description: string;
  amount: number;
  type: 'debit' | 'credit';
  categoryId?: string | null;
}

interface TransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction?: Transaction | null;
  mode: 'add' | 'edit';
  prefillData?: PrefillData | null;
}

export function TransactionDialog({
  open,
  onOpenChange,
  transaction,
  mode,
  prefillData,
}: TransactionDialogProps) {
  const { categories, accounts, tags, transactions, addTransaction, updateTransaction } = useExpense();

  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    description: '',
    amount: '',
    type: 'debit' as 'debit' | 'credit',
    categoryId: '',
    accountId: '',
    tagIds: [] as string[],
  });

  useEffect(() => {
    if (transaction && mode === 'edit') {
      setFormData({
        date: transaction.date,
        description: transaction.description,
        amount: transaction.amount.toString(),
        type: transaction.type,
        categoryId: transaction.categoryId,
        accountId: transaction.accountId,
        tagIds: transaction.tagIds,
      });
    } else if (prefillData && mode === 'add') {
      // Prefill from AI chat
      setFormData({
        date: prefillData.date,
        description: prefillData.description,
        amount: prefillData.amount.toString(),
        type: prefillData.type,
        categoryId: prefillData.categoryId || categories[0]?.id || '',
        accountId: accounts[0]?.id || '',
        tagIds: [],
      });
    } else {
      setFormData({
        date: format(new Date(), 'yyyy-MM-dd'),
        description: '',
        amount: '',
        type: 'debit',
        categoryId: categories[0]?.id || '',
        accountId: accounts[0]?.id || '',
        tagIds: [],
      });
    }
  }, [transaction, mode, open, categories, accounts, prefillData]);

  // Check for duplicate transactions
  const duplicateTransaction = useMemo(() => {
    if (mode !== 'add' || !open) return null;
    if (!formData.date || !formData.amount) return null;
    
    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) return null;
    
    const found = transactions.find(t => 
      t.date === formData.date && 
      Math.abs(t.amount - amount) < 0.01 && 
      t.type === formData.type
    );
    
    return found;
  }, [mode, open, formData.date, formData.amount, formData.type, transactions]);

  const handleSubmit = () => {
    if (!formData.description || !formData.amount || !formData.categoryId || !formData.accountId) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid amount.',
        variant: 'destructive',
      });
      return;
    }

    if (mode === 'add') {
      const newTransaction: Transaction = {
        id: `t_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        date: formData.date,
        description: formData.description,
        amount,
        type: formData.type,
        categoryId: formData.categoryId,
        accountId: formData.accountId,
        tagIds: formData.tagIds,
        status: 'confirmed',
      };
      addTransaction(newTransaction);
      toast({
        title: 'Transaction Added',
        description: 'Your transaction has been added successfully.',
      });
    } else if (transaction) {
      updateTransaction(transaction.id, {
        date: formData.date,
        description: formData.description,
        amount,
        type: formData.type,
        categoryId: formData.categoryId,
        accountId: formData.accountId,
        tagIds: formData.tagIds,
      });
      toast({
        title: 'Transaction Updated',
        description: 'Your transaction has been updated successfully.',
      });
    }

    onOpenChange(false);
  };

  const toggleTag = (tagId: string) => {
    setFormData(prev => ({
      ...prev,
      tagIds: prev.tagIds.includes(tagId)
        ? prev.tagIds.filter(id => id !== tagId)
        : [...prev.tagIds, tagId],
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-card border-border/50">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-foreground">
            {mode === 'add' ? 'Add Transaction' : 'Edit Transaction'}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-5 py-4">
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={e => setFormData(prev => ({ ...prev, date: e.target.value }))}
              className="bg-background/50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Enter transaction description"
              className="bg-background/50"
            />
          </div>

          {duplicateTransaction && (
            <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Possible duplicate: A {formData.type === 'debit' ? 'expense' : 'income'} of ₹{parseFloat(formData.amount).toLocaleString('en-IN')} on {formData.date} already exists.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="amount">Amount (₹)</Label>
            <Input
              id="amount"
              type="number"
              value={formData.amount}
              onChange={e => setFormData(prev => ({ ...prev, amount: e.target.value }))}
              placeholder="0.00"
              className="bg-background/50"
            />
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Select
              value={formData.categoryId}
              onValueChange={value => setFormData(prev => ({ ...prev, categoryId: value }))}
            >
              <SelectTrigger className="bg-background/50">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.combined}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Account</Label>
            <Select
              value={formData.accountId}
              onValueChange={value => setFormData(prev => ({ ...prev, accountId: value }))}
            >
              <SelectTrigger className="bg-background/50">
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map(acc => (
                  <SelectItem key={acc.id} value={acc.id}>
                    {acc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-2 p-3 rounded-lg bg-background/50 border border-border/50 min-h-[48px]">
              {tags.map(tag => {
                const isSelected = formData.tagIds.includes(tag.id);
                return (
                  <Badge
                    key={tag.id}
                    variant="secondary"
                    className="cursor-pointer transition-all hover:scale-105"
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
                    {isSelected && (
                      <X className="w-3 h-3 ml-1" />
                    )}
                  </Badge>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} className="bg-gradient-to-r from-primary to-accent hover:opacity-90">
            {mode === 'add' ? 'Add Transaction' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
