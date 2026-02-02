import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import { ArrowUpRight, ArrowDownRight, ChevronRight } from 'lucide-react';
import { useExpense } from '@/context/ExpenseContext';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { TransactionPreviewDrawer } from '@/components/transactions/TransactionPreviewDrawer';

export function RecentTransactions() {
  const { transactions, getCategoryById, getAccountById } = useExpense();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const handleCategoryClick = (categoryMain: string | undefined, e: React.MouseEvent) => {
    e.stopPropagation();
    if (categoryMain) {
      setSelectedCategory(categoryMain);
    }
  };

  const recentTransactions = useMemo(() => {
    return [...transactions]
      .filter(t => t.status === 'confirmed')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [transactions]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.5 }}
      className="glass-card p-4 sm:p-6"
    >
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h3 className="text-base sm:text-lg font-semibold text-foreground">
          Recent Transactions
        </h3>
        <Link
          to="/transactions"
          className="text-xs sm:text-sm font-medium text-primary hover:text-primary/80 transition-colors flex items-center gap-0.5 group"
        >
          <span className="hidden sm:inline">View all</span>
          <span className="sm:hidden">All</span>
          <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>

      <div className="space-y-1.5 sm:space-y-2">
        {recentTransactions.map((transaction, index) => {
          const category = getCategoryById(transaction.categoryId);
          const account = getAccountById(transaction.accountId);

          return (
            <motion.div
              key={transaction.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + index * 0.05 }}
              className="flex items-center justify-between p-2.5 sm:p-4 rounded-lg sm:rounded-xl bg-muted/50 border border-border hover:bg-muted transition-all duration-300 group"
            >
              <div className="flex items-center gap-2.5 sm:gap-4 min-w-0 flex-1">
                <div
                  className={cn(
                    'w-9 h-9 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl flex items-center justify-center transition-all duration-300 flex-shrink-0',
                    transaction.type === 'credit'
                      ? 'bg-success/10 text-success group-hover:shadow-[0_0_20px_hsl(160_100%_45%/0.3)]'
                      : 'bg-destructive/10 text-destructive group-hover:shadow-[0_0_20px_hsl(0_85%_60%/0.3)]'
                  )}
                >
                  {transaction.type === 'credit' ? (
                    <ArrowDownRight className="w-4 h-4 sm:w-5 sm:h-5" />
                  ) : (
                    <ArrowUpRight className="w-4 h-4 sm:w-5 sm:h-5" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-xs sm:text-sm text-foreground truncate">
                    {transaction.description}
                  </p>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  <button 
                    onClick={(e) => handleCategoryClick(category?.main, e)}
                    className="hover:text-primary hover:underline transition-colors"
                  >
                    {category?.main}
                  </button>
                  {' • '}{account?.name}
                </p>
                </div>
              </div>
              <div className="text-right flex-shrink-0 ml-2">
                <p
                  className={cn(
                    'font-semibold text-sm',
                    transaction.type === 'credit' ? 'text-success' : 'text-foreground'
                  )}
                >
                  ₹{transaction.amount.toLocaleString('en-IN')}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {format(parseISO(transaction.date), 'dd MMM')}
                </p>
              </div>
            </motion.div>
          );
        })}

        {recentTransactions.length === 0 && (
          <div className="text-center py-8 sm:py-12">
            <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 rounded-xl sm:rounded-2xl bg-primary/10 flex items-center justify-center">
              <ArrowUpRight className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
            </div>
            <p className="text-muted-foreground font-medium text-sm sm:text-base">No transactions yet</p>
            <p className="text-xs sm:text-sm text-muted-foreground/60 mt-1">Upload a file to get started</p>
          </div>
        )}
      </div>

      <TransactionPreviewDrawer
        open={!!selectedCategory}
        onOpenChange={(open) => !open && setSelectedCategory(null)}
        categoryFilter={selectedCategory || undefined}
        title={selectedCategory || undefined}
      />
    </motion.div>
  );
}
