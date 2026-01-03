import { useMemo } from 'react';
import { Layout } from '@/components/layout/Layout';
import { StatCard } from '@/components/dashboard/StatCard';
import { CategoryChart } from '@/components/dashboard/CategoryChart';
import { SpendingTrend } from '@/components/dashboard/SpendingTrend';
import { RecentTransactions } from '@/components/dashboard/RecentTransactions';
import { AccountSummary } from '@/components/dashboard/AccountSummary';
import { TagsSpending } from '@/components/dashboard/TagsSpending';
import { useFilteredTransactions } from '@/hooks/useFilteredTransactions';
import { Wallet, TrendingUp, TrendingDown, CreditCard } from 'lucide-react';

export default function Dashboard() {
  const { filteredTransactions } = useFilteredTransactions();

  const stats = useMemo(() => {
    const expenses = filteredTransactions.filter(t => t.status === 'confirmed' && t.type === 'debit');
    
    const totalExpense = expenses.reduce((sum, t) => sum + t.amount, 0);

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const thisMonthExpense = expenses
      .filter(t => {
        const date = new Date(t.date);
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
      })
      .reduce((sum, t) => sum + t.amount, 0);

    const lastMonthExpense = expenses
      .filter(t => {
        const date = new Date(t.date);
        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const year = currentMonth === 0 ? currentYear - 1 : currentYear;
        return date.getMonth() === lastMonth && date.getFullYear() === year;
      })
      .reduce((sum, t) => sum + t.amount, 0);

    const expenseChange = lastMonthExpense > 0
      ? ((thisMonthExpense - lastMonthExpense) / lastMonthExpense * 100).toFixed(1)
      : '0';

    const avgTransaction = expenses.length > 0 ? totalExpense / expenses.length : 0;

    return { totalExpense, thisMonthExpense, lastMonthExpense, expenseChange, transactionCount: expenses.length, avgTransaction };
  }, [filteredTransactions]);

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">Track your expenses and manage your finances</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard title="Total Expenses" value={`₹${stats.totalExpense.toLocaleString('en-IN')}`} icon={Wallet} iconColor="destructive" delay={0} />
          <StatCard title="This Month" value={`₹${stats.thisMonthExpense.toLocaleString('en-IN')}`} change={`${parseFloat(stats.expenseChange) > 0 ? '+' : ''}${stats.expenseChange}% from last month`} changeType={parseFloat(stats.expenseChange) > 0 ? 'negative' : 'positive'} icon={TrendingDown} iconColor="accent" delay={0.1} />
          <StatCard title="Last Month" value={`₹${stats.lastMonthExpense.toLocaleString('en-IN')}`} icon={TrendingUp} iconColor="primary" delay={0.2} />
          <StatCard title="Avg. Transaction" value={`₹${Math.round(stats.avgTransaction).toLocaleString('en-IN')}`} change={`${stats.transactionCount} txns`} changeType="neutral" icon={CreditCard} iconColor="success" delay={0.3} />
        </div>

        <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
          <CategoryChart />
          <SpendingTrend />
        </div>

        <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
          <RecentTransactions />
          <AccountSummary />
          <TagsSpending />
        </div>
      </div>
    </Layout>
  );
}
