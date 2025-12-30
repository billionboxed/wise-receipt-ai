import { Layout } from '@/components/layout/Layout';
import { motion } from 'framer-motion';
import { useExpense } from '@/context/ExpenseContext';
import { CreditCard, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AccountsSettings() {
  const { accounts } = useExpense();

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Accounts</h1>
          <p className="text-muted-foreground mt-1">Manage your bank and credit accounts</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          {accounts.map((account, i) => (
            <motion.div
              key={account.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={cn(
                'p-5 rounded-xl border border-border/50 shadow-card',
                account.type === 'credit' ? 'bg-gradient-to-r from-primary/5 to-card' : 'bg-gradient-to-r from-success/5 to-card'
              )}
            >
              <div className="flex items-center gap-4">
                <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', account.type === 'credit' ? 'bg-primary/10 text-primary' : 'bg-success/10 text-success')}>
                  {account.type === 'credit' ? <CreditCard className="w-6 h-6" /> : <Building2 className="w-6 h-6" />}
                </div>
                <div>
                  <p className="font-semibold">{account.name}</p>
                  <p className="text-sm text-muted-foreground capitalize">{account.type === 'credit' ? 'Credit Card' : 'Bank Account'}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
