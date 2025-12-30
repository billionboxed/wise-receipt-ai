import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { FileUpload } from '@/components/upload/FileUpload';
import { TransactionReview } from '@/components/upload/TransactionReview';
import { useExpense } from '@/context/ExpenseContext';
import { ParsedTransaction } from '@/types/expense';

export default function UploadPage() {
  const {
    parsedTransactions,
    setParsedTransactions,
    updateParsedTransaction,
    confirmParsedTransactions,
    skipParsedTransactions,
    clearParsedTransactions,
  } = useExpense();

  const handleTransactionsParsed = (transactions: ParsedTransaction[]) => {
    // Filter out credit transactions - this app is for expense tracking only
    const expenseTransactions = transactions.filter(t => t.type === 'debit');
    setParsedTransactions(expenseTransactions);
  };

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
