import { useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { ArrowUpRight, ArrowDownRight, ExternalLink, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useExpense } from '@/context/ExpenseContext';
import { useCurrency } from '@/context/CurrencyContext';
import { useFilteredTransactions } from '@/hooks/useFilteredTransactions';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TransactionPreviewDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryFilter?: string;
  accountFilter?: string;
  title?: string;
}

export function TransactionPreviewDrawer({
  open,
  onOpenChange,
  categoryFilter,
  accountFilter,
  title,
}: TransactionPreviewDrawerProps) {
  const { getCategoryById, getAccountById, getTagById } = useExpense();
  const { formatAmount } = useCurrency();
  const { filteredTransactions } = useFilteredTransactions();

  const transactions = useMemo(() => {
    return filteredTransactions
      .filter(t => t.status === 'confirmed')
      .filter(t => {
        if (categoryFilter) {
          const category = getCategoryById(t.categoryId);
          return category?.main === categoryFilter;
        }
        if (accountFilter) {
          const account = getAccountById(t.accountId);
          return account?.name === accountFilter;
        }
        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 50); // Limit to 50 for performance
  }, [filteredTransactions, categoryFilter, accountFilter, getCategoryById, getAccountById]);

  const totals = useMemo(() => {
    const expenses = transactions.filter(t => t.type === 'debit').reduce((sum, t) => sum + t.amount, 0);
    const income = transactions.filter(t => t.type === 'credit').reduce((sum, t) => sum + t.amount, 0);
    return { expenses, income, count: transactions.length };
  }, [transactions]);

  const filterParam = categoryFilter 
    ? `category=${encodeURIComponent(categoryFilter)}` 
    : accountFilter 
    ? `account=${encodeURIComponent(accountFilter)}` 
    : '';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col">
        <SheetHeader className="p-4 sm:p-6 pb-0 flex-shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-lg sm:text-xl font-semibold truncate">
                {title || categoryFilter || accountFilter || 'Transactions'}
              </SheetTitle>
              <div className="flex flex-wrap items-center gap-2 mt-2 text-sm text-muted-foreground">
                <span>{totals.count} transaction{totals.count !== 1 ? 's' : ''}</span>
                {totals.expenses > 0 && (
                  <Badge variant="secondary" className="bg-destructive/10 text-destructive">
                    {formatAmount(totals.expenses)} spent
                  </Badge>
                )}
                {totals.income > 0 && (
                  <Badge variant="secondary" className="bg-success/10 text-success">
                    {formatAmount(totals.income)} earned
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 px-4 sm:px-6 py-4">
          <div className="space-y-2">
            {transactions.map((transaction) => {
              const category = getCategoryById(transaction.categoryId);
              const account = getAccountById(transaction.accountId);
              const transactionTags = transaction.tagIds
                .map(id => getTagById(id))
                .filter(Boolean);

              return (
                <div
                  key={transaction.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border hover:bg-muted transition-colors"
                >
                  <div
                    className={cn(
                      'w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0',
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
                  
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">
                      {transaction.description}
                    </p>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                      <span>{format(parseISO(transaction.date), 'dd MMM yyyy')}</span>
                      {!categoryFilter && category && (
                        <>
                          <span>•</span>
                          <span className="truncate">{category.main}</span>
                        </>
                      )}
                      {!accountFilter && account && (
                        <>
                          <span>•</span>
                          <span className="truncate">{account.name}</span>
                        </>
                      )}
                    </div>
                    {transactionTags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {transactionTags.slice(0, 3).map(tag => (
                          <Badge
                            key={tag!.id}
                            variant="secondary"
                            className="text-[10px] px-1.5 py-0"
                            style={{ backgroundColor: `${tag!.color}20`, color: tag!.color }}
                          >
                            {tag!.name}
                          </Badge>
                        ))}
                        {transactionTags.length > 3 && (
                          <span className="text-[10px] text-muted-foreground">
                            +{transactionTags.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="text-right flex-shrink-0">
                    <p
                      className={cn(
                        'text-sm font-semibold',
                        transaction.type === 'credit' ? 'text-success' : 'text-foreground'
                      )}
                    >
                      {transaction.type === 'credit' ? '+' : ''}{formatAmount(transaction.amount)}
                    </p>
                  </div>
                </div>
              );
            })}

            {transactions.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-sm">No transactions found</p>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="p-4 sm:p-6 pt-0 flex-shrink-0 border-t border-border mt-auto">
          <Button asChild variant="outline" className="w-full">
            <Link to={`/transactions${filterParam ? `?${filterParam}` : ''}`}>
              <ExternalLink className="w-4 h-4 mr-2" />
              View all in Transactions
            </Link>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
