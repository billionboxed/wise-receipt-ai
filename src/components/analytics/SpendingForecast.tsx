import { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, subMonths, getDaysInMonth, getDate, isSameMonth } from 'date-fns';
import { useCurrency } from '@/context/CurrencyContext';
import { Transaction } from '@/context/ExpenseContext';
import { TrendingUp, Loader2, Brain } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface SpendingForecastProps {
  transactions: Transaction[];
}

interface ForecastData {
  day: number;
  actual: number | null;
  projected: number | null;
  historical: number | null;
}

export function SpendingForecast({ transactions }: SpendingForecastProps) {
  const { formatAmount, currency } = useCurrency();
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [loadingInsight, setLoadingInsight] = useState(false);

  const { forecastData, currentTotal, projectedTotal, historicalAvg, runRateProjection, confidence } = useMemo(() => {
    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    const currentMonthEnd = endOfMonth(now);
    const daysInMonth = getDaysInMonth(now);
    const currentDay = getDate(now);
    
    // Get current month expenses
    const currentMonthExpenses = transactions.filter(t => 
      t.status === 'confirmed' && 
      t.type === 'debit' && 
      isSameMonth(parseISO(t.date), now)
    );
    
    // Calculate daily cumulative for current month
    const dailyCumulative: Record<number, number> = {};
    let cumulative = 0;
    
    const sortedExpenses = [...currentMonthExpenses].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    sortedExpenses.forEach(t => {
      const day = getDate(parseISO(t.date));
      cumulative += t.amount;
      dailyCumulative[day] = cumulative;
    });
    
    // Fill gaps
    let lastValue = 0;
    for (let d = 1; d <= currentDay; d++) {
      if (dailyCumulative[d] !== undefined) {
        lastValue = dailyCumulative[d];
      } else {
        dailyCumulative[d] = lastValue;
      }
    }
    
    const currentTotal = dailyCumulative[currentDay] || 0;
    
    // Calculate historical averages (last 3 months)
    const historicalMonths = [1, 2, 3].map(i => subMonths(now, i));
    const monthlyTotals = historicalMonths.map(month => {
      return transactions
        .filter(t => 
          t.status === 'confirmed' && 
          t.type === 'debit' && 
          isSameMonth(parseISO(t.date), month)
        )
        .reduce((sum, t) => sum + t.amount, 0);
    }).filter(t => t > 0);
    
    const historicalAvg = monthlyTotals.length > 0 
      ? monthlyTotals.reduce((a, b) => a + b, 0) / monthlyTotals.length 
      : 0;
    
    // Run-rate projection
    const dailyRate = currentDay > 0 ? currentTotal / currentDay : 0;
    const runRateProjection = dailyRate * daysInMonth;
    
    // Hybrid projection: weight historical (40%) + run-rate (60%)
    const hybridProjection = historicalAvg > 0 
      ? (historicalAvg * 0.4) + (runRateProjection * 0.6)
      : runRateProjection;
    
    // Calculate confidence based on data availability
    const confidence = Math.min(
      100,
      (monthlyTotals.length * 25) + (currentDay / daysInMonth * 50)
    );
    
    // Build forecast data
    const forecastData: ForecastData[] = [];
    
    for (let d = 1; d <= daysInMonth; d++) {
      if (d <= currentDay) {
        forecastData.push({
          day: d,
          actual: dailyCumulative[d] || 0,
          projected: null,
          historical: historicalAvg > 0 ? (historicalAvg / daysInMonth) * d : null,
        });
      } else {
        // Project future days
        const projectedValue = currentTotal + (dailyRate * (d - currentDay));
        forecastData.push({
          day: d,
          actual: null,
          projected: projectedValue,
          historical: historicalAvg > 0 ? (historicalAvg / daysInMonth) * d : null,
        });
      }
    }
    
    return {
      forecastData,
      currentTotal,
      projectedTotal: hybridProjection,
      historicalAvg,
      runRateProjection,
      confidence: Math.round(confidence),
    };
  }, [transactions]);

  // Fetch AI insight
  useEffect(() => {
    const fetchInsight = async () => {
      if (currentTotal === 0) return;
      
      setLoadingInsight(true);
      try {
        const { data, error } = await supabase.functions.invoke('spending-forecast', {
          body: {
            currentTotal,
            projectedTotal,
            historicalAvg,
            daysElapsed: getDate(new Date()),
            daysInMonth: getDaysInMonth(new Date()),
            currency: currency.code,
          },
        });
        
        if (!error && data?.insight) {
          setAiInsight(data.insight);
        }
      } catch (err) {
        console.error('Failed to fetch forecast insight:', err);
      } finally {
        setLoadingInsight(false);
      }
    };
    
    fetchInsight();
  }, [currentTotal, projectedTotal, historicalAvg, currency.code]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card px-4 py-3 rounded-lg shadow-lg border border-border">
          <p className="font-semibold text-foreground mb-1">Day {label}</p>
          {payload.map((entry: any, index: number) => (
            entry.value !== null && (
              <p key={index} className="text-sm" style={{ color: entry.color }}>
                {entry.name}: {formatAmount(Math.round(entry.value))}
              </p>
            )
          ))}
        </div>
      );
    }
    return null;
  };

  const percentChange = historicalAvg > 0 
    ? ((projectedTotal - historicalAvg) / historicalAvg * 100)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-lg sm:rounded-xl p-4 sm:p-6 shadow-card border border-border/50 lg:col-span-2"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          <h3 className="text-base sm:text-lg font-semibold">Monthly Forecast</h3>
        </div>
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Projected</p>
            <p className="font-bold text-base sm:text-lg">{formatAmount(Math.round(projectedTotal))}</p>
          </div>
          {historicalAvg > 0 && (
            <div className={`text-xs sm:text-sm px-2 py-1 rounded ${percentChange > 0 ? 'bg-destructive/20 text-destructive' : 'bg-emerald-500/20 text-emerald-400'}`}>
              {percentChange > 0 ? '+' : ''}{percentChange.toFixed(0)}%
            </div>
          )}
        </div>
      </div>
      
      <div className="h-48 sm:h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={forecastData}>
            <defs>
              <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="projectedGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="day" tick={{ fontSize: 9 }} />
            <YAxis tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} tick={{ fontSize: 10 }} width={35} />
            <Tooltip content={<CustomTooltip />} />
            {historicalAvg > 0 && (
              <ReferenceLine 
                y={historicalAvg} 
                stroke="hsl(var(--muted-foreground))" 
                strokeDasharray="5 5"
                label={{ value: 'Avg', position: 'right', fill: 'hsl(var(--muted-foreground))', fontSize: 9 }}
              />
            )}
            <Area
              type="monotone"
              dataKey="actual"
              name="Actual"
              stroke="hsl(var(--primary))"
              fill="url(#actualGradient)"
              strokeWidth={2}
              connectNulls={false}
            />
            <Area
              type="monotone"
              dataKey="projected"
              name="Projected"
              stroke="hsl(var(--destructive))"
              fill="url(#projectedGradient)"
              strokeWidth={2}
              strokeDasharray="5 5"
              connectNulls={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      
      {/* AI Insight */}
      {(loadingInsight || aiInsight) && (
        <div className="mt-4 p-2.5 sm:p-3 rounded-lg bg-muted/30 border border-border/30">
          <div className="flex items-center gap-2 mb-1">
            <Brain className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
            <span className="text-xs font-medium text-muted-foreground">AI Insight</span>
          </div>
          {loadingInsight ? (
            <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin" />
              Analyzing...
            </div>
          ) : (
            <p className="text-xs sm:text-sm">{aiInsight}</p>
          )}
        </div>
      )}
      
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4 mt-4 pt-4 border-t border-border/30">
        <div>
          <p className="text-xs text-muted-foreground">Current</p>
          <p className="font-semibold text-sm sm:text-base">{formatAmount(Math.round(currentTotal))}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Run Rate</p>
          <p className="font-semibold text-sm sm:text-base">{formatAmount(Math.round(runRateProjection))}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Confidence</p>
          <p className="font-semibold text-sm sm:text-base">{confidence}%</p>
        </div>
      </div>
    </motion.div>
  );
}
