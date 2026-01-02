import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { parseISO, differenceInDays, format } from 'date-fns';
import { useCurrency } from '@/context/CurrencyContext';
import { Transaction } from '@/context/ExpenseContext';
import { RefreshCcw, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RecurringExpensesProps {
  transactions: Transaction[];
}

interface RecurringPattern {
  description: string;
  amount: number;
  frequency: 'weekly' | 'biweekly' | 'monthly' | 'quarterly';
  occurrences: number;
  lastDate: string;
  monthlyEstimate: number;
}

export function RecurringExpenses({ transactions }: RecurringExpensesProps) {
  const { formatAmount } = useCurrency();

  const recurringPatterns = useMemo(() => {
    const expenses = transactions.filter(t => t.status === 'confirmed' && t.type === 'debit');
    
    // Group by description (normalized)
    const grouped: Record<string, Transaction[]> = {};
    expenses.forEach(t => {
      const key = t.description.toLowerCase().trim();
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(t);
    });
    
    const patterns: RecurringPattern[] = [];
    
    Object.entries(grouped).forEach(([desc, txns]) => {
      if (txns.length < 2) return;
      
      // Sort by date
      const sorted = txns.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      // Check for similar amounts (within 10% variance)
      const amounts = sorted.map(t => t.amount);
      const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
      const hasConsistentAmount = amounts.every(a => Math.abs(a - avgAmount) / avgAmount < 0.1);
      
      if (!hasConsistentAmount && txns.length < 3) return;
      
      // Calculate average interval between transactions
      const intervals: number[] = [];
      for (let i = 1; i < sorted.length; i++) {
        intervals.push(differenceInDays(parseISO(sorted[i].date), parseISO(sorted[i - 1].date)));
      }
      
      if (intervals.length === 0) return;
      
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      
      // Determine frequency
      let frequency: RecurringPattern['frequency'] | null = null;
      let monthlyMultiplier = 1;
      
      if (avgInterval >= 5 && avgInterval <= 9) {
        frequency = 'weekly';
        monthlyMultiplier = 4.33;
      } else if (avgInterval >= 12 && avgInterval <= 18) {
        frequency = 'biweekly';
        monthlyMultiplier = 2.17;
      } else if (avgInterval >= 25 && avgInterval <= 35) {
        frequency = 'monthly';
        monthlyMultiplier = 1;
      } else if (avgInterval >= 85 && avgInterval <= 100) {
        frequency = 'quarterly';
        monthlyMultiplier = 0.33;
      }
      
      if (!frequency) return;
      
      patterns.push({
        description: sorted[0].description,
        amount: avgAmount,
        frequency,
        occurrences: sorted.length,
        lastDate: sorted[sorted.length - 1].date,
        monthlyEstimate: avgAmount * monthlyMultiplier,
      });
    });
    
    return patterns.sort((a, b) => b.monthlyEstimate - a.monthlyEstimate);
  }, [transactions]);

  const totalMonthlyRecurring = recurringPatterns.reduce((sum, p) => sum + p.monthlyEstimate, 0);

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

  if (recurringPatterns.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-xl p-6 shadow-card border border-border/50"
      >
        <div className="flex items-center gap-2 mb-4">
          <RefreshCcw className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Recurring Expenses</h3>
        </div>
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <AlertCircle className="w-10 h-10 mb-2 opacity-50" />
          <p className="text-sm">Not enough data to detect patterns</p>
          <p className="text-xs">Keep tracking expenses to find subscriptions</p>
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
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Est. Monthly</p>
          <p className="font-bold text-destructive">{formatAmount(Math.round(totalMonthlyRecurring))}</p>
        </div>
      </div>
      
      <div className="space-y-3 max-h-64 overflow-y-auto">
        {recurringPatterns.slice(0, 10).map((pattern, index) => (
          <motion.div
            key={pattern.description}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/30"
          >
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{pattern.description}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={cn('text-xs px-2 py-0.5 rounded-full', frequencyColors[pattern.frequency])}>
                  {frequencyLabels[pattern.frequency]}
                </span>
                <span className="text-xs text-muted-foreground">
                  {pattern.occurrences} times
                </span>
              </div>
            </div>
            <div className="text-right ml-3">
              <p className="font-semibold">{formatAmount(Math.round(pattern.amount))}</p>
              <p className="text-xs text-muted-foreground">
                Last: {format(parseISO(pattern.lastDate), 'MMM d')}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
