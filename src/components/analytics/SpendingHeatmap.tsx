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

  const { heatmapData, maxAmount, monthLabels, weeks } = useMemo(() => {
    const endDate = new Date();
    // Start from January 1st of current year
    const startDate = startOfWeek(new Date(endDate.getFullYear(), 0, 1));
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

    // Group by weeks
    const weeks: typeof heatmapData[] = [];
    for (let i = 0; i < heatmapData.length; i += 7) {
      weeks.push(heatmapData.slice(i, i + 7));
    }

    // Get month labels - only show every other month on mobile to prevent overlap
    const months: { label: string; weekIndex: number }[] = [];
    let currentMonth = '';
    weeks.forEach((week, weekIndex) => {
      const firstDayOfWeek = week[0];
      if (firstDayOfWeek) {
        const monthLabel = format(parseISO(firstDayOfWeek.date), 'MMM');
        if (monthLabel !== currentMonth) {
          months.push({ label: monthLabel, weekIndex });
          currentMonth = monthLabel;
        }
      }
    });
    
    return { heatmapData, maxAmount, monthLabels: months, weeks };
  }, [transactions]);

  const getIntensityClass = (amount: number): string => {
    if (amount === 0) return 'bg-muted/40';
    const ratio = amount / maxAmount;
    if (ratio < 0.25) return 'bg-chart-5';
    if (ratio < 0.5) return 'bg-chart-4';
    if (ratio < 0.75) return 'bg-chart-2';
    return 'bg-chart-1';
  };

  const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const totalWeeks = weeks.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-lg sm:rounded-xl p-4 sm:p-6 shadow-card border border-border/50"
    >
      <h3 className="text-base sm:text-lg font-semibold mb-4">Spending Heatmap</h3>
      <div className="w-full">
        {/* Month labels - show abbreviated on mobile */}
        <div className="flex mb-2 ml-6">
          {monthLabels.map((month, i) => {
            const nextMonthIndex = monthLabels[i + 1]?.weekIndex ?? totalWeeks;
            const widthPercent = ((nextMonthIndex - month.weekIndex) / totalWeeks) * 100;
            // Only show every other month on small screens
            const showOnMobile = i % 2 === 0;
            return (
              <div
                key={i}
                className="text-[10px] sm:text-xs text-muted-foreground"
                style={{ width: `${widthPercent}%` }}
              >
                <span className={showOnMobile ? '' : 'hidden sm:inline'}>{month.label}</span>
                <span className={showOnMobile ? 'hidden' : 'sm:hidden'}></span>
              </div>
            );
          })}
        </div>
        
        <div className="flex gap-px sm:gap-0.5">
          {/* Day labels */}
          <div className="flex flex-col gap-px sm:gap-0.5 mr-1 shrink-0">
            {dayLabels.map((day, i) => (
              <div key={i} className="h-2 sm:h-3 text-[8px] sm:text-[10px] text-muted-foreground flex items-center justify-end w-4">
                {i % 2 === 1 ? day : ''}
              </div>
            ))}
          </div>
          
          {/* Heatmap grid - responsive sizing */}
          <div className="flex-1 grid gap-px sm:gap-0.5" style={{ gridTemplateColumns: `repeat(${totalWeeks}, minmax(0, 1fr))` }}>
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="flex flex-col gap-px sm:gap-0.5">
                {week.map((day, dayIndex) => (
                  <div
                    key={dayIndex}
                    className={cn(
                      'aspect-square w-full rounded-full cursor-pointer transition-all hover:ring-1 hover:ring-primary/50',
                      getIntensityClass(day.amount)
                    )}
                    title={`${day.displayDate}: ${formatAmount(day.amount)}`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
        
        {/* Legend */}
        <div className="flex items-center justify-center gap-2 mt-4 text-[10px] sm:text-xs text-muted-foreground">
          <span>Less</span>
          <div className="flex gap-0.5">
            <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-muted/40" />
            <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-chart-5" />
            <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-chart-4" />
            <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-chart-2" />
            <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-chart-1" />
          </div>
          <span>More</span>
        </div>
      </div>
    </motion.div>
  );
}
