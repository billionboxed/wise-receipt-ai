import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useExpense } from '@/context/ExpenseContext';
import { cn } from '@/lib/utils';
import { CreditCard, Building2 } from 'lucide-react';

export function AccountSummary() {
  const { accounts, transactions } = useExpense();

  const accountBalances = useMemo(() => {
    return accounts.map(account => {
      const accountTransactions = transactions.filter(
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
  }, [accounts, transactions]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.4 }}
      className="bg-card rounded-xl p-6 shadow-card border border-border/50"
    >
      <h3 className="text-lg font-semibold mb-4">Account Summary</h3>

      <div className="space-y-3">
        {accountBalances.map((account, index) => (
          <motion.div
            key={account.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 + index * 0.05 }}
            className={cn(
              'p-4 rounded-lg border border-border/50 transition-all duration-200 hover:shadow-md',
              account.type === 'credit'
                ? 'bg-gradient-to-r from-primary/5 to-transparent'
                : 'bg-gradient-to-r from-success/5 to-transparent'
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center',
                    account.type === 'credit'
                      ? 'bg-primary/10 text-primary'
                      : 'bg-success/10 text-success'
                  )}
                >
                  {account.type === 'credit' ? (
                    <CreditCard className="w-5 h-5" />
                  ) : (
                    <Building2 className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-sm">{account.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {account.type === 'credit' ? 'Credit Card' : 'Bank Account'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-destructive">
                  ₹{account.spent.toLocaleString('en-IN')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {account.transactionCount} transactions
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
