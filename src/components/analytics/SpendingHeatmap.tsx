import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { format, parseISO, subMonths, eachDayOfInterval, startOfMonth, endOfMonth, getDay, startOfWeek, endOfWeek } from 'date-fns';
import { useCurrency } from '@/context/CurrencyContext';
import { Transaction } from '@/context/ExpenseContext';
import { cn } from '@/lib/utils';

interface SpendingHeatmapProps {
  transactions: Transaction[];
}

export function SpendingHeatmap({ transactions }: SpendingHeatmapProps) {
  const { formatAmount } = useCurrency();

  const { heatmapData, maxAmount, monthLabels } = useMemo(() => {
    const endDate = new Date();
    const startDate = startOfWeek(startOfMonth(subMonths(endDate, 5)));
    const adjustedEndDate = endOfWeek(endOfMonth(endDate));
    
    const days = eachDayOfInterval({ start: startDate, end: adjustedEndDate });
    
    const dailyTotals: Record<string, number> = {};
    
    transactions
      .filter(t => t.status === 'confirmed' && t.type === 'debit')
      .forEach(t => {
        const dateKey = t.date;
        dailyTotals[dateKey] = (dailyTotals[dateKey] || 0) + t.amount;
      });
    
    const maxAmount = Math.max(...Object.values(dailyTotals), 1);
    
    const heatmapData = days.map(day => ({
      date: format(day, 'yyyy-MM-dd'),
      displayDate: format(day, 'MMM d'),
      amount: dailyTotals[format(day, 'yyyy-MM-dd')] || 0,
      dayOfWeek: getDay(day),
    }));

    // Get month labels
    const months: { label: string; startIndex: number }[] = [];
    let currentMonth = '';
    heatmapData.forEach((day, index) => {
      const monthLabel = format(parseISO(day.date), 'MMM');
      if (monthLabel !== currentMonth && day.dayOfWeek === 0) {
        months.push({ label: monthLabel, startIndex: Math.floor(index / 7) });
        currentMonth = monthLabel;
      }
    });
    
    return { heatmapData, maxAmount, monthLabels: months };
  }, [transactions]);

  const getIntensityClass = (amount: number): string => {
    if (amount === 0) return 'bg-muted/30';
    const ratio = amount / maxAmount;
    if (ratio < 0.25) return 'bg-emerald-500/30';
    if (ratio < 0.5) return 'bg-yellow-500/50';
    if (ratio < 0.75) return 'bg-orange-500/60';
    return 'bg-destructive/80';
  };

  // Group by weeks
  const weeks: typeof heatmapData[] = [];
  for (let i = 0; i < heatmapData.length; i += 7) {
    weeks.push(heatmapData.slice(i, i + 7));
  }

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-xl p-6 shadow-card border border-border/50"
    >
      <h3 className="text-lg font-semibold mb-4">Spending Heatmap</h3>
      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          {/* Month labels */}
          <div className="flex mb-2 ml-10">
            {monthLabels.map((month, i) => (
              <div
                key={i}
                className="text-xs text-muted-foreground"
                style={{ 
                  position: 'absolute',
                  left: `${40 + month.startIndex * 14}px`
                }}
              >
                {month.label}
              </div>
            ))}
          </div>
          
          <div className="flex gap-[2px] mt-6">
            {/* Day labels */}
            <div className="flex flex-col gap-[2px] mr-2">
              {dayLabels.map((day, i) => (
                <div key={i} className="h-3 text-[10px] text-muted-foreground flex items-center">
                  {i % 2 === 1 ? day : ''}
                </div>
              ))}
            </div>
            
            {/* Heatmap grid */}
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="flex flex-col gap-[2px]">
                {week.map((day, dayIndex) => (
                  <div
                    key={dayIndex}
                    className={cn(
                      'w-3 h-3 rounded-sm cursor-pointer transition-all hover:ring-2 hover:ring-primary/50',
                      getIntensityClass(day.amount)
                    )}
                    title={`${day.displayDate}: ${formatAmount(day.amount)}`}
                  />
                ))}
              </div>
            ))}
          </div>
          
          {/* Legend */}
          <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground">
            <span>Less</span>
            <div className="flex gap-1">
              <div className="w-3 h-3 rounded-sm bg-muted/30" />
              <div className="w-3 h-3 rounded-sm bg-emerald-500/30" />
              <div className="w-3 h-3 rounded-sm bg-yellow-500/50" />
              <div className="w-3 h-3 rounded-sm bg-orange-500/60" />
              <div className="w-3 h-3 rounded-sm bg-destructive/80" />
            </div>
            <span>More</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
