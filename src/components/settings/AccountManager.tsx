import { useState } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Building2, Plus, Trash2, Edit2, Check, X, MessageSquare } from 'lucide-react';
import { useExpense } from '@/context/ExpenseContext';
import { Account } from '@/types/expense';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useSmsImport } from '@/hooks/useSmsImport';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export function AccountManager() {
  const { accounts, addAccount, updateAccount, deleteAccount } = useExpense();
  const { identifiers, addIdentifier, removeIdentifier } = useSmsImport();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<'bank' | 'credit' | 'cash' | 'wallet'>('bank');
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState<'bank' | 'credit' | 'cash' | 'wallet'>('bank');
  const [identifierDrafts, setIdentifierDrafts] = useState<Record<string, string>>({});

  const handleAdd = () => {
    if (!newName.trim()) {
      toast({ title: 'Error', description: 'Account name is required', variant: 'destructive' });
      return;
    }

    addAccount({
      name: newName.trim(),
      type: newType,
    });
    toast({ title: 'Account Added', description: `${newName.trim()} has been added.` });
    setIsAddOpen(false);
    setNewName('');
    setNewType('bank');
  };

  const handleEdit = (account: Account) => {
    if (!editName.trim()) {
      toast({ title: 'Error', description: 'Account name is required', variant: 'destructive' });
      return;
    }

    updateAccount(account.id, { name: editName.trim(), type: editType });
    toast({ title: 'Account Updated' });
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    deleteAccount(id);
    toast({ title: 'Account Deleted' });
  };

  const startEdit = (account: Account) => {
    setEditingId(account.id);
    setEditName(account.name);
    setEditType(account.type as 'bank' | 'credit' | 'cash' | 'wallet');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground">
            Accounts
          </h1>
          <p className="text-muted-foreground mt-1">Manage your bank and credit accounts</p>
        </div>
        <Button onClick={() => setIsAddOpen(true)} className="bg-gradient-to-r from-primary to-accent hover:opacity-90">
          <Plus className="w-4 h-4 mr-2" />
          Add Account
        </Button>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {accounts.map((account, i) => (
          <motion.div
            key={account.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={cn(
              'p-5 rounded-xl border border-border/50 shadow-card group relative',
              account.type === 'credit'
                ? 'bg-gradient-to-r from-primary/5 to-card'
                : 'bg-gradient-to-r from-success/5 to-card'
            )}
          >
            {editingId === account.id ? (
              <div className="flex flex-col gap-3">
                <Input
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="bg-background/50"
                />
                <Select value={editType} onValueChange={(v: 'bank' | 'credit' | 'cash' | 'wallet') => setEditType(v)}>
                  <SelectTrigger className="bg-background/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank">Bank Account</SelectItem>
                    <SelectItem value="credit">Credit Card</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="wallet">Wallet</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleEdit(account)}>
                    <Check className="w-4 h-4 mr-1" /> Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                    <X className="w-4 h-4 mr-1" /> Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-4">
                  <div
                    className={cn(
                      'w-12 h-12 rounded-xl flex items-center justify-center',
                      account.type === 'credit'
                        ? 'bg-primary/10 text-primary'
                        : 'bg-success/10 text-success'
                    )}
                  >
                    {account.type === 'credit' ? (
                      <CreditCard className="w-6 h-6" />
                    ) : (
                      <Building2 className="w-6 h-6" />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{account.name}</p>
                    <p className="text-sm text-muted-foreground capitalize">
                      {account.type === 'credit' ? 'Credit Card' : 'Bank Account'}
                    </p>
                  </div>
                </div>
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => startEdit(account)}>
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(account.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <div className="mt-4 pt-4 border-t border-border/40">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-2">
                    <MessageSquare className="w-3.5 h-3.5" />
                    SMS identifiers
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {identifiers.filter(i => i.accountId === account.id).map(i => (
                      <Badge key={i.id} variant="secondary" className="gap-1 pr-1">
                        {i.identifier}
                        <button
                          type="button"
                          onClick={() => removeIdentifier(i.id)}
                          className="ml-0.5 rounded hover:bg-background/60 p-0.5"
                          aria-label="Remove identifier"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                    {identifiers.filter(i => i.accountId === account.id).length === 0 && (
                      <span className="text-xs text-muted-foreground/70">None yet — SMS for this account won't be tracked.</span>
                    )}
                  </div>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const v = (identifierDrafts[account.id] || '').trim();
                      if (!v) return;
                      addIdentifier(account.id, v);
                      setIdentifierDrafts(d => ({ ...d, [account.id]: '' }));
                    }}
                    className="flex gap-1.5"
                  >
                    <Input
                      value={identifierDrafts[account.id] || ''}
                      onChange={(e) => setIdentifierDrafts(d => ({ ...d, [account.id]: e.target.value }))}
                      placeholder="e.g. 1234, HDFC, ICICI Sal"
                      className="h-8 text-xs bg-background/50"
                    />
                    <Button type="submit" size="sm" variant="outline" className="h-8 px-2">
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                  </form>
                </div>
              </>
            )}
          </motion.div>
        ))}
      </div>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[400px] bg-card border-border/50">
          <DialogHeader>
            <DialogTitle>Add Account</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Account Name</label>
              <Input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="e.g., HDFC Savings, SBI Credit Card"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Account Type</label>
              <Select value={newType} onValueChange={(v: 'bank' | 'credit' | 'cash' | 'wallet') => setNewType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank">Bank Account</SelectItem>
                  <SelectItem value="credit">Credit Card</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="wallet">Wallet</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdd}>Add Account</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
