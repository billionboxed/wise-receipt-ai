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
  Legend,
} from 'recharts';
import { format, parseISO, getYear, getMonth } from 'date-fns';
import { useCurrency } from '@/context/CurrencyContext';
import { Transaction } from '@/context/ExpenseContext';

interface YearOverYearChartProps {
  transactions: Transaction[];
}

export function YearOverYearChart({ transactions }: YearOverYearChartProps) {
  const { formatAmount } = useCurrency();

  const yoyData = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const previousYear = currentYear - 1;
    
    const monthlyData: Record<number, { current: number; previous: number }> = {};
    
    // Initialize all months
    for (let i = 0; i < 12; i++) {
      monthlyData[i] = { current: 0, previous: 0 };
    }
    
    transactions
      .filter(t => t.status === 'confirmed' && t.type === 'debit')
      .forEach(t => {
        const date = parseISO(t.date);
        const year = getYear(date);
        const month = getMonth(date);
        
        if (year === currentYear) {
          monthlyData[month].current += t.amount;
        } else if (year === previousYear) {
          monthlyData[month].previous += t.amount;
        }
      });
    
    return Object.entries(monthlyData).map(([month, data]) => ({
      month: format(new Date(2024, parseInt(month)), 'MMM'),
      [currentYear.toString()]: data.current,
      [previousYear.toString()]: data.previous,
    }));
  }, [transactions]);

  const currentYear = new Date().getFullYear();
  const previousYear = currentYear - 1;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card px-4 py-3 rounded-lg shadow-lg border border-border">
          <p className="font-semibold text-foreground mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {formatAmount(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-lg sm:rounded-xl p-4 sm:p-6 shadow-card border border-border/50"
    >
      <h3 className="text-base sm:text-lg font-semibold mb-4">Year-over-Year Comparison</h3>
      <div className="h-56 sm:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={yoyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="month" tick={{ fontSize: 10 }} />
            <YAxis tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} tick={{ fontSize: 10 }} width={35} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Bar 
              dataKey={previousYear.toString()} 
              name={previousYear.toString()} 
              fill="hsl(var(--muted-foreground))" 
              radius={[4, 4, 0, 0]} 
            />
            <Bar 
              dataKey={currentYear.toString()} 
              name={currentYear.toString()} 
              fill="hsl(var(--primary))" 
              radius={[4, 4, 0, 0]} 
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
