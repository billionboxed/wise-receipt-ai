import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Category, Tag, Account, Transaction, ParsedTransaction } from '@/types/expense';
import { initialCategories, initialTags, initialAccounts, sampleTransactions } from '@/data/initialData';

interface ExpenseContextType {
  categories: Category[];
  tags: Tag[];
  accounts: Account[];
  transactions: Transaction[];
  parsedTransactions: ParsedTransaction[];
  addTransaction: (transaction: Transaction) => void;
  addTransactions: (transactions: Transaction[]) => void;
  updateTransaction: (id: string, updates: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  setParsedTransactions: (transactions: ParsedTransaction[]) => void;
  updateParsedTransaction: (id: string, updates: Partial<ParsedTransaction>) => void;
  confirmParsedTransactions: (ids: string[]) => void;
  skipParsedTransactions: (ids: string[]) => void;
  clearParsedTransactions: () => void;
  addCategory: (category: Category) => void;
  addTag: (tag: Tag) => void;
  addAccount: (account: Account) => void;
  getCategoryById: (id: string) => Category | undefined;
  getTagById: (id: string) => Tag | undefined;
  getAccountById: (id: string) => Account | undefined;
}

const ExpenseContext = createContext<ExpenseContextType | undefined>(undefined);

export function ExpenseProvider({ children }: { children: ReactNode }) {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [tags, setTags] = useState<Tag[]>(initialTags);
  const [accounts, setAccounts] = useState<Account[]>(initialAccounts);
  const [transactions, setTransactions] = useState<Transaction[]>(sampleTransactions);
  const [parsedTransactions, setParsedTransactionsState] = useState<ParsedTransaction[]>([]);

  const addTransaction = (transaction: Transaction) => {
    setTransactions(prev => [transaction, ...prev]);
  };

  const addTransactions = (newTransactions: Transaction[]) => {
    setTransactions(prev => [...newTransactions, ...prev]);
  };

  const updateTransaction = (id: string, updates: Partial<Transaction>) => {
    setTransactions(prev =>
      prev.map(t => (t.id === id ? { ...t, ...updates } : t))
    );
  };

  const deleteTransaction = (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  const setParsedTransactions = (transactions: ParsedTransaction[]) => {
    setParsedTransactionsState(transactions);
  };

  const updateParsedTransaction = (id: string, updates: Partial<ParsedTransaction>) => {
    setParsedTransactionsState(prev =>
      prev.map(t => (t.id === id ? { ...t, ...updates } : t))
    );
  };

  const confirmParsedTransactions = (ids: string[]) => {
    const toConfirm = parsedTransactions.filter(t => ids.includes(t.id));
    const newTransactions: Transaction[] = toConfirm.map(pt => ({
      id: `t_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      date: pt.date,
      description: pt.description,
      amount: pt.amount,
      type: pt.type,
      categoryId: pt.suggestedCategoryId || '23', // Misc as default
      accountId: pt.suggestedAccountId || '1',
      tagIds: pt.suggestedTagIds || [],
      status: 'confirmed' as const,
      aiSuggested: true,
    }));
    
    addTransactions(newTransactions);
    setParsedTransactionsState(prev => prev.filter(t => !ids.includes(t.id)));
  };

  const skipParsedTransactions = (ids: string[]) => {
    setParsedTransactionsState(prev => prev.filter(t => !ids.includes(t.id)));
  };

  const clearParsedTransactions = () => {
    setParsedTransactionsState([]);
  };

  const addCategory = (category: Category) => {
    setCategories(prev => [...prev, category]);
  };

  const addTag = (tag: Tag) => {
    setTags(prev => [...prev, tag]);
  };

  const addAccount = (account: Account) => {
    setAccounts(prev => [...prev, account]);
  };

  const getCategoryById = (id: string) => categories.find(c => c.id === id);
  const getTagById = (id: string) => tags.find(t => t.id === id);
  const getAccountById = (id: string) => accounts.find(a => a.id === id);

  return (
    <ExpenseContext.Provider
      value={{
        categories,
        tags,
        accounts,
        transactions,
        parsedTransactions,
        addTransaction,
        addTransactions,
        updateTransaction,
        deleteTransaction,
        setParsedTransactions,
        updateParsedTransaction,
        confirmParsedTransactions,
        skipParsedTransactions,
        clearParsedTransactions,
        addCategory,
        addTag,
        addAccount,
        getCategoryById,
        getTagById,
        getAccountById,
      }}
    >
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
