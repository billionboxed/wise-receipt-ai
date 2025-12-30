export interface Category {
  id: string;
  main: string;
  sub: string;
  combined: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface Account {
  id: string;
  name: string;
  type: 'bank' | 'credit' | 'cash' | 'wallet';
  icon?: string;
}

export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'debit' | 'credit';
  categoryId: string | null;
  accountId: string | null;
  tagIds: string[];
  status: 'confirmed' | 'pending' | 'skipped';
  aiSuggested?: boolean;
}

export interface ParsedTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'debit' | 'credit';
  suggestedCategoryId?: string;
  suggestedAccountId?: string;
  suggestedTagIds?: string[];
  selected: boolean;
  confirmed: boolean;
  isDuplicate?: boolean;
  duplicateOf?: string; // ID of the existing transaction this duplicates
}

export interface SpendingByCategory {
  category: string;
  amount: number;
  percentage: number;
  color: string;
}

export interface MonthlySpending {
  month: string;
  income: number;
  expense: number;
}
