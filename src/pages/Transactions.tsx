import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useSearchParams } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { TransactionList } from '@/components/transactions/TransactionList';
import { TransactionDialog, PrefillData } from '@/components/transactions/TransactionDialog';
import { Button } from '@/components/ui/button';
import { Plus, Upload } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Transaction } from '@/types/expense';

export default function Transactions() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTransaction, setEditTransaction] = useState<Transaction | null>(null);
  const [dialogMode, setDialogMode] = useState<'add' | 'edit'>('add');
  const [prefillData, setPrefillData] = useState<PrefillData | null>(null);

  // Read initial category filter from URL
  const initialCategoryFilter = searchParams.get('category') || 'all';
  
  // Clear the URL param after it's been read (to allow manual filter changes)
  useEffect(() => {
    if (searchParams.has('category')) {
      // We don't immediately clear it - let TransactionList read it first
      const timer = setTimeout(() => {
        searchParams.delete('category');
        setSearchParams(searchParams, { replace: true });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAddClick = () => {
    setEditTransaction(null);
    setPrefillData(null);
    setDialogMode('add');
    setDialogOpen(true);
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setEditTransaction(transaction);
    setPrefillData(null);
    setDialogMode('edit');
    setDialogOpen(true);
  };

  const handleCopyTransaction = (transaction: Transaction) => {
    // Open dialog in add mode with prefilled data from the copied transaction
    setEditTransaction(null);
    setPrefillData({
      date: format(new Date(), 'yyyy-MM-dd'), // Use today's date for the copy
      description: transaction.description,
      amount: transaction.amount,
      type: transaction.type,
      categoryId: transaction.categoryId,
      accountId: transaction.accountId,
      tagIds: transaction.tagIds,
    });
    setDialogMode('add');
    setDialogOpen(true);
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground">
              Transactions
            </h1>
            <p className="text-muted-foreground mt-1">
              View and manage all your transactions
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" asChild>
              <Link to="/upload">
                <Upload className="w-4 h-4 mr-2" />
                Upload
              </Link>
            </Button>
            <Button 
              onClick={handleAddClick} 
              className="bg-gradient-to-r from-primary to-accent hover:opacity-90"
              data-tour="add-transaction"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Transaction
            </Button>
          </div>
        </div>

        {/* Transaction List */}
        <TransactionList 
          onEditTransaction={handleEditTransaction} 
          onCopyTransaction={handleCopyTransaction}
          initialCategoryFilter={initialCategoryFilter}
        />

        {/* Transaction Dialog */}
        <TransactionDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          transaction={editTransaction}
          mode={dialogMode}
          prefillData={prefillData}
        />
      </div>
    </Layout>
  );
}
