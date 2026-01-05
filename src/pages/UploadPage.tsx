import { useState, useCallback, useRef } from 'react';
import { Layout } from '@/components/layout/Layout';
import { FileUpload } from '@/components/upload/FileUpload';
import { TransactionReview } from '@/components/upload/TransactionReview';
import { useExpense } from '@/context/ExpenseContext';
import { ParsedTransaction } from '@/types/expense';

export default function UploadPage() {
  const { addTransactions } = useExpense();
  
  // Keep parsed transactions local to this page for performance
  const [parsedTransactions, setParsedTransactions] = useState<ParsedTransaction[]>([]);
  
  // Use ref to access current transactions without causing callback recreation
  const parsedTransactionsRef = useRef(parsedTransactions);
  parsedTransactionsRef.current = parsedTransactions;

  const handleTransactionsParsed = useCallback((newTransactions: ParsedTransaction[]) => {
    // Filter out credit transactions - this app is for expense tracking only
    const expenseTransactions = newTransactions.filter(t => t.type === 'debit');
    setParsedTransactions(expenseTransactions);
  }, []);

  const updateParsedTransaction = useCallback((id: string, updates: Partial<ParsedTransaction>) => {
    setParsedTransactions(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  }, []);

  const confirmParsedTransactions = useCallback(async (ids: string[]) => {
    const toConfirm = parsedTransactionsRef.current.filter(t => ids.includes(t.id));
    const newTxns = toConfirm.map(pt => ({
      date: pt.date,
      description: pt.description,
      amount: pt.amount,
      type: pt.type,
      categoryId: pt.suggestedCategoryId || null,
      accountId: pt.suggestedAccountId || null,
      tagIds: pt.suggestedTagIds || [],
      status: 'confirmed' as const,
      aiSuggested: true,
    }));
    
    await addTransactions(newTxns);
    setParsedTransactions(prev => prev.filter(t => !ids.includes(t.id)));
  }, [addTransactions]);

  const skipParsedTransactions = useCallback((ids: string[]) => {
    setParsedTransactions(prev => prev.filter(t => !ids.includes(t.id)));
  }, []);

  const clearParsedTransactions = useCallback(() => {
    setParsedTransactions([]);
  }, []);

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">
            Upload Transactions
          </h1>
          <p className="text-muted-foreground mt-1">
            Import your bank statements and let AI categorize them
          </p>
        </div>

        {/* File Upload */}
        <FileUpload onTransactionsParsed={handleTransactionsParsed} />

        {/* Transaction Review */}
        {parsedTransactions.length > 0 && (
          <TransactionReview
            transactions={parsedTransactions}
            onUpdate={updateParsedTransaction}
            onConfirm={confirmParsedTransactions}
            onSkip={skipParsedTransactions}
            onClear={clearParsedTransactions}
          />
        )}
      </div>
    </Layout>
  );
}
