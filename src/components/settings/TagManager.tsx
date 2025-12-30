import { useState } from 'react';
import { motion } from 'framer-motion';
import { Tag as TagIcon, Plus, Trash2, Edit2, Check, X } from 'lucide-react';
import { useExpense } from '@/context/ExpenseContext';
import { Tag } from '@/types/expense';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';

const colorOptions = [
  '#22d3ee', '#a78bfa', '#f472b6', '#fb923c', '#4ade80',
  '#facc15', '#f87171', '#60a5fa', '#c084fc', '#34d399',
];

export function TagManager() {
  const { tags, addTag, updateTag, deleteTag } = useExpense();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(colorOptions[0]);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');

  const handleAdd = () => {
    if (!newName.trim()) {
      toast({ title: 'Error', description: 'Tag name is required', variant: 'destructive' });
      return;
    }

    const newTag: Tag = {
      id: `tag_${Date.now()}`,
      name: newName.trim(),
      color: newColor,
    };

    addTag(newTag);
    toast({ title: 'Tag Added', description: `${newTag.name} has been added.` });
    setIsAddOpen(false);
    setNewName('');
    setNewColor(colorOptions[0]);
  };

  const handleEdit = (tag: Tag) => {
    if (!editName.trim()) {
      toast({ title: 'Error', description: 'Tag name is required', variant: 'destructive' });
      return;
    }

    updateTag(tag.id, { name: editName.trim(), color: editColor });
    toast({ title: 'Tag Updated' });
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    deleteTag(id);
    toast({ title: 'Tag Deleted' });
  };

  const startEdit = (tag: Tag) => {
    setEditingId(tag.id);
    setEditName(tag.name);
    setEditColor(tag.color);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
            Tags
          </h1>
          <p className="text-muted-foreground mt-1">Manage transaction tags</p>
        </div>
        <Button onClick={() => setIsAddOpen(true)} className="bg-gradient-to-r from-primary to-accent hover:opacity-90">
          <Plus className="w-4 h-4 mr-2" />
          Add Tag
        </Button>
      </div>

      <div className="glass-card p-6">
        <div className="flex flex-wrap gap-3">
          {tags.map((tag, i) => (
            <motion.div
              key={tag.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className="group relative"
            >
              {editingId === tag.id ? (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-background/50 border border-border/50">
                  <Input
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="h-8 w-32"
                  />
                  <div className="flex gap-1">
                    {colorOptions.map(color => (
                      <button
                        key={color}
                        className={`w-5 h-5 rounded-full border-2 ${editColor === color ? 'border-white' : 'border-transparent'}`}
                        style={{ backgroundColor: color }}
                        onClick={() => setEditColor(color)}
                      />
                    ))}
                  </div>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEdit(tag)}>
                    <Check className="w-4 h-4 text-success" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingId(null)}>
                    <X className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Badge
                    variant="secondary"
                    className="text-sm py-2 px-4 cursor-default"
                    style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
                  >
                    {tag.name}
                  </Badge>
                  <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(tag)}>
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(tag.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[400px] bg-card border-border/50">
          <DialogHeader>
            <DialogTitle>Add Tag</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tag Name</label>
              <Input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="e.g., Vacation, Shared"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Color</label>
              <div className="flex gap-2 flex-wrap">
                {colorOptions.map(color => (
                  <button
                    key={color}
                    className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${
                      newColor === color ? 'border-white scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setNewColor(color)}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdd}>Add Tag</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
