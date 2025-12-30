import { useMemo } from 'react';
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
  Legend,
} from 'recharts';
import { Layout } from '@/components/layout/Layout';
import { useExpense } from '@/context/ExpenseContext';
import { categoryColors } from '@/data/initialData';
import { format, parseISO, startOfWeek, subWeeks, eachDayOfInterval, subDays } from 'date-fns';
import { TrendingUp, TrendingDown, Calendar, Target } from 'lucide-react';

export default function Analytics() {
  const { transactions, getCategoryById, getAccountById } = useExpense();

  const confirmedTransactions = useMemo(
    () => transactions.filter(t => t.status === 'confirmed'),
    [transactions]
  );

  // Category spending breakdown
  const categoryData = useMemo(() => {
    const expenses = confirmedTransactions.filter(t => t.type === 'debit');
    const categoryTotals: Record<string, number> = {};

    expenses.forEach(t => {
      const category = getCategoryById(t.categoryId);
      if (category) {
        categoryTotals[category.main] = (categoryTotals[category.main] || 0) + t.amount;
      }
    });

    const total = Object.values(categoryTotals).reduce((a, b) => a + b, 0);

    return Object.entries(categoryTotals)
      .map(([name, value]) => ({
        name,
        value,
        percentage: ((value / total) * 100).toFixed(1),
        color: categoryColors[name] || 'hsl(0, 0%, 50%)',
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
        income: 0,
      };
    });

    confirmedTransactions.forEach(t => {
      const txDate = parseISO(t.date);
      const weekStart = startOfWeek(txDate);
      const weekData = weeks.find(w => w.week === format(weekStart, 'dd MMM'));
      if (weekData) {
        if (t.type === 'debit') {
          weekData.expense += t.amount;
        } else {
          weekData.income += t.amount;
        }
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
        <div className="bg-card px-4 py-3 rounded-lg shadow-lg border border-border">
          <p className="font-semibold text-foreground mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: ₹{entry.value.toLocaleString('en-IN')}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Deep insights into your spending patterns
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Spent', value: `₹${stats.total.toLocaleString('en-IN')}`, icon: TrendingDown, color: 'text-destructive' },
            { label: 'Avg. Transaction', value: `₹${Math.round(stats.average).toLocaleString('en-IN')}`, icon: Target, color: 'text-primary' },
            { label: 'Highest Expense', value: `₹${stats.highest.toLocaleString('en-IN')}`, icon: TrendingUp, color: 'text-accent' },
            { label: 'Total Transactions', value: stats.count.toString(), icon: Calendar, color: 'text-success' },
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-card rounded-xl p-4 shadow-card border border-border/50"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-muted ${stat.color}`}>
                  <stat.icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="text-lg font-bold">{stat.value}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Charts Grid */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Category Breakdown */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-card rounded-xl p-6 shadow-card border border-border/50"
          >
            <h3 className="text-lg font-semibold mb-4">Spending by Category</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData.slice(0, 8)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                  <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {categoryData.slice(0, 8).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Weekly Trend */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-card rounded-xl p-6 shadow-card border border-border/50"
          >
            <h3 className="text-lg font-semibold mb-4">Weekly Spending</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="expense" name="Expense" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="income" name="Income" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Daily Spending Trend */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-card rounded-xl p-6 shadow-card border border-border/50"
          >
            <h3 className="text-lg font-semibold mb-4">Last 30 Days</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={2} />
                  <YAxis tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
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
            transition={{ delay: 0.5 }}
            className="bg-card rounded-xl p-6 shadow-card border border-border/50"
          >
            <h3 className="text-lg font-semibold mb-4">Spending by Account</h3>
            <div className="h-72 flex items-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={accountData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    innerRadius={50}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name.split(' ')[0]} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {accountData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={`hsl(${200 + index * 30}, 70%, 50%)`}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>
      </div>
    </Layout>
  );
}
