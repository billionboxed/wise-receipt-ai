import { useState } from 'react';
import { motion } from 'framer-motion';
import { FolderTree, Plus, Trash2, Edit2, Check, X } from 'lucide-react';
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
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export function CategoryManager() {
  const { categories, addCategory, updateCategory, deleteCategory } = useExpense();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newMain, setNewMain] = useState('');
  const [newSub, setNewSub] = useState('');
  const [editMain, setEditMain] = useState('');
  const [editSub, setEditSub] = useState('');

  const mainCategories = [...new Set(categories.map(c => c.main))];

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

  const handleDelete = (id: string) => {
    deleteCategory(id);
    toast({ title: 'Category Deleted' });
  };

  const startEdit = (category: Category) => {
    setEditingId(category.id);
    setEditMain(category.main);
    setEditSub(category.sub);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
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
            className="glass-card p-4"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <FolderTree className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground">{main}</h3>
            </div>
            <div className="space-y-2">
              {categories
                .filter(c => c.main === main)
                .map(cat => (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 group transition-colors"
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
                            onClick={() => handleDelete(cat.id)}
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
    </div>
  );
}
