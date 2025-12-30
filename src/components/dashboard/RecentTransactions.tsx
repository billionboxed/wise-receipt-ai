import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import { ArrowUpRight, ArrowDownRight, ChevronRight } from 'lucide-react';
import { useExpense } from '@/context/ExpenseContext';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

export function RecentTransactions() {
  const { transactions, getCategoryById, getAccountById } = useExpense();

  const recentTransactions = useMemo(() => {
    return transactions
      .filter(t => t.status === 'confirmed')
      .slice(0, 5);
  }, [transactions]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.5 }}
      className="glass-card p-4 md:p-6 border-white/5"
    >
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <h3 className="text-base md:text-lg font-semibold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
          Recent Transactions
        </h3>
        <Link
          to="/transactions"
          className="text-xs md:text-sm font-medium text-primary hover:text-primary/80 transition-colors flex items-center gap-1 group"
        >
          View all
          <ChevronRight className="w-3 h-3 md:w-4 md:h-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>

      <div className="space-y-1.5 md:space-y-2">
        {recentTransactions.map((transaction, index) => {
          const category = getCategoryById(transaction.categoryId);
          const account = getAccountById(transaction.accountId);

          return (
            <motion.div
              key={transaction.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + index * 0.05 }}
              className="flex items-center justify-between p-3 md:p-4 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] hover:border-white/[0.08] transition-all duration-300 group"
            >
              <div className="flex items-center gap-3 md:gap-4 min-w-0 flex-1">
                <div
                  className={cn(
                    'w-9 h-9 md:w-11 md:h-11 rounded-xl flex-shrink-0 flex items-center justify-center transition-all duration-300',
                    transaction.type === 'credit'
                      ? 'bg-success/10 text-success group-hover:shadow-[0_0_20px_hsl(160_100%_45%/0.3)]'
                      : 'bg-destructive/10 text-destructive group-hover:shadow-[0_0_20px_hsl(0_85%_60%/0.3)]'
                  )}
                >
                  {transaction.type === 'credit' ? (
                    <ArrowDownRight className="w-4 h-4 md:w-5 md:h-5" />
                  ) : (
                    <ArrowUpRight className="w-4 h-4 md:w-5 md:h-5" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-xs md:text-sm text-foreground truncate">
                    {transaction.description}
                  </p>
                  <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5 truncate">
                    {category?.combined} • {account?.name}
                  </p>
                </div>
              </div>
              <div className="text-right flex-shrink-0 ml-2">
                <p
                  className={cn(
                    'font-semibold text-sm md:text-base',
                    transaction.type === 'credit' ? 'text-success' : 'text-foreground'
                  )}
                >
                  {transaction.type === 'credit' ? '+' : '-'}₹
                  {transaction.amount.toLocaleString('en-IN')}
                </p>
                <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5">
                  {format(parseISO(transaction.date), 'dd MMM')}
                </p>
              </div>
            </motion.div>
          );
        })}

        {recentTransactions.length === 0 && (
          <div className="text-center py-8 md:py-12">
            <div className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-3 md:mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
              <ArrowUpRight className="w-6 h-6 md:w-8 md:h-8 text-primary" />
            </div>
            <p className="text-sm md:text-base text-muted-foreground font-medium">No transactions yet</p>
            <p className="text-xs md:text-sm text-muted-foreground/60 mt-1">Upload a file to get started</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
