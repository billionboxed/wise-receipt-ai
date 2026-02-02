import { useMemo } from 'react';
import { useExpense, Transaction, Tag } from '@/context/ExpenseContext';
import { useAnalyticsFilter, AnalyticsFilterType } from '@/context/AnalyticsFilterContext';
import { useDateRange } from '@/context/DateRangeContext';
import { isWithinInterval, parseISO } from 'date-fns';

interface ExtendedTag extends Tag {
  isProject?: boolean;
  isArchived?: boolean;
}

function isWithinDateRange(
  transactionDate: string,
  startDate: Date | null,
  endDate: Date | null
): boolean {
  if (!startDate || !endDate) return true; // All time - no filtering
  
  const date = parseISO(transactionDate);
  return isWithinInterval(date, { start: startDate, end: endDate });
}

export function useFilteredTransactions() {
  const { transactions, tags } = useExpense();
  const { filter } = useAnalyticsFilter();
  const { dateRange } = useDateRange();

  // Get project tag IDs
  const projectTagIds = useMemo(() => {
    return (tags as ExtendedTag[])
      .filter(tag => tag.isProject)
      .map(tag => tag.id);
  }, [tags]);

  // Filter transactions based on current filter and date range
  const filteredTransactions = useMemo(() => {
    let result = transactions;

    // Apply project/regular filter
    if (filter === 'projects') {
      result = result.filter(t => 
        t.tagIds.some(tagId => projectTagIds.includes(tagId))
      );
    } else if (filter === 'regular') {
      result = result.filter(t => 
        !t.tagIds.some(tagId => projectTagIds.includes(tagId))
      );
    }
    // 'all' - no project filtering

    // Apply date range filter
    result = result.filter(t => 
      isWithinDateRange(t.date, dateRange.startDate, dateRange.endDate)
    );

    return result;
  }, [transactions, filter, projectTagIds, dateRange]);

  return {
    filteredTransactions,
    projectTagIds,
    filter,
  };
}

// Helper hook for components that receive transactions as props
export function filterTransactionsByType(
  transactions: Transaction[],
  tags: Tag[],
  filter: AnalyticsFilterType,
  dateRange?: { startDate: Date | null; endDate: Date | null }
): Transaction[] {
  const projectTagIds = (tags as ExtendedTag[])
    .filter(tag => tag.isProject)
    .map(tag => tag.id);

  let result = transactions;

  // Apply project/regular filter
  if (filter === 'projects') {
    result = result.filter(t => 
      t.tagIds.some(tagId => projectTagIds.includes(tagId))
    );
  } else if (filter === 'regular') {
    result = result.filter(t => 
      !t.tagIds.some(tagId => projectTagIds.includes(tagId))
    );
  }

  // Apply date range filter if provided
  if (dateRange) {
    result = result.filter(t => 
      isWithinDateRange(t.date, dateRange.startDate, dateRange.endDate)
    );
  }

  return result;
}
