import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import {
  Check,
  X,
  ChevronDown,
  Sparkles,
  CheckSquare,
  Square,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  Pencil,
} from 'lucide-react';
import { useExpense } from '@/context/ExpenseContext';
import { ParsedTransaction } from '@/types/expense';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
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
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from '@/hooks/use-toast';

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
    new Set(transactions.filter(t => t.selected).map(t => t.id))
  );
  const [editingDescriptionId, setEditingDescriptionId] = useState<string | null>(null);
  const [editedDescription, setEditedDescription] = useState('');

  const selectedCount = selectedIds.size;
  const allSelected = selectedCount === transactions.length && transactions.length > 0;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(transactions.map(t => t.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const handleConfirmSelected = () => {
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
  };

  const handleSkipSelected = () => {
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
  };

  const handleBulkCategoryChange = (categoryId: string) => {
    selectedIds.forEach(id => {
      onUpdate(id, { suggestedCategoryId: categoryId });
    });
    toast({
      title: 'Categories updated',
      description: `Updated category for ${selectedIds.size} transactions.`,
    });
  };

  const handleBulkAccountChange = (accountId: string) => {
    selectedIds.forEach(id => {
      onUpdate(id, { suggestedAccountId: accountId });
    });
    toast({
      title: 'Accounts updated',
      description: `Updated account for ${selectedIds.size} transactions.`,
    });
  };

  const handleBulkTagAdd = (tagId: string) => {
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
  };

  if (transactions.length === 0) {
    return null;
  }

  const renderMobileCard = (transaction: ParsedTransaction, index: number) => {
    const isSelected = selectedIds.has(transaction.id);
    const category = categories.find(c => c.id === transaction.suggestedCategoryId);
    const account = accounts.find(a => a.id === transaction.suggestedAccountId);
    const transactionTags = (transaction.suggestedTagIds || [])
      .map(id => tags.find(t => t.id === id))
      .filter(Boolean);

    return (
      <motion.div
        key={transaction.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.02 }}
        className={cn(
          'p-3 rounded-lg border transition-colors',
          transaction.isDuplicate && 'border-l-2 border-l-destructive bg-destructive/5',
          isSelected ? 'bg-primary/5 border-primary/30' : 'bg-card border-border'
        )}
      >
        {/* Header Row: Checkbox, Description, Amount */}
        <div className="flex items-start gap-3">
          <div className="flex items-center gap-2 pt-0.5">
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => toggleSelect(transaction.id)}
            />
            {transaction.isDuplicate && (
              <AlertTriangle className="w-4 h-4 text-destructive" />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            {/* Description */}
            {editingDescriptionId === transaction.id ? (
              <div className="flex items-center gap-1 mb-2">
                <Input
                  value={editedDescription}
                  onChange={e => setEditedDescription(e.target.value)}
                  className="h-8 text-sm"
                  autoFocus
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      onUpdate(transaction.id, { description: editedDescription });
                      setEditingDescriptionId(null);
                    }
                    if (e.key === 'Escape') {
                      setEditingDescriptionId(null);
                    }
                  }}
                />
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="h-8 w-8 flex-shrink-0"
                  onClick={() => {
                    onUpdate(transaction.id, { description: editedDescription });
                    setEditingDescriptionId(null);
                  }}
                >
                  <Check className="w-4 h-4 text-success" />
                </Button>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="h-8 w-8 flex-shrink-0"
                  onClick={() => setEditingDescriptionId(null)}
                >
                  <X className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            ) : (
              <div 
                className="flex items-start gap-2 mb-1 cursor-pointer"
                onClick={() => {
                  setEditingDescriptionId(transaction.id);
                  setEditedDescription(transaction.description);
                }}
              >
                <span className="font-medium text-sm line-clamp-2 flex-1">
                  {transaction.description}
                </span>
                <Pencil className="w-3 h-3 text-muted-foreground flex-shrink-0 mt-1" />
              </div>
            )}
            
            {transaction.isDuplicate && (
              <span className="text-xs text-destructive block mb-1">Duplicate detected</span>
            )}
            
            {/* Date */}
            <span className="text-xs text-muted-foreground">
              {transaction.date ? format(parseISO(transaction.date), 'dd MMM yyyy') : '-'}
            </span>
          </div>
          
          {/* Amount */}
          <div className={cn(
            'text-right font-semibold text-sm flex-shrink-0',
            transaction.type === 'credit' ? 'text-success' : 'text-foreground'
          )}>
            {transaction.type === 'credit' ? '+' : '-'}₹{transaction.amount.toLocaleString('en-IN')}
          </div>
        </div>
        
        {/* Selects Row */}
        <div className="grid grid-cols-2 gap-2 mt-3">
          <Select
            value={transaction.suggestedCategoryId || ''}
            onValueChange={value => onUpdate(transaction.id, { suggestedCategoryId: value })}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {categories.map(cat => (
                <SelectItem key={cat.id} value={cat.id} className="text-xs">
                  {cat.combined}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select
            value={transaction.suggestedAccountId || ''}
            onValueChange={value => onUpdate(transaction.id, { suggestedAccountId: value })}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Account" />
            </SelectTrigger>
            <SelectContent>
              {accounts.map(acc => (
                <SelectItem key={acc.id} value={acc.id} className="text-xs">
                  {acc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Tags Row */}
        <div className="mt-2">
          <Select
            onValueChange={value => {
              const currentTags = transaction.suggestedTagIds || [];
              if (!currentTags.includes(value)) {
                onUpdate(transaction.id, { suggestedTagIds: [...currentTags, value] });
              }
            }}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder={transactionTags.length > 0 ? `${transactionTags.length} tag(s)` : 'Add tag'} />
            </SelectTrigger>
            <SelectContent>
              {tags.map(tag => (
                <SelectItem key={tag.id} value={tag.id} className="text-xs">
                  {tag.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {transactionTags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {transactionTags.map(tag => (
                <Badge
                  key={tag!.id}
                  variant="secondary"
                  className="text-xs py-0 cursor-pointer hover:opacity-70"
                  style={{ backgroundColor: `${tag!.color}20`, color: tag!.color }}
                  onClick={() => {
                    onUpdate(transaction.id, {
                      suggestedTagIds: (transaction.suggestedTagIds || []).filter(id => id !== tag!.id),
                    });
                  }}
                >
                  {tag!.name} ×
                </Badge>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    );
  };

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
          {transactions.some(t => t.isDuplicate) && (
            <Badge variant="destructive" className="gap-1 text-xs">
              <AlertTriangle className="w-3 h-3" />
              {transactions.filter(t => t.isDuplicate).length} duplicate(s)
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
        {transactions.map((transaction, index) => renderMobileCard(transaction, index))}
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
              {transactions.map((transaction, index) => {
                const isSelected = selectedIds.has(transaction.id);
                const category = categories.find(
                  c => c.id === transaction.suggestedCategoryId
                );
                const account = accounts.find(
                  a => a.id === transaction.suggestedAccountId
                );
                const transactionTags = (transaction.suggestedTagIds || [])
                  .map(id => tags.find(t => t.id === id))
                  .filter(Boolean);

                return (
                  <TooltipProvider key={transaction.id}>
                    <motion.tr
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.02 }}
                      className={cn(
                        'group transition-colors',
                        transaction.isDuplicate && 'bg-destructive/5 border-l-2 border-l-destructive',
                        isSelected ? 'bg-primary/5' : 'hover:bg-muted/50'
                      )}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelect(transaction.id)}
                          />
                          {transaction.isDuplicate && (
                            <Tooltip>
                              <TooltipTrigger>
                                <AlertTriangle className="w-4 h-4 text-destructive" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Potential duplicate: Same date and amount found in existing transactions</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-muted-foreground">
                        {transaction.date ? format(parseISO(transaction.date), 'dd MMM') : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                              transaction.type === 'credit'
                                ? 'bg-success/10 text-success'
                                : 'bg-destructive/10 text-destructive'
                            )}
                          >
                            {transaction.type === 'credit' ? (
                              <ArrowDownRight className="w-4 h-4" />
                            ) : (
                              <ArrowUpRight className="w-4 h-4" />
                            )}
                          </div>
                          <div className="flex flex-col flex-1 min-w-0">
                            {editingDescriptionId === transaction.id ? (
                              <div className="flex items-center gap-1">
                                <Input
                                  value={editedDescription}
                                  onChange={e => setEditedDescription(e.target.value)}
                                  className="h-7 text-sm"
                                  autoFocus
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                      onUpdate(transaction.id, { description: editedDescription });
                                      setEditingDescriptionId(null);
                                    }
                                    if (e.key === 'Escape') {
                                      setEditingDescriptionId(null);
                                    }
                                  }}
                                />
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="h-7 w-7 flex-shrink-0"
                                  onClick={() => {
                                    onUpdate(transaction.id, { description: editedDescription });
                                    setEditingDescriptionId(null);
                                  }}
                                >
                                  <Check className="w-3 h-3 text-success" />
                                </Button>
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="h-7 w-7 flex-shrink-0"
                                  onClick={() => setEditingDescriptionId(null)}
                                >
                                  <X className="w-3 h-3 text-destructive" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 group/desc">
                                <span className="font-medium line-clamp-2 text-sm">
                                  {transaction.description}
                                </span>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-6 w-6 flex-shrink-0 opacity-0 group-hover/desc:opacity-100 transition-opacity"
                                  onClick={() => {
                                    setEditingDescriptionId(transaction.id);
                                    setEditedDescription(transaction.description);
                                  }}
                                >
                                  <Pencil className="w-3 h-3" />
                                </Button>
                              </div>
                            )}
                            {transaction.isDuplicate && (
                              <span className="text-xs text-destructive">Duplicate detected</span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                    <TableCell>
                      <Select
                        value={transaction.suggestedCategoryId || ''}
                        onValueChange={value =>
                          onUpdate(transaction.id, { suggestedCategoryId: value })
                        }
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {categories.map(cat => (
                            <SelectItem key={cat.id} value={cat.id} className="text-xs">
                              {cat.combined}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={transaction.suggestedAccountId || ''}
                        onValueChange={value =>
                          onUpdate(transaction.id, { suggestedAccountId: value })
                        }
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Select account" />
                        </SelectTrigger>
                        <SelectContent>
                          {accounts.map(acc => (
                            <SelectItem key={acc.id} value={acc.id} className="text-xs">
                              {acc.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        onValueChange={value => {
                          const currentTags = transaction.suggestedTagIds || [];
                          if (!currentTags.includes(value)) {
                            onUpdate(transaction.id, {
                              suggestedTagIds: [...currentTags, value],
                            });
                          }
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue
                            placeholder={
                              transactionTags.length > 0
                                ? `${transactionTags.length} tag(s)`
                                : 'Add tag'
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {tags.map(tag => (
                            <SelectItem key={tag.id} value={tag.id} className="text-xs">
                              {tag.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {transactionTags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {transactionTags.map(tag => (
                            <Badge
                              key={tag!.id}
                              variant="secondary"
                              className="text-xs py-0 cursor-pointer hover:opacity-70"
                              style={{
                                backgroundColor: `${tag!.color}20`,
                                color: tag!.color,
                              }}
                              onClick={() => {
                                onUpdate(transaction.id, {
                                  suggestedTagIds: (transaction.suggestedTagIds || []).filter(
                                    id => id !== tag!.id
                                  ),
                                });
                              }}
                            >
                              {tag!.name} ×
                            </Badge>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={cn(
                          'font-semibold',
                          transaction.type === 'credit'
                            ? 'text-success'
                            : 'text-foreground'
                        )}
                      >
                        {transaction.type === 'credit' ? '+' : '-'}₹
                        {transaction.amount.toLocaleString('en-IN')}
                      </span>
                    </TableCell>
                    </motion.tr>
                  </TooltipProvider>
                );
              })}
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
            ₹
            {transactions
              .filter(t => selectedIds.has(t.id))
              .reduce((sum, t) => sum + (t.type === 'debit' ? t.amount : -t.amount), 0)
              .toLocaleString('en-IN')}
          </span>{' '}
          expense from selected
        </div>
      </div>
    </motion.div>
  );
}
