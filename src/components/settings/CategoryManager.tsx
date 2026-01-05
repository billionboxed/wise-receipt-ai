import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { FolderTree, Plus, Trash2, Edit2, Check, X, AlertTriangle } from 'lucide-react';
import { useExpense } from '@/context/ExpenseContext';
import { Category } from '@/types/expense';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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

export function CategoryManager() {
  const { categories, transactions, addCategory, updateCategory, deleteCategory, updateTransaction } = useExpense();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addSubToMain, setAddSubToMain] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newMain, setNewMain] = useState('');
  const [newSub, setNewSub] = useState('');
  const [editMain, setEditMain] = useState('');
  const [editSub, setEditSub] = useState('');
  const [newSubForExisting, setNewSubForExisting] = useState('');
  
  // Delete confirmation state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [replacementCategoryId, setReplacementCategoryId] = useState<string>('none');

  const mainCategories = [...new Set(categories.map(c => c.main))];

  // Get transactions using a specific category
  const getTransactionsUsingCategory = (categoryId: string) => {
    return transactions.filter(t => t.categoryId === categoryId);
  };

  // Get available replacement categories (excluding the one being deleted)
  const getReplacementCategories = (excludeId: string) => {
    return categories.filter(c => c.id !== excludeId);
  };

  const handleAdd = () => {
    if (!newMain.trim() || !newSub.trim()) {
      toast({ title: 'Error', description: 'Both fields are required', variant: 'destructive' });
      return;
    }

    const newCategory: Category = {
      id: `cat_${Date.now()}`,
      main: newMain.trim(),
      sub: newSub.trim(),
      combined: `${newMain.trim()} > ${newSub.trim()}`,
    };

    addCategory(newCategory);
    toast({ title: 'Category Added', description: `${newCategory.combined} has been added.` });
    setIsAddOpen(false);
    setNewMain('');
    setNewSub('');
  };

  const handleAddSubcategory = () => {
    if (!addSubToMain || !newSubForExisting.trim()) {
      toast({ title: 'Error', description: 'Subcategory name is required', variant: 'destructive' });
      return;
    }

    const newCategory: Category = {
      id: `cat_${Date.now()}`,
      main: addSubToMain,
      sub: newSubForExisting.trim(),
      combined: `${addSubToMain} > ${newSubForExisting.trim()}`,
    };

    addCategory(newCategory);
    toast({ title: 'Subcategory Added', description: `${newCategory.combined} has been added.` });
    setAddSubToMain(null);
    setNewSubForExisting('');
  };

  const handleEdit = (category: Category) => {
    if (!editMain.trim() || !editSub.trim()) {
      toast({ title: 'Error', description: 'Both fields are required', variant: 'destructive' });
      return;
    }

    updateCategory(category.id, {
      main: editMain.trim(),
      sub: editSub.trim(),
      combined: `${editMain.trim()} > ${editSub.trim()}`,
    });
    toast({ title: 'Category Updated' });
    setEditingId(null);
  };

  const initiateDelete = (category: Category) => {
    const affectedTransactions = getTransactionsUsingCategory(category.id);
    setCategoryToDelete(category);
    setReplacementCategoryId('none');
    
    if (affectedTransactions.length > 0) {
      setDeleteConfirmOpen(true);
    } else {
      // No transactions affected, delete directly
      deleteCategory(category.id);
      toast({ title: 'Category Deleted' });
    }
  };

  const handleConfirmDelete = async () => {
    if (!categoryToDelete) return;

    const affectedTransactions = getTransactionsUsingCategory(categoryToDelete.id);
    
    // Update transactions with new category or clear category
    for (const transaction of affectedTransactions) {
      await updateTransaction(transaction.id, {
        categoryId: replacementCategoryId === 'none' ? null : replacementCategoryId,
      });
    }

    // Delete the category
    await deleteCategory(categoryToDelete.id);

    const replacementCategory = categories.find(c => c.id === replacementCategoryId);
    if (replacementCategoryId === 'none') {
      toast({ 
        title: 'Category Deleted', 
        description: `${affectedTransactions.length} transaction${affectedTransactions.length > 1 ? 's are' : ' is'} now uncategorized.` 
      });
    } else {
      toast({ 
        title: 'Category Deleted', 
        description: `${affectedTransactions.length} transaction${affectedTransactions.length > 1 ? 's' : ''} moved to "${replacementCategory?.combined}".` 
      });
    }

    setDeleteConfirmOpen(false);
    setCategoryToDelete(null);
  };

  const startEdit = (category: Category) => {
    setEditingId(category.id);
    setEditMain(category.main);
    setEditSub(category.sub);
  };

  const affectedCount = categoryToDelete ? getTransactionsUsingCategory(categoryToDelete.id).length : 0;
  const replacementOptions = categoryToDelete ? getReplacementCategories(categoryToDelete.id) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground">
            Categories
          </h1>
          <p className="text-muted-foreground mt-1">Manage your expense categories</p>
        </div>
        <Button onClick={() => setIsAddOpen(true)} className="bg-gradient-to-r from-primary to-accent hover:opacity-90">
          <Plus className="w-4 h-4 mr-2" />
          Add Category
        </Button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {mainCategories.map((main, i) => (
          <motion.div
            key={main}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass-card p-4 group"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <FolderTree className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground flex-1">{main}</h3>
              <Button 
                size="icon" 
                variant="ghost" 
                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => {
                  setAddSubToMain(main);
                  setNewSubForExisting('');
                }}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            
            {/* Add subcategory inline form */}
            {addSubToMain === main && (
              <div className="flex items-center gap-2 mb-2 p-2 rounded-lg bg-muted">
                <Input
                  value={newSubForExisting}
                  onChange={e => setNewSubForExisting(e.target.value)}
                  className="h-8 text-sm flex-1"
                  placeholder="New subcategory name"
                  autoFocus
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleAddSubcategory();
                    if (e.key === 'Escape') setAddSubToMain(null);
                  }}
                />
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleAddSubcategory}>
                  <Check className="w-4 h-4 text-success" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setAddSubToMain(null)}>
                  <X className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            )}
            <div className="space-y-2">
              {categories
                .filter(c => c.main === main)
                .map(cat => (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-muted group transition-colors"
                  >
                    {editingId === cat.id ? (
                      <div className="flex-1 flex items-center gap-2">
                        <Input
                          value={editMain}
                          onChange={e => setEditMain(e.target.value)}
                          className="h-8 text-sm"
                          placeholder="Main"
                        />
                        <Input
                          value={editSub}
                          onChange={e => setEditSub(e.target.value)}
                          className="h-8 text-sm"
                          placeholder="Sub"
                        />
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleEdit(cat)}>
                          <Check className="w-4 h-4 text-success" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingId(null)}>
                          <X className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <span className="text-sm text-muted-foreground pl-2">{cat.sub}</span>
                        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(cat)}>
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => initiateDelete(cat)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Add Category Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[400px] bg-card border-border/50">
          <DialogHeader>
            <DialogTitle>Add Category</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Main Category</label>
              <Input
                value={newMain}
                onChange={e => setNewMain(e.target.value)}
                placeholder="e.g., Food, Transportation"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Sub Category</label>
              <Input
                value={newSub}
                onChange={e => setNewSub(e.target.value)}
                placeholder="e.g., Groceries, Fuel"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdd}>Add Category</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-[450px] bg-card border-border/50">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-warning" />
              Delete Category
            </DialogTitle>
            <DialogDescription>
              This category is used by <strong>{affectedCount} transaction{affectedCount > 1 ? 's' : ''}</strong>. 
              What would you like to do with them?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <p className="text-sm font-medium mb-1">Category to delete:</p>
              <p className="text-sm text-muted-foreground">{categoryToDelete?.combined}</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Reassign transactions to:</label>
              <Select value={replacementCategoryId} onValueChange={setReplacementCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select replacement category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    <span className="text-muted-foreground">Leave uncategorized</span>
                  </SelectItem>
                  {replacementOptions.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.combined}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              Delete Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
