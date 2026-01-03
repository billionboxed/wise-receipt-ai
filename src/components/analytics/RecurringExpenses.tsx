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
  biweekly: 'Bi-weekly',
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
        className="bg-card rounded-lg sm:rounded-xl p-4 sm:p-6 shadow-card border border-border/50"
      >
        <div className="flex items-center gap-2 mb-4">
          <RefreshCcw className="w-4 h-4 sm:w-5 sm:h-5 text-primary animate-spin" />
          <h3 className="text-base sm:text-lg font-semibold">Recurring Expenses</h3>
        </div>
      </motion.div>
    );
  }

  if (activeExpenses.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-lg sm:rounded-xl p-4 sm:p-6 shadow-card border border-border/50"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <RefreshCcw className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            <h3 className="text-base sm:text-lg font-semibold">Recurring Expenses</h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/settings/recurring')}
            className="gap-1 h-8 px-2"
          >
            <Settings2 className="w-4 h-4" />
            <span className="hidden sm:inline">Manage</span>
          </Button>
        </div>
        <div className="flex flex-col items-center justify-center py-6 sm:py-8 text-muted-foreground">
          <AlertCircle className="w-8 h-8 sm:w-10 sm:h-10 mb-2 opacity-50" />
          <p className="text-xs sm:text-sm">No recurring expenses set up</p>
          <p className="text-xs">Add subscriptions in settings</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-lg sm:rounded-xl p-4 sm:p-6 shadow-card border border-border/50"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <RefreshCcw className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          <h3 className="text-base sm:text-lg font-semibold">Recurring</h3>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Monthly</p>
            <p className="font-bold text-sm sm:text-base text-destructive">{formatAmount(Math.round(totalMonthlyRecurring))}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/settings/recurring')}
            className="h-7 w-7 sm:h-8 sm:w-8"
          >
            <Settings2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </Button>
        </div>
      </div>
      
      <div className="space-y-2 sm:space-y-3 max-h-56 sm:max-h-64 overflow-y-auto">
        {activeExpenses.slice(0, 10).map((expense, index) => {
          const category = expense.categoryId ? getCategoryById(expense.categoryId) : null;
          const monthlyEstimate = expense.amount * frequencyMultipliers[expense.frequency];
          
          return (
            <motion.div
              key={expense.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center justify-between p-2.5 sm:p-3 rounded-lg bg-muted/30 border border-border/30"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{expense.description}</p>
                <div className="flex items-center gap-1.5 sm:gap-2 mt-1 flex-wrap">
                  <span className={cn('text-xs px-1.5 sm:px-2 py-0.5 rounded-full', frequencyColors[expense.frequency])}>
                    {frequencyLabels[expense.frequency]}
                  </span>
                  {category && (
                    <span className="text-xs text-muted-foreground hidden sm:inline">{category.main}</span>
                  )}
                  <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                    <Calendar className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    {expense.dayOfMonth}
                  </span>
                </div>
              </div>
              <div className="text-right ml-2 sm:ml-3">
                <p className="font-semibold text-sm">{formatAmount(Math.round(expense.amount))}</p>
                <p className="text-xs text-muted-foreground hidden sm:block">
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
