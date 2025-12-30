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
      className="glass-card p-6 border-white/5"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
          Recent Transactions
        </h3>
        <Link
          to="/transactions"
          className="text-sm font-medium text-primary hover:text-primary/80 transition-colors flex items-center gap-1 group"
        >
          View all
          <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>

      <div className="space-y-2">
        {recentTransactions.map((transaction, index) => {
          const category = getCategoryById(transaction.categoryId);
          const account = getAccountById(transaction.accountId);

          return (
            <motion.div
              key={transaction.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + index * 0.05 }}
              className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] hover:border-white/[0.08] transition-all duration-300 group"
            >
              <div className="flex items-center gap-4">
                <div
                  className={cn(
                    'w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-300',
                    transaction.type === 'credit'
                      ? 'bg-success/10 text-success group-hover:shadow-[0_0_20px_hsl(160_100%_45%/0.3)]'
                      : 'bg-destructive/10 text-destructive group-hover:shadow-[0_0_20px_hsl(0_85%_60%/0.3)]'
                  )}
                >
                  {transaction.type === 'credit' ? (
                    <ArrowDownRight className="w-5 h-5" />
                  ) : (
                    <ArrowUpRight className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-sm text-foreground line-clamp-1">
                    {transaction.description}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {category?.combined} • {account?.name}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p
                  className={cn(
                    'font-semibold',
                    transaction.type === 'credit' ? 'text-success' : 'text-foreground'
                  )}
                >
                  {transaction.type === 'credit' ? '+' : '-'}₹
                  {transaction.amount.toLocaleString('en-IN')}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {format(parseISO(transaction.date), 'dd MMM')}
                </p>
              </div>
            </motion.div>
          );
        })}

        {recentTransactions.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
              <ArrowUpRight className="w-8 h-8 text-primary" />
            </div>
            <p className="text-muted-foreground font-medium">No transactions yet</p>
            <p className="text-sm text-muted-foreground/60 mt-1">Upload a file to get started</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
