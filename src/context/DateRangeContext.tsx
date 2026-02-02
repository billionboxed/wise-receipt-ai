import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import { 
  startOfMonth, 
  endOfMonth, 
  subMonths, 
  startOfYear, 
  endOfYear, 
  subYears 
} from 'date-fns';

export type DatePreset = 
  | 'this-month' 
  | 'last-month' 
  | 'last-3-months' 
  | 'last-6-months' 
  | 'this-year' 
  | 'last-year' 
  | 'all-time';

interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
}

interface DateRangeContextType {
  preset: DatePreset;
  setPreset: (preset: DatePreset) => void;
  dateRange: DateRange;
  presetLabel: string;
}

const PRESET_LABELS: Record<DatePreset, string> = {
  'this-month': 'This Month',
  'last-month': 'Last Month',
  'last-3-months': 'Last 3 Months',
  'last-6-months': 'Last 6 Months',
  'this-year': 'This Year',
  'last-year': 'Last Year',
  'all-time': 'All Time',
};

const DateRangeContext = createContext<DateRangeContextType | undefined>(undefined);

const STORAGE_KEY = 'date-range-preset';

function calculateDateRange(preset: DatePreset): DateRange {
  const now = new Date();
  
  switch (preset) {
    case 'this-month':
      return {
        startDate: startOfMonth(now),
        endDate: endOfMonth(now),
      };
    case 'last-month': {
      const lastMonth = subMonths(now, 1);
      return {
        startDate: startOfMonth(lastMonth),
        endDate: endOfMonth(lastMonth),
      };
    }
    case 'last-3-months':
      return {
        startDate: startOfMonth(subMonths(now, 2)),
        endDate: endOfMonth(now),
      };
    case 'last-6-months':
      return {
        startDate: startOfMonth(subMonths(now, 5)),
        endDate: endOfMonth(now),
      };
    case 'this-year':
      return {
        startDate: startOfYear(now),
        endDate: endOfYear(now),
      };
    case 'last-year': {
      const lastYear = subYears(now, 1);
      return {
        startDate: startOfYear(lastYear),
        endDate: endOfYear(lastYear),
      };
    }
    case 'all-time':
    default:
      return {
        startDate: null,
        endDate: null,
      };
  }
}

export function DateRangeProvider({ children }: { children: ReactNode }) {
  const [preset, setPresetState] = useState<DatePreset>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return (stored as DatePreset) || 'all-time';
  });

  const setPreset = useCallback((newPreset: DatePreset) => {
    setPresetState(newPreset);
    localStorage.setItem(STORAGE_KEY, newPreset);
  }, []);

  const dateRange = useMemo(() => calculateDateRange(preset), [preset]);
  const presetLabel = PRESET_LABELS[preset];

  return (
    <DateRangeContext.Provider value={{ preset, setPreset, dateRange, presetLabel }}>
      {children}
    </DateRangeContext.Provider>
  );
}

export function useDateRange() {
  const context = useContext(DateRangeContext);
  if (context === undefined) {
    throw new Error('useDateRange must be used within a DateRangeProvider');
  }
  return context;
}

export { PRESET_LABELS };
