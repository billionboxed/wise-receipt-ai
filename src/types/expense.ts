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
  type: 'bank' | 'credit';
  icon?: string;
}

export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'debit' | 'credit';
  categoryId: string;
  accountId: string;
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
