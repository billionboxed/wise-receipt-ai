import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useExpense } from '@/context/ExpenseContext';
import { useFilteredTransactions } from '@/hooks/useFilteredTransactions';

const chartColors = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(var(--chart-6))',
  'hsl(var(--chart-7))',
  'hsl(var(--chart-8))',
  'hsl(var(--chart-9))',
  'hsl(var(--chart-10))',
  'hsl(var(--chart-11))',
  'hsl(var(--chart-12))',
  'hsl(var(--chart-13))',
  'hsl(var(--chart-14))',
  'hsl(var(--chart-15))',
];

export function CategoryChart() {
  const { getCategoryById } = useExpense();
  const { filteredTransactions } = useFilteredTransactions();
  const navigate = useNavigate();

  const handleCategoryClick = (categoryName: string) => {
    navigate(`/transactions?category=${encodeURIComponent(categoryName)}`);
  };

  const data = useMemo(() => {
    const expenses = filteredTransactions.filter(t => t.type === 'debit' && t.status === 'confirmed');
    const categoryTotals: Record<string, number> = {};

    expenses.forEach(t => {
      const category = getCategoryById(t.categoryId);
      if (category) {
        const mainCategory = category.main;
        categoryTotals[mainCategory] = (categoryTotals[mainCategory] || 0) + t.amount;
      }
    });

    const total = Object.values(categoryTotals).reduce((a, b) => a + b, 0);

    return Object.entries(categoryTotals)
      .map(([name, value], index) => ({
        name,
        value,
        percentage: ((value / total) * 100).toFixed(1),
        color: chartColors[index % chartColors.length],
      }))
      .sort((a, b) => b.value - a.value);
  }, [filteredTransactions, getCategoryById]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="glass-card px-3 py-2">
          <p className="font-semibold text-foreground text-sm">{data.name}</p>
          <p className="text-xs text-primary">
            ₹{data.value.toLocaleString('en-IN')} ({data.percentage}%)
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
      transition={{ delay: 0.2, duration: 0.5 }}
      className="glass-card p-4 sm:p-6"
    >
      <h3 className="text-base sm:text-lg font-semibold mb-4 sm:mb-6 text-foreground">
        Spending by Category
      </h3>
      
      <div className="flex flex-col lg:flex-row items-center gap-4 sm:gap-6">
        <div className="relative w-40 h-40 sm:w-52 sm:h-52 lg:w-60 lg:h-60">
          {/* Glow effect behind chart */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary/20 to-accent/20 blur-2xl opacity-50" />
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius="50%"
                outerRadius="85%"
                paddingAngle={3}
                dataKey="value"
                strokeWidth={0}
                onClick={(_, index) => handleCategoryClick(data[index].name)}
                style={{ cursor: 'pointer' }}
              >
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.color}
                    className="drop-shadow-[0_0_8px_currentColor] transition-all duration-300 hover:opacity-80"
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          {/* Center text */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <p className="text-xl sm:text-2xl font-bold text-foreground">
                {data.length}
              </p>
              <p className="text-xs text-muted-foreground">Categories</p>
            </div>
          </div>
        </div>

        <div className="flex-1 w-full space-y-1.5 sm:space-y-2">
          {data.slice(0, 6).map((item, index) => (
            <motion.button
              key={item.name}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + index * 0.05 }}
              onClick={() => handleCategoryClick(item.name)}
              className="w-full flex items-center justify-between gap-2 py-2 px-3 sm:py-2.5 sm:px-4 rounded-lg sm:rounded-xl bg-muted/50 border border-border hover:bg-muted hover:border-primary/30 transition-all duration-300 group text-left"
            >
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <div
                  className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full shadow-[0_0_10px_currentColor] flex-shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-xs sm:text-sm font-medium text-foreground/90 truncate">{item.name}</span>
              </div>
              <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                <div className="text-right">
                  <span className="text-xs sm:text-sm font-semibold text-foreground whitespace-nowrap">
                    ₹{item.value.toLocaleString('en-IN')}
                  </span>
                  <span className="text-xs text-muted-foreground hidden sm:inline whitespace-nowrap ml-1">
                    {item.percentage}%
                  </span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
