import { memo, useState, useCallback } from 'react';
import { format, parseISO } from 'date-fns';
import { Check, X, AlertTriangle, Pencil, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { ParsedTransaction } from '@/types/expense';
import { Category, Tag, Account } from '@/hooks/useExpenseData';
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
import { TableCell, TableRow } from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface TransactionRowDesktopProps {
  transaction: ParsedTransaction;
  isSelected: boolean;
  categories: Category[];
  accounts: Account[];
  tags: Tag[];
  onToggleSelect: (id: string) => void;
  onUpdate: (id: string, updates: Partial<ParsedTransaction>) => void;
}

export const TransactionRowDesktop = memo(function TransactionRowDesktop({
  transaction,
  isSelected,
  categories,
  accounts,
  tags,
  onToggleSelect,
  onUpdate,
}: TransactionRowDesktopProps) {
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState('');

  const transactionTags = (transaction.suggestedTagIds || [])
    .map(id => tags.find(t => t.id === id))
    .filter(Boolean);

  const handleStartEdit = useCallback(() => {
    setIsEditingDescription(true);
    setEditedDescription(transaction.description);
  }, [transaction.description]);

  const handleConfirmEdit = useCallback(() => {
    onUpdate(transaction.id, { description: editedDescription });
    setIsEditingDescription(false);
  }, [transaction.id, editedDescription, onUpdate]);

  const handleCancelEdit = useCallback(() => {
    setIsEditingDescription(false);
  }, []);

  const handleCategoryChange = useCallback((value: string) => {
    onUpdate(transaction.id, { suggestedCategoryId: value });
  }, [transaction.id, onUpdate]);

  const handleAccountChange = useCallback((value: string) => {
    onUpdate(transaction.id, { suggestedAccountId: value });
  }, [transaction.id, onUpdate]);

  const handleAddTag = useCallback((tagId: string) => {
    const currentTags = transaction.suggestedTagIds || [];
    if (!currentTags.includes(tagId)) {
      onUpdate(transaction.id, { suggestedTagIds: [...currentTags, tagId] });
    }
  }, [transaction.id, transaction.suggestedTagIds, onUpdate]);

  const handleRemoveTag = useCallback((tagId: string) => {
    onUpdate(transaction.id, {
      suggestedTagIds: (transaction.suggestedTagIds || []).filter(id => id !== tagId),
    });
  }, [transaction.id, transaction.suggestedTagIds, onUpdate]);

  return (
    <TooltipProvider>
      <TableRow
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
              onCheckedChange={() => onToggleSelect(transaction.id)}
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
              {isEditingDescription ? (
                <div className="flex items-center gap-1">
                  <Input
                    value={editedDescription}
                    onChange={e => setEditedDescription(e.target.value)}
                    className="h-7 text-sm"
                    autoFocus
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        handleConfirmEdit();
                      }
                      if (e.key === 'Escape') {
                        handleCancelEdit();
                      }
                    }}
                  />
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-7 w-7 flex-shrink-0"
                    onClick={handleConfirmEdit}
                  >
                    <Check className="w-3 h-3 text-success" />
                  </Button>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-7 w-7 flex-shrink-0"
                    onClick={handleCancelEdit}
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
                    onClick={handleStartEdit}
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
            onValueChange={handleCategoryChange}
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
            onValueChange={handleAccountChange}
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
          <Select onValueChange={handleAddTag}>
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
                  onClick={() => handleRemoveTag(tag!.id)}
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
      </TableRow>
    </TooltipProvider>
  );
});