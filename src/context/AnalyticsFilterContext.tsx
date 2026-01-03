import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';

export type AnalyticsFilterType = 'regular' | 'all' | 'projects';

interface AnalyticsFilterContextType {
  filter: AnalyticsFilterType;
  setFilter: (filter: AnalyticsFilterType) => void;
}

const AnalyticsFilterContext = createContext<AnalyticsFilterContextType | undefined>(undefined);

const STORAGE_KEY = 'analytics-filter-preference';

export function AnalyticsFilterProvider({ children }: { children: ReactNode }) {
  const [filter, setFilterState] = useState<AnalyticsFilterType>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return (stored as AnalyticsFilterType) || 'regular';
  });

  const setFilter = useCallback((newFilter: AnalyticsFilterType) => {
    setFilterState(newFilter);
    localStorage.setItem(STORAGE_KEY, newFilter);
  }, []);

  return (
    <AnalyticsFilterContext.Provider value={{ filter, setFilter }}>
      {children}
    </AnalyticsFilterContext.Provider>
  );
}

export function useAnalyticsFilter() {
  const context = useContext(AnalyticsFilterContext);
  if (context === undefined) {
    throw new Error('useAnalyticsFilter must be used within an AnalyticsFilterProvider');
  }
  return context;
}
