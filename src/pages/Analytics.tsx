import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import { Layout } from '@/components/layout/Layout';
import { useExpense } from '@/context/ExpenseContext';
import { useCurrency } from '@/context/CurrencyContext';
import { useFilteredTransactions } from '@/hooks/useFilteredTransactions';
import { categoryColors } from '@/data/initialData';
import { format, parseISO, startOfWeek, subWeeks, eachDayOfInterval, subDays } from 'date-fns';
import { TrendingUp, TrendingDown, Calendar, Target } from 'lucide-react';
import { YearOverYearChart } from '@/components/analytics/YearOverYearChart';
import { DayOfWeekChart } from '@/components/analytics/DayOfWeekChart';
import { RecurringExpenses } from '@/components/analytics/RecurringExpenses';
import { SpendingForecast } from '@/components/analytics/SpendingForecast';
import { TransactionPreviewDrawer } from '@/components/transactions/TransactionPreviewDrawer';

export default function Analytics() {
  const { getCategoryById, getAccountById, tags } = useExpense();
  const { formatAmount } = useCurrency();
  const { filteredTransactions } = useFilteredTransactions();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);

  const handleCategoryClick = (categoryName: string) => {
    setSelectedCategory(categoryName);
  };

  const handleAccountClick = (accountName: string) => {
    setSelectedAccount(accountName);
  };

  const confirmedTransactions = useMemo(
    () => filteredTransactions.filter(t => t.status === 'confirmed'),
    [filteredTransactions]
  );

  // Category spending breakdown
  const categoryData = useMemo(() => {
    const expenses = confirmedTransactions.filter(t => t.type === 'debit');
    const categoryTotals: Record<string, number> = {};

    expenses.forEach(t => {
      const category = getCategoryById(t.categoryId);
      const categoryName = category ? category.main : 'Uncategorized';
      categoryTotals[categoryName] = (categoryTotals[categoryName] || 0) + t.amount;
    });

    const total = Object.values(categoryTotals).reduce((a, b) => a + b, 0);

    return Object.entries(categoryTotals)
      .map(([name, value]) => ({
        name,
        value,
        percentage: ((value / total) * 100).toFixed(1),
        color: categoryColors[name] || 'hsl(var(--muted-foreground))',
      }))
      .sort((a, b) => b.value - a.value);
  }, [confirmedTransactions, getCategoryById]);

  // Weekly spending trend
  const weeklyData = useMemo(() => {
    const weeks = Array.from({ length: 8 }, (_, i) => {
      const weekStart = startOfWeek(subWeeks(new Date(), 7 - i));
      return {
        week: format(weekStart, 'dd MMM'),
        expense: 0,
      };
    });

    confirmedTransactions
      .filter(t => t.type === 'debit')
      .forEach(t => {
        const txDate = parseISO(t.date);
        const weekStart = startOfWeek(txDate);
        const weekData = weeks.find(w => w.week === format(weekStart, 'dd MMM'));
        if (weekData) {
          weekData.expense += t.amount;
        }
      });

    return weeks;
  }, [confirmedTransactions]);

  // Daily spending for last 30 days
  const dailyData = useMemo(() => {
    const days = eachDayOfInterval({
      start: subDays(new Date(), 29),
      end: new Date(),
    });

    return days.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const dayExpenses = confirmedTransactions
        .filter(t => t.date === dayStr && t.type === 'debit')
        .reduce((sum, t) => sum + t.amount, 0);

      return {
        date: format(day, 'dd'),
        amount: dayExpenses,
      };
    });
  }, [confirmedTransactions]);

  // Account spending breakdown
  const accountData = useMemo(() => {
    const accountTotals: Record<string, number> = {};

    confirmedTransactions
      .filter(t => t.type === 'debit')
      .forEach(t => {
        const account = getAccountById(t.accountId);
        if (account) {
          accountTotals[account.name] = (accountTotals[account.name] || 0) + t.amount;
        }
      });

    return Object.entries(accountTotals).map(([name, value]) => ({
      name,
      value,
    }));
  }, [confirmedTransactions, getAccountById]);

  // Stats
  const stats = useMemo(() => {
    const expenses = confirmedTransactions.filter(t => t.type === 'debit');
    const total = expenses.reduce((sum, t) => sum + t.amount, 0);
    const average = expenses.length > 0 ? total / expenses.length : 0;
    const highest = expenses.length > 0 ? Math.max(...expenses.map(t => t.amount)) : 0;
    
    return { total, average, highest, count: expenses.length };
  }, [confirmedTransactions]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card px-3 py-2 rounded-lg shadow-lg border border-border">
          <p className="font-semibold text-foreground text-sm mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-xs" style={{ color: entry.color }}>
              {entry.name}: {formatAmount(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Deep insights into your spending patterns
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[
            { label: 'Total Spent', value: formatAmount(stats.total), icon: TrendingDown, color: 'text-destructive' },
            { label: 'Avg. Transaction', value: formatAmount(Math.round(stats.average)), icon: Target, color: 'text-primary' },
            { label: 'Highest Expense', value: formatAmount(stats.highest), icon: TrendingUp, color: 'text-accent' },
            { label: 'Transactions', value: stats.count.toString(), icon: Calendar, color: 'text-success' },
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-card rounded-lg sm:rounded-xl p-3 sm:p-4 shadow-card border border-border/50"
            >
              <div className="flex items-center gap-2 sm:gap-3">
                <div className={`p-1.5 sm:p-2 rounded-lg bg-muted ${stat.color}`}>
                  <stat.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground truncate">{stat.label}</p>
                  <p className="text-sm sm:text-lg font-bold truncate">{stat.value}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Spending Forecast - Full Width */}
        <SpendingForecast transactions={filteredTransactions} />

        {/* Charts Grid */}
        <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Year over Year */}
          <YearOverYearChart transactions={filteredTransactions} />

          {/* Day of Week */}
          <DayOfWeekChart transactions={filteredTransactions} />

          {/* Recurring Expenses */}
          <RecurringExpenses />

          {/* Category Breakdown */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-lg sm:rounded-xl p-4 sm:p-6 shadow-card border border-border/50"
          >
            <h3 className="text-base sm:text-lg font-semibold mb-4">Spending by Category</h3>
            <p className="text-xs text-muted-foreground mb-4 -mt-2">Click a bar to view transactions</p>
            <div className="h-56 sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData.slice(0, 8)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
                  <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar 
                    dataKey="value" 
                    radius={[0, 4, 4, 0]} 
                    onClick={(data) => handleCategoryClick(data.name)}
                    style={{ cursor: 'pointer' }}
                  >
                    {categoryData.slice(0, 8).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>

        {/* More Charts */}
        <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Weekly Trend */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-lg sm:rounded-xl p-4 sm:p-6 shadow-card border border-border/50"
          >
            <h3 className="text-base sm:text-lg font-semibold mb-4">Weekly Spending</h3>
            <div className="h-56 sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                  <YAxis tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} tick={{ fontSize: 10 }} width={35} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="expense" name="Expense" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Daily Spending Trend */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-lg sm:rounded-xl p-4 sm:p-6 shadow-card border border-border/50"
          >
            <h3 className="text-base sm:text-lg font-semibold mb-4">Last 30 Days</h3>
            <div className="h-56 sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 9 }} interval={3} />
                  <YAxis tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} tick={{ fontSize: 10 }} width={35} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="amount"
                    name="Spending"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Account Breakdown */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-lg sm:rounded-xl p-4 sm:p-6 shadow-card border border-border/50"
          >
            <h3 className="text-base sm:text-lg font-semibold mb-4">Spending by Account</h3>
            <p className="text-xs text-muted-foreground mb-4 -mt-2">Click a segment to view transactions</p>
            <div className="h-56 sm:h-72 flex items-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={accountData}
                    cx="50%"
                    cy="50%"
                    outerRadius="80%"
                    innerRadius="45%"
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name.split(' ')[0]} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                    onClick={(data) => handleAccountClick(data.name)}
                    style={{ cursor: 'pointer' }}
                  >
                    {accountData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={`hsl(var(--chart-${(index % 15) + 1}))`}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>

        {/* Transaction Preview Drawer */}
        <TransactionPreviewDrawer
          open={!!selectedCategory}
          onOpenChange={(open) => !open && setSelectedCategory(null)}
          categoryFilter={selectedCategory || undefined}
          title={selectedCategory || undefined}
        />
        <TransactionPreviewDrawer
          open={!!selectedAccount}
          onOpenChange={(open) => !open && setSelectedAccount(null)}
          accountFilter={selectedAccount || undefined}
          title={selectedAccount || undefined}
        />
      </div>
    </Layout>
  );
}
