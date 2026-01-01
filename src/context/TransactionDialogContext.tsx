import React, { createContext, useContext, useState, ReactNode } from 'react';
import { TransactionDialog, PrefillData } from '@/components/transactions/TransactionDialog';

interface TransactionDialogContextType {
  openAddDialog: (prefill?: PrefillData) => void;
}

const TransactionDialogContext = createContext<TransactionDialogContextType | undefined>(undefined);

export function TransactionDialogProvider({ children }: { children: ReactNode }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [prefillData, setPrefillData] = useState<PrefillData | null>(null);

  const openAddDialog = (prefill?: PrefillData) => {
    setPrefillData(prefill || null);
    setDialogOpen(true);
  };

  return (
    <TransactionDialogContext.Provider value={{ openAddDialog }}>
      {children}
      <TransactionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode="add"
        prefillData={prefillData}
      />
    </TransactionDialogContext.Provider>
  );
}

export function useTransactionDialog() {
  const context = useContext(TransactionDialogContext);
  if (context === undefined) {
    throw new Error('useTransactionDialog must be used within a TransactionDialogProvider');
  }
  return context;
}
