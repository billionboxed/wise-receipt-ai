import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Tag as TagIcon } from 'lucide-react';
import { useExpense } from '@/context/ExpenseContext';
import { cn } from '@/lib/utils';

export function TagsSpending() {
  const { transactions, tags, getTagById } = useExpense();

  const tagSpending = useMemo(() => {
    const spending: Record<string, number> = {};

    transactions
      .filter(t => t.status === 'confirmed' && t.type === 'debit')
      .forEach(t => {
        t.tagIds.forEach(tagId => {
          spending[tagId] = (spending[tagId] || 0) + t.amount;
        });
      });

    const total = Object.values(spending).reduce((a, b) => a + b, 0);

    return tags
      .map(tag => ({
        ...tag,
        amount: spending[tag.id] || 0,
        percentage: total > 0 ? ((spending[tag.id] || 0) / total) * 100 : 0,
      }))
      .filter(t => t.amount > 0)
      .sort((a, b) => b.amount - a.amount);
  }, [transactions, tags]);

  if (tagSpending.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass-card p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
            Spending by Tags
          </h3>
          <TagIcon className="w-5 h-5 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground text-center py-8">
          No tagged transactions yet
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="glass-card p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
          Spending by Tags
        </h3>
        <TagIcon className="w-5 h-5 text-accent" />
      </div>

      <div className="space-y-4">
        {tagSpending.map((tag, index) => (
          <motion.div
            key={tag.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="group"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: tag.color }}
                />
                <span className="text-sm font-medium text-foreground">{tag.name}</span>
              </div>
              <span className="text-sm font-semibold text-foreground">
                ₹{tag.amount.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="h-2 rounded-full bg-white/5 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${tag.percentage}%` }}
                transition={{ duration: 0.8, delay: index * 0.05 }}
                className="h-full rounded-full transition-all group-hover:opacity-80"
                style={{
                  background: `linear-gradient(90deg, ${tag.color}, ${tag.color}80)`,
                  boxShadow: `0 0 10px ${tag.color}50`,
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {tag.percentage.toFixed(1)}% of tagged spending
            </p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
