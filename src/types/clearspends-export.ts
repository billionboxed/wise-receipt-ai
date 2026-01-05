// ClearSpends Export Format Types

export interface ClearSpendsExportCategory {
  main: string;
  sub: string;
  combined: string;
}

export interface ClearSpendsExportTag {
  name: string;
  color: string;
  isProject: boolean;
  isArchived: boolean;
}

export interface ClearSpendsExportAccount {
  name: string;
  type: 'bank' | 'credit' | 'cash' | 'wallet';
}

export interface ClearSpendsExportTransaction {
  date: string;
  description: string;
  amount: number;
  type: 'debit' | 'credit';
  categoryMain: string;
  categorySub: string;
  accountName: string | null;
  tagNames: string[];
  status: 'confirmed' | 'pending' | 'skipped';
}

export interface ClearSpendsExport {
  version: string;
  exportType: 'clearspends';
  exportedAt: string;
  data: {
    categories: ClearSpendsExportCategory[];
    tags: ClearSpendsExportTag[];
    accounts: ClearSpendsExportAccount[];
    transactions: ClearSpendsExportTransaction[];
  };
}

// Import analysis result
export interface ImportAnalysis {
  newCategories: ClearSpendsExportCategory[];
  existingCategories: ClearSpendsExportCategory[];
  newTags: ClearSpendsExportTag[];
  existingTags: ClearSpendsExportTag[];
  newAccounts: ClearSpendsExportAccount[];
  existingAccounts: ClearSpendsExportAccount[];
  transactions: ClearSpendsExportTransaction[];
  duplicateCount: number;
}
