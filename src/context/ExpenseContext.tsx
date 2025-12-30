import React, { createContext, useContext, ReactNode } from 'react';
import { useExpenseData, Category, Tag, Account, Transaction, ParsedTransaction } from '@/hooks/useExpenseData';

interface ExpenseContextType {
  categories: Category[];
  tags: Tag[];
  accounts: Account[];
  transactions: Transaction[];
  parsedTransactions: ParsedTransaction[];
  loading: boolean;
  addTransaction: (transaction: Omit<Transaction, 'id'>) => Promise<void>;
  addTransactions: (transactions: Omit<Transaction, 'id'>[]) => Promise<void>;
  updateTransaction: (id: string, updates: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  setParsedTransactions: (transactions: ParsedTransaction[]) => void;
  updateParsedTransaction: (id: string, updates: Partial<ParsedTransaction>) => void;
  confirmParsedTransactions: (ids: string[]) => Promise<void>;
  skipParsedTransactions: (ids: string[]) => void;
  clearParsedTransactions: () => void;
  addCategory: (category: Omit<Category, 'id'>) => Promise<void>;
  updateCategory: (id: string, updates: Partial<Category>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  addTag: (tag: Omit<Tag, 'id'>) => Promise<void>;
  updateTag: (id: string, updates: Partial<Tag>) => Promise<void>;
  deleteTag: (id: string) => Promise<void>;
  addAccount: (account: Omit<Account, 'id'>) => Promise<void>;
  updateAccount: (id: string, updates: Partial<Account>) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  getCategoryById: (id: string) => Category | undefined;
  getTagById: (id: string) => Tag | undefined;
  getAccountById: (id: string) => Account | undefined;
  refetch: () => Promise<void>;
}

const ExpenseContext = createContext<ExpenseContextType | undefined>(undefined);

export function ExpenseProvider({ children }: { children: ReactNode }) {
  const expenseData = useExpenseData();

  return (
    <ExpenseContext.Provider value={expenseData}>
      {children}
    </ExpenseContext.Provider>
  );
}

export function useExpense() {
  const context = useContext(ExpenseContext);
  if (context === undefined) {
    throw new Error('useExpense must be used within an ExpenseProvider');
  }
  return context;
}

// Re-export types for convenience
export type { Category, Tag, Account, Transaction, ParsedTransaction };
