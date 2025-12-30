import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useExpense } from '@/context/ExpenseContext';
import { categoryColors } from '@/data/initialData';

export function CategoryChart() {
  const { transactions, getCategoryById } = useExpense();

  const data = useMemo(() => {
    const expenses = transactions.filter(t => t.type === 'debit' && t.status === 'confirmed');
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
      .map(([name, value]) => ({
        name,
        value,
        percentage: ((value / total) * 100).toFixed(1),
        color: categoryColors[name] || 'hsl(195, 100%, 50%)',
      }))
      .sort((a, b) => b.value - a.value);
  }, [transactions, getCategoryById]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="glass-card px-4 py-3 border-white/10">
          <p className="font-semibold text-foreground">{data.name}</p>
          <p className="text-sm text-primary">
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
      className="glass-card p-6 border-white/5"
    >
      <h3 className="text-lg font-semibold mb-6 bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
        Spending by Category
      </h3>
      
      <div className="flex flex-col lg:flex-row items-center gap-6">
        <div className="relative w-52 h-52 lg:w-60 lg:h-60">
          {/* Glow effect behind chart */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary/20 to-accent/20 blur-2xl opacity-50" />
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={3}
                dataKey="value"
                strokeWidth={0}
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
              <p className="text-2xl font-bold text-foreground">
                {data.length}
              </p>
              <p className="text-xs text-muted-foreground">Categories</p>
            </div>
          </div>
        </div>

        <div className="flex-1 w-full space-y-2 max-h-52 overflow-y-auto scrollbar-thin pr-2">
          {data.slice(0, 6).map((item, index) => (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + index * 0.05 }}
              className="flex items-center justify-between py-2.5 px-4 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] hover:border-white/[0.08] transition-all duration-300"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-3 h-3 rounded-full shadow-[0_0_10px_currentColor]"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm font-medium text-foreground/90">{item.name}</span>
              </div>
              <div className="text-right">
                <span className="text-sm font-semibold text-foreground">
                  ₹{item.value.toLocaleString('en-IN')}
                </span>
                <span className="text-xs text-muted-foreground ml-2">
                  {item.percentage}%
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
