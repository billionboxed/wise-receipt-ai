import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Edit2, RefreshCcw, Calendar, Pause, Play, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useRecurringExpenses, RecurringExpense } from '@/hooks/useRecurringExpenses';
import { useExpense } from '@/context/ExpenseContext';
import { useCurrency } from '@/context/CurrencyContext';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const frequencyOptions = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every 2 weeks' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
];

const frequencyColors: Record<string, string> = {
  weekly: 'bg-blue-500/20 text-blue-400',
  biweekly: 'bg-purple-500/20 text-purple-400',
  monthly: 'bg-primary/20 text-primary',
  quarterly: 'bg-orange-500/20 text-orange-400',
};

export function RecurringExpenseManager() {
  const { recurringExpenses, loading, addRecurringExpense, updateRecurringExpense, deleteRecurringExpense } = useRecurringExpenses();
  const { categories, accounts, tags } = useExpense();
  const { formatAmount } = useCurrency();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<RecurringExpense | null>(null);
  
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    frequency: 'monthly' as RecurringExpense['frequency'],
    categoryId: '',
    accountId: '',
    tagIds: [] as string[],
    dayOfMonth: 1,
  });

  const resetForm = () => {
    setFormData({
      description: '',
      amount: '',
      frequency: 'monthly',
      categoryId: '',
      accountId: '',
      tagIds: [],
      dayOfMonth: 1,
    });
    setEditingExpense(null);
  };

  const openAddDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (expense: RecurringExpense) => {
    setEditingExpense(expense);
    setFormData({
      description: expense.description,
      amount: expense.amount.toString(),
      frequency: expense.frequency,
      categoryId: expense.categoryId || '',
      accountId: expense.accountId || '',
      tagIds: expense.tagIds || [],
      dayOfMonth: expense.dayOfMonth,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.description || !formData.amount) return;

    const expenseData = {
      description: formData.description,
      amount: parseFloat(formData.amount),
      frequency: formData.frequency,
      categoryId: formData.categoryId || null,
      accountId: formData.accountId || null,
      tagIds: formData.tagIds,
      dayOfMonth: formData.dayOfMonth,
      isActive: true,
    };

    if (editingExpense) {
      await updateRecurringExpense(editingExpense.id, expenseData);
    } else {
      await addRecurringExpense(expenseData);
    }

    setIsDialogOpen(false);
    resetForm();
  };

  const toggleActive = async (expense: RecurringExpense) => {
    await updateRecurringExpense(expense.id, { isActive: !expense.isActive });
  };

  const getMonthlyEstimate = (expense: RecurringExpense) => {
    const multipliers: Record<string, number> = {
      weekly: 4.33,
      biweekly: 2.17,
      monthly: 1,
      quarterly: 0.33,
    };
    return expense.amount * multipliers[expense.frequency];
  };

  const totalMonthlyEstimate = recurringExpenses
    .filter(e => e.isActive)
    .reduce((sum, e) => sum + getMonthlyEstimate(e), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCcw className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      {recurringExpenses.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl glass-card border border-white/5"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Estimated Monthly Total</p>
              <p className="text-2xl font-bold text-destructive">{formatAmount(Math.round(totalMonthlyEstimate))}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Active Subscriptions</p>
              <p className="text-2xl font-bold">{recurringExpenses.filter(e => e.isActive).length}</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Add Button */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button onClick={openAddDialog} className="w-full gap-2">
            <Plus className="w-4 h-4" />
            Add Recurring Expense
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingExpense ? 'Edit Recurring Expense' : 'Add Recurring Expense'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="e.g., Netflix, Gym Membership"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label>Frequency</Label>
              <Select
                value={formData.frequency}
                onValueChange={(value) => setFormData({ ...formData, frequency: value as RecurringExpense['frequency'] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {frequencyOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Day of Month</Label>
              <Input
                type="number"
                min={1}
                max={28}
                value={formData.dayOfMonth}
                onChange={(e) => setFormData({ ...formData, dayOfMonth: parseInt(e.target.value) || 1 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Category (optional)</Label>
              <Select
                value={formData.categoryId || 'none'}
                onValueChange={(value) => setFormData({ ...formData, categoryId: value === 'none' ? '' : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.combined}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Account (optional)</Label>
              <Select
                value={formData.accountId || 'none'}
                onValueChange={(value) => setFormData({ ...formData, accountId: value === 'none' ? '' : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {accounts.map(acc => (
                    <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tags (optional)</Label>
              <Select
                value=""
                onValueChange={(value) => {
                  if (value && !formData.tagIds.includes(value)) {
                    setFormData({ ...formData, tagIds: [...formData.tagIds, value] });
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Add tags" />
                </SelectTrigger>
                <SelectContent>
                  {tags.filter(tag => !formData.tagIds.includes(tag.id)).map(tag => (
                    <SelectItem key={tag.id} value={tag.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: tag.color }} />
                        {tag.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formData.tagIds.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {formData.tagIds.map(tagId => {
                    const tag = tags.find(t => t.id === tagId);
                    if (!tag) return null;
                    return (
                      <Badge
                        key={tag.id}
                        variant="secondary"
                        className="flex items-center gap-1 pr-1"
                        style={{ backgroundColor: `${tag.color}20`, color: tag.color, borderColor: tag.color }}
                      >
                        {tag.name}
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, tagIds: formData.tagIds.filter(id => id !== tagId) })}
                          className="ml-0.5 hover:bg-white/20 rounded-full p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleSubmit} disabled={!formData.description || !formData.amount}>
              {editingExpense ? 'Update' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Expense List */}
      <AnimatePresence>
        {recurringExpenses.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12 text-muted-foreground"
          >
            <RefreshCcw className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>No recurring expenses yet</p>
            <p className="text-sm">Add subscriptions and bills to track them</p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {recurringExpenses.map((expense, index) => (
              <motion.div
                key={expense.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  'p-4 rounded-xl glass-card border border-white/5',
                  !expense.isActive && 'opacity-50'
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{expense.description}</p>
                      {!expense.isActive && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Paused</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={cn('text-xs px-2 py-0.5 rounded-full', frequencyColors[expense.frequency])}>
                        {frequencyOptions.find(f => f.value === expense.frequency)?.label}
                      </span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Day {expense.dayOfMonth}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right mr-2">
                      <p className="font-semibold">{formatAmount(expense.amount)}</p>
                      <p className="text-xs text-muted-foreground">~{formatAmount(Math.round(getMonthlyEstimate(expense)))}/mo</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleActive(expense)}
                      className="h-8 w-8"
                    >
                      {expense.isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(expense)}
                      className="h-8 w-8"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Recurring Expense?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will remove "{expense.description}" from recurring expenses. Previously added transactions will NOT be deleted.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteRecurringExpense(expense.id)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}