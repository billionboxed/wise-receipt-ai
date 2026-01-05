import { useState, useMemo, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Check,
  X,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import { useExpense } from '@/context/ExpenseContext';
import { ParsedTransaction } from '@/types/expense';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { TransactionRowMobile } from './TransactionRowMobile';
import { TransactionRowDesktop } from './TransactionRowDesktop';

interface TransactionReviewProps {
  transactions: ParsedTransaction[];
  onUpdate: (id: string, updates: Partial<ParsedTransaction>) => void;
  onConfirm: (ids: string[]) => void;
  onSkip: (ids: string[]) => void;
  onClear: () => void;
}

export function TransactionReview({
  transactions,
  onUpdate,
  onConfirm,
  onSkip,
  onClear,
}: TransactionReviewProps) {
  const { categories, accounts, tags } = useExpense();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(transactions.filter(t => t.selected).map(t => t.id))
  );

  // Store refs for stable callback access
  const selectedIdsRef = useRef(selectedIds);
  selectedIdsRef.current = selectedIds;
  
  // Store onUpdate in ref to avoid triggering child re-renders
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;
  
  // Stable onUpdate wrapper
  const stableOnUpdate = useCallback((id: string, updates: Partial<ParsedTransaction>) => {
    onUpdateRef.current(id, updates);
  }, []);

  const selectedCount = selectedIds.size;
  const allSelected = selectedCount === transactions.length && transactions.length > 0;

  // Memoize arrays to prevent unnecessary re-renders of child components
  const stableCategories = useMemo(() => categories, [JSON.stringify(categories.map(c => c.id))]);
  const stableAccounts = useMemo(() => accounts, [JSON.stringify(accounts.map(a => a.id))]);
  const stableTags = useMemo(() => tags, [JSON.stringify(tags.map(t => t.id))]);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds(prev => {
      const currentAllSelected = prev.size === transactions.length && transactions.length > 0;
      if (currentAllSelected) {
        return new Set();
      } else {
        return new Set(transactions.map(t => t.id));
      }
    });
  }, [transactions]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const handleConfirmSelected = useCallback(() => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) {
      toast({
        title: 'No transactions selected',
        description: 'Please select at least one transaction to confirm.',
        variant: 'destructive',
      });
      return;
    }
    onConfirm(ids);
    toast({
      title: 'Transactions confirmed',
      description: `${ids.length} transactions have been added to your records.`,
    });
    setSelectedIds(new Set());
  }, [selectedIds, onConfirm]);

  const handleSkipSelected = useCallback(() => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) {
      toast({
        title: 'No transactions selected',
        description: 'Please select at least one transaction to skip.',
        variant: 'destructive',
      });
      return;
    }
    onSkip(ids);
    toast({
      title: 'Transactions skipped',
      description: `${ids.length} transactions have been skipped.`,
    });
    setSelectedIds(new Set());
  }, [selectedIds, onSkip]);

  const handleBulkCategoryChange = useCallback((categoryId: string) => {
    selectedIds.forEach(id => {
      onUpdate(id, { suggestedCategoryId: categoryId });
    });
    toast({
      title: 'Categories updated',
      description: `Updated category for ${selectedIds.size} transactions.`,
    });
  }, [selectedIds, onUpdate]);

  const handleBulkAccountChange = useCallback((accountId: string) => {
    selectedIds.forEach(id => {
      onUpdate(id, { suggestedAccountId: accountId });
    });
    toast({
      title: 'Accounts updated',
      description: `Updated account for ${selectedIds.size} transactions.`,
    });
  }, [selectedIds, onUpdate]);

  const handleBulkTagAdd = useCallback((tagId: string) => {
    selectedIds.forEach(id => {
      const transaction = transactions.find(t => t.id === id);
      if (transaction) {
        const currentTags = transaction.suggestedTagIds || [];
        if (!currentTags.includes(tagId)) {
          onUpdate(id, { suggestedTagIds: [...currentTags, tagId] });
        }
      }
    });
    toast({
      title: 'Tags added',
      description: `Added tag to ${selectedIds.size} transactions.`,
    });
  }, [selectedIds, transactions, onUpdate]);

  const selectedTotal = useMemo(() => {
    return transactions
      .filter(t => selectedIds.has(t.id))
      .reduce((sum, t) => sum + (t.type === 'debit' ? t.amount : -t.amount), 0);
  }, [transactions, selectedIds]);

  const duplicateCount = useMemo(() => {
    return transactions.filter(t => t.isDuplicate).length;
  }, [transactions]);

  if (transactions.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Header with Actions */}
      <div className="flex flex-col gap-3 p-3 md:p-4 bg-card rounded-xl border border-border shadow-sm">
        {/* Title and badges */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-sm md:text-base">Review Transactions</h3>
          </div>
          <Badge variant="secondary" className="text-xs">
            {transactions.length} found • {selectedCount} selected
          </Badge>
          {duplicateCount > 0 && (
            <Badge variant="destructive" className="gap-1 text-xs">
              <AlertTriangle className="w-3 h-3" />
              {duplicateCount} duplicate(s)
            </Badge>
          )}
        </div>

        {/* Select All on Mobile */}
        <div className="flex items-center gap-2 md:hidden">
          <Checkbox
            checked={allSelected}
            onCheckedChange={toggleSelectAll}
          />
          <span className="text-sm text-muted-foreground">Select all</span>
        </div>

        {/* Bulk Actions */}
        {selectedCount > 0 && (
          <div className="flex flex-wrap gap-2">
            <Select onValueChange={handleBulkCategoryChange}>
              <SelectTrigger className="w-full sm:w-36 h-8 text-xs">
                <SelectValue placeholder="Change category" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id} className="text-xs">
                    {cat.combined}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select onValueChange={handleBulkAccountChange}>
              <SelectTrigger className="w-full sm:w-32 h-8 text-xs">
                <SelectValue placeholder="Change account" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map(acc => (
                  <SelectItem key={acc.id} value={acc.id} className="text-xs">
                    {acc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select onValueChange={handleBulkTagAdd}>
              <SelectTrigger className="w-full sm:w-28 h-8 text-xs">
                <SelectValue placeholder="Add tag" />
              </SelectTrigger>
              <SelectContent>
                {tags.map(tag => (
                  <SelectItem key={tag.id} value={tag.id} className="text-xs">
                    {tag.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSkipSelected}
            disabled={selectedCount === 0}
            className="flex-1 sm:flex-none text-xs h-8"
          >
            <X className="w-4 h-4 mr-1" />
            Skip ({selectedCount})
          </Button>
          <Button
            size="sm"
            onClick={handleConfirmSelected}
            disabled={selectedCount === 0}
            className="flex-1 sm:flex-none bg-success hover:bg-success/90 text-success-foreground text-xs h-8"
          >
            <Check className="w-4 h-4 mr-1" />
            Confirm ({selectedCount})
          </Button>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-2">
        {transactions.map((transaction) => (
          <TransactionRowMobile
            key={transaction.id}
            transaction={transaction}
            isSelected={selectedIds.has(transaction.id)}
            categories={stableCategories}
            accounts={stableAccounts}
            tags={stableTags}
            onToggleSelect={toggleSelect}
            onUpdate={stableOnUpdate}
          />
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-12">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead className="w-24">Date</TableHead>
                <TableHead className="min-w-[200px]">Description</TableHead>
                <TableHead className="w-48">Category</TableHead>
                <TableHead className="w-40">Account</TableHead>
                <TableHead className="w-40">Tags</TableHead>
                <TableHead className="text-right w-32">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((transaction) => (
                <TransactionRowDesktop
                  key={transaction.id}
                  transaction={transaction}
                  isSelected={selectedIds.has(transaction.id)}
                  categories={stableCategories}
                  accounts={stableAccounts}
                  tags={stableTags}
                  onToggleSelect={toggleSelect}
                  onUpdate={stableOnUpdate}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <Button variant="outline" size="sm" onClick={onClear}>
          Clear All
        </Button>
        <div className="text-sm text-muted-foreground">
          Total:{' '}
          <span className="font-semibold text-foreground">
            ₹{selectedTotal.toLocaleString('en-IN')}
          </span>{' '}
          expense from selected
        </div>
      </div>
    </motion.div>
  );
}