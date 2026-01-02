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
  Cell,
} from 'recharts';
import { parseISO, getDay } from 'date-fns';
import { useCurrency } from '@/context/CurrencyContext';
import { Transaction } from '@/context/ExpenseContext';

interface DayOfWeekChartProps {
  transactions: Transaction[];
}

export function DayOfWeekChart({ transactions }: DayOfWeekChartProps) {
  const { formatAmount } = useCurrency();

  const dowData = useMemo(() => {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayTotals: number[] = [0, 0, 0, 0, 0, 0, 0];
    const dayCounts: number[] = [0, 0, 0, 0, 0, 0, 0];
    
    transactions
      .filter(t => t.status === 'confirmed' && t.type === 'debit')
      .forEach(t => {
        const day = getDay(parseISO(t.date));
        dayTotals[day] += t.amount;
        dayCounts[day] += 1;
      });
    
    const maxTotal = Math.max(...dayTotals);
    
    return dayNames.map((name, index) => ({
      day: name.slice(0, 3),
      fullDay: name,
      total: dayTotals[index],
      count: dayCounts[index],
      average: dayCounts[index] > 0 ? dayTotals[index] / dayCounts[index] : 0,
      isMax: dayTotals[index] === maxTotal && maxTotal > 0,
    }));
  }, [transactions]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card px-4 py-3 rounded-lg shadow-lg border border-border">
          <p className="font-semibold text-foreground mb-1">{data.fullDay}</p>
          <p className="text-sm text-muted-foreground">
            Total: {formatAmount(data.total)}
          </p>
          <p className="text-sm text-muted-foreground">
            Transactions: {data.count}
          </p>
          <p className="text-sm text-muted-foreground">
            Average: {formatAmount(Math.round(data.average))}
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
      className="bg-card rounded-xl p-6 shadow-card border border-border/50"
    >
      <h3 className="text-lg font-semibold mb-4">Day-of-Week Spending</h3>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dowData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="day" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="total" name="Spending" radius={[4, 4, 0, 0]}>
              {dowData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.isMax ? 'hsl(var(--destructive))' : 'hsl(var(--primary))'} 
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-muted-foreground mt-2 text-center">
        {dowData.find(d => d.isMax)?.fullDay || 'No data'} has the highest spending
      </p>
    </motion.div>
  );
}
