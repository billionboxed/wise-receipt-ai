import { motion } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import { useCurrency } from '@/context/CurrencyContext';
import { useRecurringExpenses } from '@/hooks/useRecurringExpenses';
import { useExpense } from '@/context/ExpenseContext';
import { RefreshCcw, AlertCircle, Settings2, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const frequencyLabels: Record<string, string> = {
  weekly: 'Weekly',
  biweekly: 'Every 2 weeks',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
};

const frequencyColors: Record<string, string> = {
  weekly: 'bg-blue-500/20 text-blue-400',
  biweekly: 'bg-purple-500/20 text-purple-400',
  monthly: 'bg-primary/20 text-primary',
  quarterly: 'bg-orange-500/20 text-orange-400',
};

const frequencyMultipliers: Record<string, number> = {
  weekly: 4.33,
  biweekly: 2.17,
  monthly: 1,
  quarterly: 0.33,
};

export function RecurringExpenses() {
  const { formatAmount } = useCurrency();
  const { recurringExpenses, loading } = useRecurringExpenses();
  const { getCategoryById } = useExpense();
  const navigate = useNavigate();

  const activeExpenses = recurringExpenses.filter(e => e.isActive);
  const totalMonthlyRecurring = activeExpenses.reduce(
    (sum, e) => sum + e.amount * frequencyMultipliers[e.frequency],
    0
  );

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-xl p-6 shadow-card border border-border/50"
      >
        <div className="flex items-center gap-2 mb-4">
          <RefreshCcw className="w-5 h-5 text-primary animate-spin" />
          <h3 className="text-lg font-semibold">Recurring Expenses</h3>
        </div>
      </motion.div>
    );
  }

  if (activeExpenses.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-xl p-6 shadow-card border border-border/50"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <RefreshCcw className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">Recurring Expenses</h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/settings/recurring')}
            className="gap-1"
          >
            <Settings2 className="w-4 h-4" />
            Manage
          </Button>
        </div>
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <AlertCircle className="w-10 h-10 mb-2 opacity-50" />
          <p className="text-sm">No recurring expenses set up</p>
          <p className="text-xs">Add subscriptions in settings</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-xl p-6 shadow-card border border-border/50"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <RefreshCcw className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Recurring Expenses</h3>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Est. Monthly</p>
            <p className="font-bold text-destructive">{formatAmount(Math.round(totalMonthlyRecurring))}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/settings/recurring')}
            className="h-8 w-8"
          >
            <Settings2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      <div className="space-y-3 max-h-64 overflow-y-auto">
        {activeExpenses.slice(0, 10).map((expense, index) => {
          const category = expense.categoryId ? getCategoryById(expense.categoryId) : null;
          const monthlyEstimate = expense.amount * frequencyMultipliers[expense.frequency];
          
          return (
            <motion.div
              key={expense.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/30"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{expense.description}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className={cn('text-xs px-2 py-0.5 rounded-full', frequencyColors[expense.frequency])}>
                    {frequencyLabels[expense.frequency]}
                  </span>
                  {category && (
                    <span className="text-xs text-muted-foreground">{category.combined}</span>
                  )}
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Day {expense.dayOfMonth}
                  </span>
                </div>
              </div>
              <div className="text-right ml-3">
                <p className="font-semibold">{formatAmount(Math.round(expense.amount))}</p>
                <p className="text-xs text-muted-foreground">
                  ~{formatAmount(Math.round(monthlyEstimate))}/mo
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
