import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useExpense } from '@/context/ExpenseContext';
import { format, parseISO, startOfMonth, subMonths } from 'date-fns';

export function SpendingTrend() {
  const { transactions } = useExpense();

  const data = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, i) => {
      const date = subMonths(now, 5 - i);
      return {
        month: format(date, 'MMM'),
        fullMonth: format(date, 'MMMM yyyy'),
        start: startOfMonth(date),
        expense: 0,
      };
    });

    transactions
      .filter(t => t.status === 'confirmed' && t.type === 'debit')
      .forEach(t => {
        const txDate = parseISO(t.date);
        const monthData = months.find(
          m => format(txDate, 'MMM yyyy') === format(m.start, 'MMM yyyy')
        );
        if (monthData) {
          monthData.expense += t.amount;
        }
      });

    return months;
  }, [transactions]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass-card px-4 py-3 border-white/10">
          <p className="font-semibold text-foreground mb-2">{payload[0]?.payload?.fullMonth}</p>
          <p className="text-sm text-destructive flex justify-between gap-6">
            <span className="text-muted-foreground">Expense</span>
            <span className="font-semibold">₹{payload[0]?.value?.toLocaleString('en-IN')}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.5 }}
      className="glass-card p-6 border-white/5"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
          Spending Trend
        </h3>
        <div className="flex items-center gap-2 text-sm">
          <div className="w-3 h-3 rounded-full bg-destructive shadow-[0_0_10px_hsl(0_85%_60%)]" />
          <span className="text-muted-foreground">Monthly Expenses</span>
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(0, 85%, 60%)" stopOpacity={0.4} />
                <stop offset="100%" stopColor="hsl(0, 85%, 60%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(220, 10%, 55%)', fontSize: 12 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(220, 10%, 55%)', fontSize: 12 }}
              tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="expense"
              stroke="hsl(0, 85%, 60%)"
              strokeWidth={2}
              fill="url(#expenseGradient)"
              className="drop-shadow-[0_0_10px_hsl(0_85%_60%/0.5)]"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
