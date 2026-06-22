import { useMemo, useState, useRef } from 'react';
import { motion, useMotionValue, useTransform, animate, PanInfo } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import {
  ArrowUpRight,
  ArrowDownRight,
  Search,
  Edit2,
  Trash2,
  Copy,
  FolderTree,
  Wallet,
  Tag,
  RefreshCcw,
  ArrowUp,
  ArrowDown,
  ChevronsUpDown,
  MessageSquare,
  FileText,
  Pencil,
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
  onCopyTransaction?: (transaction: Transaction) => void;
  initialCategoryFilter?: string;
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
  isRecurring: boolean;
  source?: 'manual' | 'upload' | 'sms' | 'recurring';
  unreviewedSms?: boolean;
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
  isRecurring,
  source,
  unreviewedSms,
}: SwipeableTransactionCardProps) {
  const x = useMotionValue(0);
  const deleteOpacity = useTransform(x, [0, 8, 80], [0, 0.25, 1]);
  const editOpacity = useTransform(x, [-80, -8, 0], [1, 0.25, 0]);
  const containerRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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
              <div className="flex items-center gap-1.5">
                <p className="font-medium text-foreground truncate">
                  {transaction.description}
                </p>
                {isRecurring && (
                  <span className="flex-shrink-0" title="Recurring expense">
                    <RefreshCcw className="w-3 h-3 text-primary" />
                  </span>
                )}
                {source === 'sms' && (
                  <span className="flex-shrink-0 flex items-center gap-1" title={unreviewedSms ? 'From SMS — needs review' : 'From SMS'}>
                    <MessageSquare className="w-3 h-3 text-muted-foreground" />
                    {unreviewedSms && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                  </span>
                )}
                {source === 'upload' && (
                  <span className="flex-shrink-0" title="From statement upload">
                    <FileText className="w-3 h-3 text-muted-foreground" />
                  </span>
                )}
              </div>
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
            {category ? (
              <span className="truncate max-w-[120px]">{category.combined}</span>
            ) : (
              <span className="truncate max-w-[120px] text-warning/70 italic">Uncategorized</span>
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

export function TransactionList({ onEditTransaction, onCopyTransaction, initialCategoryFilter = 'all' }: TransactionListProps) {
  const {
    transactions,
    categories,
    accounts,
    tags,
    getCategoryById,
    getAccountById,
    getTagById,
    deleteTransaction,
    addTransaction,
    updateTransaction,
  } = useExpense();
  const { formatAmount } = useCurrency();

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>(initialCategoryFilter);
  const [accountFilter, setAccountFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [sortColumn, setSortColumn] = useState<'date' | 'created_at' | 'description' | 'category' | 'account' | 'amount'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleSort = (column: typeof sortColumn) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection((column === 'date' || column === 'created_at') ? 'desc' : 'asc');
    }
  };

  const SortIcon = ({ column }: { column: typeof sortColumn }) => {
    if (sortColumn !== column) {
      return <ChevronsUpDown className="w-4 h-4 ml-1 opacity-50" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="w-4 h-4 ml-1" /> 
      : <ArrowDown className="w-4 h-4 ml-1" />;
  };

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

  const handleDeleteWithUndo = (transaction: Transaction) => {
    deleteTransaction(transaction.id);
    
    toast({
      title: 'Transaction Deleted',
      description: 'The transaction has been removed.',
      action: (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            // Re-add the transaction (without id so a new one is generated)
            const { id, ...transactionData } = transaction;
            addTransaction(transactionData as Omit<Transaction, 'id'>);
            toast({
              title: 'Transaction Restored',
              description: 'The transaction has been restored.',
            });
          }}
        >
          Undo
        </Button>
      ),
    });
  };

  const handleBulkDelete = async () => {
    // Store transactions for potential undo
    const deletedTransactions = [...selectedIds].map(id => 
      transactions.find(t => t.id === id)
    ).filter(Boolean) as Transaction[];

    for (const id of selectedIds) {
      await deleteTransaction(id);
    }
    setSelectedIds(new Set());
    setShowDeleteDialog(false);

    toast({
      title: `${deletedTransactions.length} Transaction${deletedTransactions.length > 1 ? 's' : ''} Deleted`,
      description: 'The transactions have been removed.',
      action: (
        <Button
          variant="outline"
          size="sm"
          onClick={async () => {
            for (const t of deletedTransactions) {
              const { id, ...transactionData } = t;
              await addTransaction(transactionData as Omit<Transaction, 'id'>);
            }
            toast({
              title: 'Transactions Restored',
              description: `${deletedTransactions.length} transaction${deletedTransactions.length > 1 ? 's have' : ' has'} been restored.`,
            });
          }}
        >
          Undo
        </Button>
      ),
    });
  };

  const handleCopySelected = () => {
    if (selectedIds.size !== 1) return;
    const transactionId = [...selectedIds][0];
    const transaction = transactions.find(t => t.id === transactionId);
    if (transaction && onCopyTransaction) {
      onCopyTransaction(transaction);
      setSelectedIds(new Set());
    }
  };

  const handleBulkCategoryChange = async (categoryId: string) => {
    for (const id of selectedIds) {
      await updateTransaction(id, { categoryId });
    }
    toast({
      title: 'Categories Updated',
      description: `Updated category for ${selectedIds.size} transaction${selectedIds.size > 1 ? 's' : ''}.`,
    });
    setSelectedIds(new Set());
  };

  const handleBulkAccountChange = async (accountId: string) => {
    for (const id of selectedIds) {
      await updateTransaction(id, { accountId });
    }
    toast({
      title: 'Accounts Updated',
      description: `Updated account for ${selectedIds.size} transaction${selectedIds.size > 1 ? 's' : ''}.`,
    });
    setSelectedIds(new Set());
  };

  const handleBulkTagAdd = async (tagId: string) => {
    for (const id of selectedIds) {
      const transaction = transactions.find(t => t.id === id);
      if (transaction) {
        const currentTags = transaction.tagIds || [];
        if (!currentTags.includes(tagId)) {
          await updateTransaction(id, { tagIds: [...currentTags, tagId] });
        }
      }
    }
    toast({
      title: 'Tags Updated',
      description: `Added tag to ${selectedIds.size} transaction${selectedIds.size > 1 ? 's' : ''}.`,
    });
    setSelectedIds(new Set());
  };

  // Sort categories and accounts alphabetically for dropdowns
  const sortedCategories = useMemo(() => 
    [...categories].sort((a, b) => a.combined.localeCompare(b.combined)),
    [categories]
  );

  const sortedAccounts = useMemo(() => 
    [...accounts].sort((a, b) => a.name.localeCompare(b.name)),
    [accounts]
  );

  const activeTags = useMemo(() => 
    tags.filter(t => !t.isArchived).sort((a, b) => a.name.localeCompare(b.name)),
    [tags]
  );

  const filteredTransactions = useMemo(() => {
    const filtered = transactions
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
      })
      .filter(t => {
        if (tagFilter !== 'all') {
          return t.tagIds.includes(tagFilter);
        }
        return true;
      })
      .filter(t => {
        if (sourceFilter === 'all') return true;
        if (sourceFilter === 'recurring') return !!t.recurringExpenseId;
        return (t.source || 'manual') === sourceFilter;
      });

    // Apply sorting
    return [...filtered].sort((a, b) => {
      let comparison = 0;
      
      switch (sortColumn) {
        case 'date':
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case 'created_at':
          const createdA = a.created_at ? new Date(a.created_at).getTime() : new Date(a.date).getTime();
          const createdB = b.created_at ? new Date(b.created_at).getTime() : new Date(b.date).getTime();
          comparison = createdA - createdB;
          break;
        case 'description':
          comparison = a.description.localeCompare(b.description);
          break;
        case 'category':
          const catA = getCategoryById(a.categoryId)?.combined || '';
          const catB = getCategoryById(b.categoryId)?.combined || '';
          comparison = catA.localeCompare(catB);
          break;
        case 'account':
          const accA = getAccountById(a.accountId)?.name || '';
          const accB = getAccountById(b.accountId)?.name || '';
          comparison = accA.localeCompare(accB);
          break;
        case 'amount':
          comparison = a.amount - b.amount;
          break;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [transactions, searchQuery, categoryFilter, accountFilter, typeFilter, tagFilter, sourceFilter, getCategoryById, getAccountById, sortColumn, sortDirection]);

  const mainCategories = useMemo(() => {
    const unique = new Set(categories.map(c => c.main));
    return Array.from(unique);
  }, [categories]);

  // Calculate filtered totals
  const filteredTotals = useMemo(() => {
    const expenses = filteredTransactions
      .filter(t => t.type === 'debit')
      .reduce((sum, t) => sum + t.amount, 0);
    const income = filteredTransactions
      .filter(t => t.type === 'credit')
      .reduce((sum, t) => sum + t.amount, 0);
    return { expenses, income, net: income - expenses };
  }, [filteredTransactions]);

  const hasActiveFilters = searchQuery || categoryFilter !== 'all' || accountFilter !== 'all' || typeFilter !== 'all' || tagFilter !== 'all' || sourceFilter !== 'all';

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
        
        {/* Filter row - wrapping grid */}
        <div className="grid grid-cols-2 gap-2 md:flex md:flex-wrap md:gap-3">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full md:w-40 text-xs md:text-sm">
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
            <SelectTrigger className="w-full md:w-40 text-xs md:text-sm">
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
            <SelectTrigger className="w-full md:w-32 text-xs md:text-sm">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="debit">Expense</SelectItem>
              <SelectItem value="credit">Income</SelectItem>
            </SelectContent>
          </Select>

          <Select value={tagFilter} onValueChange={setTagFilter}>
            <SelectTrigger className="w-full md:w-40 text-xs md:text-sm">
              <SelectValue placeholder="Tag" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tags</SelectItem>
              {tags.map(tag => (
                <SelectItem key={tag.id} value={tag.id}>
                  <span className="flex items-center gap-2">
                    <span 
                      className="w-2 h-2 rounded-full" 
                      style={{ backgroundColor: tag.color }} 
                    />
                    {tag.name}
                    {tag.isArchived && <span className="text-muted-foreground text-xs">(archived)</span>}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-full md:w-36 text-xs md:text-sm">
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              <SelectItem value="manual">Manual</SelectItem>
              <SelectItem value="upload">Upload</SelectItem>
              <SelectItem value="sms">SMS</SelectItem>
              <SelectItem value="recurring">Recurring</SelectItem>
            </SelectContent>
          </Select>

          {/* Sort dropdown for mobile */}
          <Select 
            value={`${sortColumn}-${sortDirection}`} 
            onValueChange={(value) => {
              const [col, dir] = value.split('-') as [typeof sortColumn, 'asc' | 'desc'];
              setSortColumn(col);
              setSortDirection(dir);
            }}
          >
            <SelectTrigger className="w-full md:w-44 text-xs md:text-sm">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date-desc">Date (Newest first)</SelectItem>
              <SelectItem value="date-asc">Date (Oldest first)</SelectItem>
              <SelectItem value="created_at-desc">Recently Added</SelectItem>
              <SelectItem value="created_at-asc">Oldest Added</SelectItem>
              <SelectItem value="amount-desc">Amount (High to Low)</SelectItem>
              <SelectItem value="amount-asc">Amount (Low to High)</SelectItem>
              <SelectItem value="description-asc">Description (A-Z)</SelectItem>
              <SelectItem value="description-desc">Description (Z-A)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Filtered totals summary */}
        {hasActiveFilters && filteredTransactions.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 px-3 py-2 rounded-lg bg-muted/50 text-sm">
            <span className="text-muted-foreground">
              {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''}:
            </span>
            {(typeFilter === 'all' || typeFilter === 'debit') && filteredTotals.expenses > 0 && (
              <span className="text-destructive font-medium">
                Expenses: {formatAmount(filteredTotals.expenses)}
              </span>
            )}
            {(typeFilter === 'all' || typeFilter === 'credit') && filteredTotals.income > 0 && (
              <span className="text-success font-medium">
                Income: {formatAmount(filteredTotals.income)}
              </span>
            )}
            {typeFilter === 'all' && filteredTotals.expenses > 0 && filteredTotals.income > 0 && (
              <span className={cn("font-medium", filteredTotals.net >= 0 ? "text-success" : "text-destructive")}>
                Net: {filteredTotals.net >= 0 ? '+' : ''}{formatAmount(Math.abs(filteredTotals.net))}
              </span>
            )}
          </div>
        )}

        {/* Action buttons - separate row on mobile when visible */}
        {selectedIds.size > 0 && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <span>{selectedIds.size} selected</span>
            </div>
            
            {/* Bulk edit dropdowns */}
            <div className="grid grid-cols-2 gap-2 md:flex md:flex-wrap md:gap-3">
              {/* Category dropdown */}
              <Select onValueChange={handleBulkCategoryChange}>
                <SelectTrigger className="w-full md:w-44 text-xs md:text-sm">
                  <FolderTree className="w-4 h-4 mr-2 shrink-0" />
                  <span className="truncate">Set Category</span>
                </SelectTrigger>
                <SelectContent>
                  {sortedCategories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.combined}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Account dropdown */}
              <Select onValueChange={handleBulkAccountChange}>
                <SelectTrigger className="w-full md:w-40 text-xs md:text-sm">
                  <Wallet className="w-4 h-4 mr-2 shrink-0" />
                  <span className="truncate">Set Account</span>
                </SelectTrigger>
                <SelectContent>
                  {sortedAccounts.map(acc => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Tag dropdown */}
              <Select onValueChange={handleBulkTagAdd}>
                <SelectTrigger className="w-full md:w-36 text-xs md:text-sm">
                  <Tag className="w-4 h-4 mr-2 shrink-0" />
                  <span className="truncate">Add Tag</span>
                </SelectTrigger>
                <SelectContent>
                  {activeTags.map(tag => (
                    <SelectItem key={tag.id} value={tag.id}>
                      <span className="flex items-center gap-2">
                        <span 
                          className="w-2 h-2 rounded-full" 
                          style={{ backgroundColor: tag.color }} 
                        />
                        {tag.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 w-full md:w-auto">
              {selectedIds.size === 1 && onCopyTransaction && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopySelected}
                  className="flex-1 md:flex-none"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
                </Button>
              )}
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
                className="flex-1 md:flex-none"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete {selectedIds.size}
              </Button>
            </div>
          </div>
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
              onDelete={() => handleDeleteWithUndo(transaction)}
              
              onToggleSelect={() => toggleSelect(transaction.id)}
              isSelected={isSelected}
              isSelectionMode={selectedIds.size > 0}
              category={category}
              account={account}
              transactionTags={transactionTags}
              formatAmount={formatAmount}
              isRecurring={!!transaction.recurringExpenseId}
              source={transaction.source}
              unreviewedSms={transaction.source === 'sms' && transaction.smsReviewed === false}
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
                <TableHead 
                  className="w-24 cursor-pointer hover:text-foreground transition-colors select-none"
                  onClick={() => handleSort('date')}
                >
                  <span className="flex items-center">
                    Date
                    <SortIcon column="date" />
                  </span>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:text-foreground transition-colors select-none"
                  onClick={() => handleSort('description')}
                >
                  <span className="flex items-center">
                    Description
                    <SortIcon column="description" />
                  </span>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:text-foreground transition-colors select-none"
                  onClick={() => handleSort('category')}
                >
                  <span className="flex items-center">
                    Category
                    <SortIcon column="category" />
                  </span>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:text-foreground transition-colors select-none"
                  onClick={() => handleSort('account')}
                >
                  <span className="flex items-center">
                    Account
                    <SortIcon column="account" />
                  </span>
                </TableHead>
                <TableHead>Tags</TableHead>
                <TableHead 
                  className="text-right cursor-pointer hover:text-foreground transition-colors select-none"
                  onClick={() => handleSort('amount')}
                >
                  <span className="flex items-center justify-end">
                    Amount
                    <SortIcon column="amount" />
                  </span>
                </TableHead>
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
                        {transaction.recurringExpenseId && (
                          <span className="flex-shrink-0" title="Recurring expense">
                            <RefreshCcw className="w-3.5 h-3.5 text-primary" />
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {category ? (
                        <span className="text-sm text-muted-foreground">
                          {category.combined}
                        </span>
                      ) : (
                        <span className="text-sm text-warning/70 italic">
                          Uncategorized
                        </span>
                      )}
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
                          onClick={() => handleDeleteWithUndo(transaction)}
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
