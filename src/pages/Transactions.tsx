import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { TransactionList } from '@/components/transactions/TransactionList';
import { TransactionDialog } from '@/components/transactions/TransactionDialog';
import { Button } from '@/components/ui/button';
import { Plus, Upload } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Transaction } from '@/types/expense';

export default function Transactions() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTransaction, setEditTransaction] = useState<Transaction | null>(null);
  const [dialogMode, setDialogMode] = useState<'add' | 'edit'>('add');

  const handleAddClick = () => {
    setEditTransaction(null);
    setDialogMode('add');
    setDialogOpen(true);
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setEditTransaction(transaction);
    setDialogMode('edit');
    setDialogOpen(true);
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
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
            <Button onClick={handleAddClick} className="bg-gradient-to-r from-primary to-accent hover:opacity-90">
              <Plus className="w-4 h-4 mr-2" />
              Add Transaction
            </Button>
          </div>
        </div>

        {/* Transaction List */}
        <TransactionList onEditTransaction={handleEditTransaction} />

        {/* Transaction Dialog */}
        <TransactionDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          transaction={editTransaction}
          mode={dialogMode}
        />
      </div>
    </Layout>
  );
}
