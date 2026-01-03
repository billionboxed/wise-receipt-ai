import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Tag as TagIcon, FolderKanban } from 'lucide-react';
import { useExpense, Tag } from '@/context/ExpenseContext';
import { useFilteredTransactions } from '@/hooks/useFilteredTransactions';
import { useTheme } from 'next-themes';

interface ExtendedTag extends Tag {
  isProject?: boolean;
  isArchived?: boolean;
}

// Convert hex color to grayscale value (0-100)
function hexToGrayscale(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  // Use relative luminance formula
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  // Map to a range between 40-70% for visible differentiation
  return 40 + luminance * 30;
}

export function TagsSpending() {
  const { tags } = useExpense();
  const { filteredTransactions } = useFilteredTransactions();
  const { theme } = useTheme();
  const isMonochrome = theme === 'mono';

  const tagSpending = useMemo(() => {
    const spending: Record<string, number> = {};

    filteredTransactions
      .filter(t => t.status === 'confirmed' && t.type === 'debit')
      .forEach(t => {
        t.tagIds.forEach(tagId => {
          spending[tagId] = (spending[tagId] || 0) + t.amount;
        });
      });

    const total = Object.values(spending).reduce((a, b) => a + b, 0);

    return (tags as ExtendedTag[])
      .filter(t => !t.isArchived)
      .map(tag => ({
        ...tag,
        amount: spending[tag.id] || 0,
        percentage: total > 0 ? ((spending[tag.id] || 0) / total) * 100 : 0,
      }))
      .filter(t => t.amount > 0)
      .sort((a, b) => b.amount - a.amount);
  }, [filteredTransactions, tags]);

  if (tagSpending.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass-card p-4 sm:p-6"
      >
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h3 className="text-base sm:text-lg font-semibold text-foreground">
            Spending by Tags
          </h3>
          <TagIcon className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground text-center py-6 sm:py-8">
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
      className="glass-card p-4 sm:p-6"
    >
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h3 className="text-base sm:text-lg font-semibold text-foreground">
          Spending by Tags
        </h3>
        <TagIcon className="w-4 h-4 sm:w-5 sm:h-5 text-accent" />
      </div>

      <div className="space-y-3 sm:space-y-4">
        {tagSpending.map((tag, index) => (
          <motion.div
            key={tag.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="group"
          >
            <div className="flex items-center justify-between mb-1.5 sm:mb-2">
              <div className="flex items-center gap-2">
                <div
                  className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full"
                  style={{ 
                    backgroundColor: isMonochrome 
                      ? `hsl(0 0% ${hexToGrayscale(tag.color)}%)`
                      : tag.color 
                  }}
                />
                <span className="text-xs sm:text-sm font-medium text-foreground flex items-center gap-1">
                  {tag.isProject && <FolderKanban className="w-3 h-3 text-accent" />}
                  {tag.name}
                </span>
              </div>
              <span className="text-xs sm:text-sm font-semibold text-foreground">
                ₹{tag.amount.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="h-1.5 sm:h-2 rounded-full bg-muted overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${tag.percentage}%` }}
                transition={{ duration: 0.8, delay: index * 0.05 }}
                className="h-full rounded-full transition-all group-hover:opacity-80"
                style={isMonochrome ? {
                  background: `linear-gradient(90deg, hsl(0 0% ${hexToGrayscale(tag.color)}%), hsl(0 0% ${hexToGrayscale(tag.color) + 15}%))`,
                  boxShadow: `0 0 10px hsl(0 0% ${hexToGrayscale(tag.color)}% / 0.3)`,
                } : {
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
