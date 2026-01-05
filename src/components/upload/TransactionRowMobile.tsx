import { memo, useState, useCallback } from 'react';
import { format, parseISO } from 'date-fns';
import { Check, X, AlertTriangle, Pencil } from 'lucide-react';
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

interface TransactionRowMobileProps {
  transaction: ParsedTransaction;
  isSelected: boolean;
  categories: Category[];
  accounts: Account[];
  tags: Tag[];
  onToggleSelect: (id: string) => void;
  onUpdate: (id: string, updates: Partial<ParsedTransaction>) => void;
}

export const TransactionRowMobile = memo(function TransactionRowMobile({
  transaction,
  isSelected,
  categories,
  accounts,
  tags,
  onToggleSelect,
  onUpdate,
}: TransactionRowMobileProps) {
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState('');

  const category = categories.find(c => c.id === transaction.suggestedCategoryId);
  const account = accounts.find(a => a.id === transaction.suggestedAccountId);
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
    <div
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
            onCheckedChange={() => onToggleSelect(transaction.id)}
          />
          {transaction.isDuplicate && (
            <AlertTriangle className="w-4 h-4 text-destructive" />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          {/* Description */}
          {isEditingDescription ? (
            <div className="flex items-center gap-1 mb-2">
              <Input
                value={editedDescription}
                onChange={e => setEditedDescription(e.target.value)}
                className="h-8 text-sm"
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
                className="h-8 w-8 flex-shrink-0"
                onClick={handleConfirmEdit}
              >
                <Check className="w-4 h-4 text-success" />
              </Button>
              <Button 
                size="icon" 
                variant="ghost" 
                className="h-8 w-8 flex-shrink-0"
                onClick={handleCancelEdit}
              >
                <X className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          ) : (
            <div 
              className="flex items-start gap-2 mb-1 cursor-pointer"
              onClick={handleStartEdit}
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
          onValueChange={handleCategoryChange}
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
          onValueChange={handleAccountChange}
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
        <Select onValueChange={handleAddTag}>
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
                onClick={() => handleRemoveTag(tag!.id)}
              >
                {tag!.name} ×
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});