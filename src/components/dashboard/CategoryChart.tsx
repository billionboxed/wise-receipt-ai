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
        color: categoryColors[name] || 'hsl(0, 0%, 50%)',
      }))
      .sort((a, b) => b.value - a.value);
  }, [transactions, getCategoryById]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card px-4 py-3 rounded-lg shadow-lg border border-border">
          <p className="font-semibold text-foreground">{data.name}</p>
          <p className="text-sm text-muted-foreground">
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
      transition={{ delay: 0.2, duration: 0.4 }}
      className="bg-card rounded-xl p-6 shadow-card border border-border/50"
    >
      <h3 className="text-lg font-semibold mb-4">Spending by Category</h3>
      
      <div className="flex flex-col lg:flex-row items-center gap-6">
        <div className="w-48 h-48 lg:w-56 lg:h-56">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="flex-1 w-full space-y-2 max-h-48 overflow-y-auto scrollbar-thin">
          {data.slice(0, 6).map((item, index) => (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + index * 0.05 }}
              className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm font-medium">{item.name}</span>
              </div>
              <div className="text-right">
                <span className="text-sm font-semibold">
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
