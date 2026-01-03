import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useExpense } from '@/context/ExpenseContext';
import { useFilteredTransactions } from '@/hooks/useFilteredTransactions';
import { cn } from '@/lib/utils';
import { CreditCard, Building2 } from 'lucide-react';

export function AccountSummary() {
  const { accounts } = useExpense();
  const { filteredTransactions } = useFilteredTransactions();

  const accountBalances = useMemo(() => {
    return accounts.map(account => {
      const accountTransactions = filteredTransactions.filter(
        t => t.accountId === account.id && t.status === 'confirmed'
      );
      
      const spent = accountTransactions
        .filter(t => t.type === 'debit')
        .reduce((sum, t) => sum + t.amount, 0);
      
      const received = accountTransactions
        .filter(t => t.type === 'credit')
        .reduce((sum, t) => sum + t.amount, 0);

      return {
        ...account,
        spent,
        received,
        transactionCount: accountTransactions.length,
      };
    });
  }, [accounts, filteredTransactions]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.5 }}
      className="glass-card p-4 sm:p-6"
    >
      <h3 className="text-base sm:text-lg font-semibold mb-4 sm:mb-6 text-foreground">
        Account Summary
      </h3>

      <div className="space-y-2 sm:space-y-3">
        {accountBalances.map((account, index) => (
          <motion.div
            key={account.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 + index * 0.05 }}
            className={cn(
              'p-3 sm:p-4 rounded-lg sm:rounded-xl border border-border transition-all duration-300 hover:border-primary/30 group',
              account.type === 'credit'
                ? 'bg-primary/5 hover:shadow-glow'
                : 'bg-success/5 hover:shadow-[0_0_30px_hsl(var(--success)/0.1)]'
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 sm:gap-4">
                <div
                  className={cn(
                    'w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center transition-all duration-300',
                    account.type === 'credit'
                      ? 'bg-primary/10 text-primary group-hover:shadow-[0_0_20px_hsl(195_100%_50%/0.3)]'
                      : 'bg-success/10 text-success group-hover:shadow-[0_0_20px_hsl(160_100%_45%/0.3)]'
                  )}
                >
                  {account.type === 'credit' ? (
                    <CreditCard className="w-5 h-5 sm:w-6 sm:h-6" />
                  ) : (
                    <Building2 className="w-5 h-5 sm:w-6 sm:h-6" />
                  )}
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm sm:text-base">{account.name}</p>
                  <p className="text-xs text-muted-foreground capitalize mt-0.5">
                    {account.type === 'credit' ? 'Credit Card' : 'Bank Account'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs sm:text-sm font-bold text-destructive">
                  ₹{account.spent.toLocaleString('en-IN')}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {account.transactionCount} txns
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
