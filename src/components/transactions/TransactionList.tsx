import { useMemo, useState, useRef } from 'react';
import { motion, useMotionValue, useTransform, animate, PanInfo } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import {
  ArrowUpRight,
  ArrowDownRight,
  Search,
  Edit2,
  Trash2,
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useExpense } from '@/context/ExpenseContext';
import { useCurrency } from '@/context/CurrencyContext';
import { Transaction } from '@/types/expense';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { toast } from '@/hooks/use-toast';

interface TransactionListProps {
  onEditTransaction?: (transaction: Transaction) => void;
}

interface SwipeableTransactionCardProps {
  transaction: Transaction;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
  onToggleSelect: () => void;
  isSelected: boolean;
  isSelectionMode: boolean;
  category?: { combined: string } | null;
  account?: { name: string } | null;
  transactionTags: Array<{ id: string; name: string; color: string }>;
  formatAmount: (amount: number) => string;
}

function SwipeableTransactionCard({
  transaction,
  index,
  onEdit,
  onDelete,
  onToggleSelect,
  isSelected,
  isSelectionMode,
  category,
  account,
  transactionTags,
  formatAmount,
}: SwipeableTransactionCardProps) {
  const x = useMotionValue(0);
  const deleteOpacity = useTransform(x, [0, 8, 80], [0, 0.25, 1]);
  const editOpacity = useTransform(x, [-80, -8, 0], [1, 0.25, 0]);
  const containerRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const isDragging = useRef(false);

  const handleDragStart = () => {
    isDragging.current = true;
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    isDragging.current = false;
    const threshold = 60;
    if (info.offset.x < -threshold) {
      onEdit();
    } else if (info.offset.x > threshold) {
      onDelete();
    }
    animate(x, 0);
  };

  const handleTouchStart = () => {
    // If already in selection mode, don't need long press
    if (isSelectionMode) return;
    
    longPressTimer.current = setTimeout(() => {
      if (!isDragging.current) {
        onToggleSelect();
        // Haptic feedback if available
        if (navigator.vibrate) {
          navigator.vibrate(50);
        }
      }
    }, 500);
  };

  const handleTap = () => {
    // In selection mode, tap to toggle selection
    if (isSelectionMode && !isDragging.current) {
      onToggleSelect();
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl" ref={containerRef}>
      {/* Left side - Delete (revealed on swipe right) */}
      {!isSelectionMode && (
        <motion.div
          style={{ opacity: deleteOpacity }}
          className="absolute left-0 top-0 bottom-0 flex items-center z-0 pointer-events-none"
        >
          <div className="h-full px-6 bg-destructive text-destructive-foreground flex items-center justify-center">
            <Trash2 className="w-5 h-5" />
          </div>
        </motion.div>
      )}

      {/* Right side - Edit (revealed on swipe left) */}
      {!isSelectionMode && (
        <motion.div
          style={{ opacity: editOpacity }}
          className="absolute right-0 top-0 bottom-0 flex items-center z-0 pointer-events-none"
        >
          <div className="h-full px-6 bg-primary text-primary-foreground flex items-center justify-center">
            <Edit2 className="w-5 h-5" />
          </div>
        </motion.div>
      )}

      {/* Swipeable card */}
      <motion.div
        style={{ x }}
        drag={isSelectionMode ? false : "x"}
        dragConstraints={{ left: -80, right: 80 }}
        dragElastic={0.2}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onClick={handleTap}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: index * 0.02 }}
        className={cn(
          "p-4 space-y-3 relative z-10 transition-colors rounded-2xl border border-border",
          "bg-background",
          isSelectionMode ? "cursor-pointer" : "cursor-grab active:cursor-grabbing",
          isSelected && "bg-muted ring-2 ring-primary"
        )}
      >
        {/* Selected checkmark indicator */}
        {isSelected && (
          <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}

        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div
              className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
                transaction.type === 'credit'
                  ? 'bg-success/10 text-success'
                  : 'bg-destructive/10 text-destructive'
              )}
            >
              {transaction.type === 'credit' ? (
                <ArrowDownRight className="w-5 h-5" />
              ) : (
                <ArrowUpRight className="w-5 h-5" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-foreground truncate">
                {transaction.description}
              </p>
              <p className="text-xs text-muted-foreground">
                {format(parseISO(transaction.date), 'dd MMM yyyy')}
              </p>
            </div>
          </div>
          <span
            className={cn(
              'font-semibold text-sm whitespace-nowrap',
              isSelected ? 'mr-8' : '',
              transaction.type === 'credit'
                ? 'text-success'
                : 'text-foreground'
            )}
          >
            {transaction.type === 'credit' ? '+' : ''}{formatAmount(transaction.amount)}
          </span>
        </div>
        
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/50">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground min-w-0 flex-1">
            {category && (
              <span className="truncate max-w-[120px]">{category.combined}</span>
            )}
            {account && (
              <>
                <span className="text-border">•</span>
                <span className="truncate max-w-[80px]">{account.name}</span>
              </>
            )}
          </div>
          {/* Hidden on mobile - use swipe instead */}
          <div className="hidden items-center gap-1 flex-shrink-0">
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={onEdit}
            >
              <Edit2 className="w-4 h-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {transactionTags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {transactionTags.map(tag => (
              <Badge
                key={tag.id}
                variant="secondary"
                className="text-xs"
                style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
              >
                {tag.name}
              </Badge>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}

export function TransactionList({ onEditTransaction }: TransactionListProps) {
  const {
    transactions,
    categories,
    accounts,
    tags,
    getCategoryById,
    getAccountById,
    getTagById,
    deleteTransaction,
  } = useExpense();
  const { formatAmount } = useCurrency();

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [accountFilter, setAccountFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredTransactions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredTransactions.map(t => t.id)));
    }
  };

  const handleBulkDelete = async () => {
    for (const id of selectedIds) {
      await deleteTransaction(id);
    }
    setSelectedIds(new Set());
    setShowDeleteDialog(false);
  };

  const filteredTransactions = useMemo(() => {
    return transactions
      .filter(t => t.status === 'confirmed')
      .filter(t => {
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          return t.description.toLowerCase().includes(query);
        }
        return true;
      })
      .filter(t => {
        if (categoryFilter !== 'all') {
          const category = getCategoryById(t.categoryId);
          return category?.main === categoryFilter;
        }
        return true;
      })
      .filter(t => {
        if (accountFilter !== 'all') {
          return t.accountId === accountFilter;
        }
        return true;
      })
      .filter(t => {
        if (typeFilter !== 'all') {
          return t.type === typeFilter;
        }
        return true;
      });
  }, [transactions, searchQuery, categoryFilter, accountFilter, typeFilter, getCategoryById]);

  const mainCategories = useMemo(() => {
    const unique = new Set(categories.map(c => c.main));
    return Array.from(unique);
  }, [categories]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4 md:space-y-6"
    >
      {/* Filters */}
      <div className="flex flex-col gap-3 md:gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search transactions..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        {/* Filter row - scrollable on mobile */}
        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
          <div className="flex items-center gap-2 md:gap-3 min-w-max md:min-w-0 md:flex-wrap">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-28 md:w-40 text-xs md:text-sm shrink-0">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {mainCategories.map(cat => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={accountFilter} onValueChange={setAccountFilter}>
              <SelectTrigger className="w-28 md:w-40 text-xs md:text-sm shrink-0">
                <SelectValue placeholder="Account" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Accounts</SelectItem>
                {accounts.map(acc => (
                  <SelectItem key={acc.id} value={acc.id}>
                    {acc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-24 md:w-32 text-xs md:text-sm shrink-0">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="debit">Expense</SelectItem>
                <SelectItem value="credit">Income</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Delete button - separate row on mobile when visible */}
        {selectedIds.size > 0 && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowDeleteDialog(true)}
            className="w-full md:w-auto md:self-end"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete {selectedIds.size} selected
          </Button>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} transaction{selectedIds.size > 1 ? 's' : ''}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The selected transactions will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Mobile Card View with Swipe */}
      <div className="md:hidden space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Long press to select • Swipe to edit/delete</p>
          {selectedIds.size > 0 && (
            <button
              onClick={toggleSelectAll}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                filteredTransactions.length > 0 && selectedIds.size === filteredTransactions.length
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {selectedIds.size === filteredTransactions.length && filteredTransactions.length > 0 
                ? "Deselect All" 
                : "Select All"}
            </button>
          )}
        </div>
        {filteredTransactions.map((transaction, index) => {
          const category = getCategoryById(transaction.categoryId);
          const account = getAccountById(transaction.accountId);
          const transactionTags = transaction.tagIds
            .map(id => getTagById(id))
            .filter((tag): tag is { id: string; name: string; color: string } => tag !== undefined);

          const isSelected = selectedIds.has(transaction.id);

          return (
            <SwipeableTransactionCard
              key={transaction.id}
              transaction={transaction}
              index={index}
              onEdit={() => onEditTransaction?.(transaction)}
              onDelete={() => {
                deleteTransaction(transaction.id);
                toast({
                  title: 'Transaction Deleted',
                  description: 'The transaction has been removed.',
                });
              }}
              
              onToggleSelect={() => toggleSelect(transaction.id)}
              isSelected={isSelected}
              isSelectionMode={selectedIds.size > 0}
              category={category}
              account={account}
              transactionTags={transactionTags}
              formatAmount={formatAmount}
            />
          );
        })}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-border">
                <TableHead className="w-12">
                  <Checkbox
                    checked={filteredTransactions.length > 0 && selectedIds.size === filteredTransactions.length}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead className="w-24">Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.map((transaction, index) => {
                const category = getCategoryById(transaction.categoryId);
                const account = getAccountById(transaction.accountId);
                const transactionTags = transaction.tagIds
                  .map(id => getTagById(id))
                  .filter(Boolean);

                  return (
                    <motion.tr
                      key={transaction.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.02 }}
                      className="group hover:bg-white/[0.02] border-white/5"
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(transaction.id)}
                          onCheckedChange={() => toggleSelect(transaction.id)}
                          aria-label={`Select ${transaction.description}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium text-muted-foreground">
                        {format(parseISO(transaction.date), 'dd MMM')}
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
                        <span className="font-medium line-clamp-1 text-foreground">
                          {transaction.description}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {category?.combined}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-foreground">{account?.name}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {transactionTags.map(tag => (
                          <Badge
                            key={tag!.id}
                            variant="secondary"
                            className="text-xs"
                            style={{ backgroundColor: `${tag!.color}20`, color: tag!.color }}
                          >
                            {tag!.name}
                          </Badge>
                        ))}
                      </div>
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
                        {transaction.type === 'credit' ? '+' : ''}{formatAmount(transaction.amount)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => onEditTransaction?.(transaction)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => {
                            deleteTransaction(transaction.id);
                            toast({
                              title: 'Transaction Deleted',
                              description: 'The transaction has been removed.',
                            });
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </motion.tr>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {filteredTransactions.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg font-medium">No transactions found</p>
          <p className="text-sm">Try adjusting your filters</p>
        </div>
      )}
    </motion.div>
  );
}
