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

interface TransactionListProps {
  onEditTransaction?: (transaction: Transaction) => void;
}

interface SwipeableTransactionCardProps {
  transaction: Transaction;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
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
  category,
  account,
  transactionTags,
  formatAmount,
}: SwipeableTransactionCardProps) {
  const x = useMotionValue(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = -60;
    if (info.offset.x < threshold) {
      // Directly open edit dialog on swipe
      onEdit();
    }
    animate(x, 0);
  };

  return (
    <div className="relative overflow-hidden rounded-2xl" ref={containerRef}>
      {/* Background action buttons */}
      <div className="absolute right-0 top-0 bottom-0 flex items-center">
        <button
          onClick={onEdit}
          className="h-full px-4 bg-primary text-primary-foreground flex items-center justify-center"
        >
          <Edit2 className="w-5 h-5" />
        </button>
        <button
          onClick={onDelete}
          className="h-full px-4 bg-destructive text-destructive-foreground flex items-center justify-center"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      {/* Swipeable card */}
      <motion.div
        style={{ x }}
        drag="x"
        dragConstraints={{ left: -80, right: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: index * 0.02 }}
        className="glass-card p-4 space-y-3 relative bg-card cursor-grab active:cursor-grabbing"
      >
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
        
        <div className="grid grid-cols-3 gap-2 md:flex md:flex-wrap md:gap-3">
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
        </div>
      </div>

      {/* Mobile Card View with Swipe */}
      <div className="md:hidden space-y-3">
        <p className="text-xs text-muted-foreground text-center">Swipe left to edit</p>
        {filteredTransactions.map((transaction, index) => {
          const category = getCategoryById(transaction.categoryId);
          const account = getAccountById(transaction.accountId);
          const transactionTags = transaction.tagIds
            .map(id => getTagById(id))
            .filter((tag): tag is { id: string; name: string; color: string } => tag !== undefined);

          return (
            <SwipeableTransactionCard
              key={transaction.id}
              transaction={transaction}
              index={index}
              onEdit={() => onEditTransaction?.(transaction)}
              onDelete={() => deleteTransaction(transaction.id)}
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
              <TableRow className="hover:bg-transparent border-white/5">
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
                          onClick={() => deleteTransaction(transaction.id)}
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
