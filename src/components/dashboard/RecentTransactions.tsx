import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useExpense } from '@/context/ExpenseContext';
import { cn } from '@/lib/utils';

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
      transition={{ delay: 0.4, duration: 0.4 }}
      className="bg-card rounded-xl p-6 shadow-card border border-border/50"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Recent Transactions</h3>
        <a
          href="/transactions"
          className="text-sm font-medium text-primary hover:underline"
        >
          View all
        </a>
      </div>

      <div className="space-y-3">
        {recentTransactions.map((transaction, index) => {
          const category = getCategoryById(transaction.categoryId);
          const account = getAccountById(transaction.accountId);

          return (
            <motion.div
              key={transaction.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + index * 0.05 }}
              className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center',
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
                <div>
                  <p className="font-medium text-sm line-clamp-1">
                    {transaction.description}
                  </p>
                  <p className="text-xs text-muted-foreground">
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
                <p className="text-xs text-muted-foreground">
                  {format(parseISO(transaction.date), 'dd MMM')}
                </p>
              </div>
            </motion.div>
          );
        })}

        {recentTransactions.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p>No transactions yet</p>
            <p className="text-sm">Upload a file to get started</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
