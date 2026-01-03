import { useMemo } from 'react';
import { useExpense, Transaction, Tag } from '@/context/ExpenseContext';
import { useAnalyticsFilter, AnalyticsFilterType } from '@/context/AnalyticsFilterContext';

interface ExtendedTag extends Tag {
  isProject?: boolean;
  isArchived?: boolean;
}

export function useFilteredTransactions() {
  const { transactions, tags } = useExpense();
  const { filter } = useAnalyticsFilter();

  // Get project tag IDs
  const projectTagIds = useMemo(() => {
    return (tags as ExtendedTag[])
      .filter(tag => tag.isProject)
      .map(tag => tag.id);
  }, [tags]);

  // Filter transactions based on current filter
  const filteredTransactions = useMemo(() => {
    if (filter === 'all') {
      return transactions;
    }

    if (filter === 'projects') {
      // Only transactions with at least one project tag
      return transactions.filter(t => 
        t.tagIds.some(tagId => projectTagIds.includes(tagId))
      );
    }

    // Regular: exclude transactions with any project tag
    return transactions.filter(t => 
      !t.tagIds.some(tagId => projectTagIds.includes(tagId))
    );
  }, [transactions, filter, projectTagIds]);

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
  filter: AnalyticsFilterType
): Transaction[] {
  const projectTagIds = (tags as ExtendedTag[])
    .filter(tag => tag.isProject)
    .map(tag => tag.id);

  if (filter === 'all') {
    return transactions;
  }

  if (filter === 'projects') {
    return transactions.filter(t => 
      t.tagIds.some(tagId => projectTagIds.includes(tagId))
    );
  }

  // Regular: exclude transactions with any project tag
  return transactions.filter(t => 
    !t.tagIds.some(tagId => projectTagIds.includes(tagId))
  );
}
