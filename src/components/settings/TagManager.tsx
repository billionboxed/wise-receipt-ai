import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tag as TagIcon, Plus, Trash2, Edit2, Check, X, FolderKanban, Archive, ArchiveRestore, ChevronDown, ChevronUp } from 'lucide-react';
import { useExpense } from '@/context/ExpenseContext';
import { Tag } from '@/types/expense';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

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
  const [newIsProject, setNewIsProject] = useState(false);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editIsProject, setEditIsProject] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const activeTags = tags.filter(t => !t.isArchived);
  const archivedTags = tags.filter(t => t.isArchived);

  const handleAdd = () => {
    if (!newName.trim()) {
      toast({ title: 'Error', description: 'Tag name is required', variant: 'destructive' });
      return;
    }

    const newTag: Omit<Tag, 'id'> = {
      name: newName.trim(),
      color: newColor,
      isProject: newIsProject,
      isArchived: false,
    };

    addTag(newTag);
    toast({ title: 'Tag Added', description: `${newTag.name} has been added.` });
    setIsAddOpen(false);
    setNewName('');
    setNewColor(colorOptions[0]);
    setNewIsProject(false);
  };

  const handleEdit = (tag: Tag) => {
    if (!editName.trim()) {
      toast({ title: 'Error', description: 'Tag name is required', variant: 'destructive' });
      return;
    }

    updateTag(tag.id, { name: editName.trim(), color: editColor, isProject: editIsProject });
    toast({ title: 'Tag Updated' });
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    deleteTag(id);
    toast({ title: 'Tag Deleted' });
  };

  const handleArchive = (tag: Tag) => {
    updateTag(tag.id, { isArchived: true });
    toast({ title: 'Tag Archived', description: `${tag.name} has been archived.` });
  };

  const handleUnarchive = (tag: Tag) => {
    updateTag(tag.id, { isArchived: false });
    toast({ title: 'Tag Restored', description: `${tag.name} has been restored.` });
  };

  const startEdit = (tag: Tag) => {
    setEditingId(tag.id);
    setEditName(tag.name);
    setEditColor(tag.color);
    setEditIsProject(tag.isProject || false);
  };

  const renderTag = (tag: Tag, index: number, isArchived = false) => (
    <motion.div
      key={tag.id}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.03 }}
      className="group relative"
    >
      {editingId === tag.id ? (
        <div className="flex flex-col gap-2 p-3 rounded-lg bg-background/50 border border-border/50">
          <div className="flex items-center gap-2">
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
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch
                id={`edit-project-${tag.id}`}
                checked={editIsProject}
                onCheckedChange={setEditIsProject}
              />
              <Label htmlFor={`edit-project-${tag.id}`} className="text-xs text-muted-foreground">
                Project Tag
              </Label>
            </div>
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEdit(tag)}>
                <Check className="w-4 h-4 text-success" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingId(null)}>
                <X className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Badge
            variant="secondary"
            className="text-sm py-2 px-4 cursor-default flex items-center gap-1.5"
            style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
          >
            {tag.isProject && <FolderKanban className="w-3 h-3" />}
            {tag.name}
          </Badge>
          <div className={`${isArchived ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} flex items-center gap-1 transition-opacity`}>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(tag)}>
              <Edit2 className="w-3.5 h-3.5" />
            </Button>
            {isArchived ? (
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-success hover:text-success"
                onClick={() => handleUnarchive(tag)}
              >
                <ArchiveRestore className="w-3.5 h-3.5" />
              </Button>
            ) : (
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-muted-foreground hover:text-muted-foreground"
                onClick={() => handleArchive(tag)}
              >
                <Archive className="w-3.5 h-3.5" />
              </Button>
            )}
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
  );

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

      {/* Active Tags */}
      <div className="glass-card p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <TagIcon className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Active Tags ({activeTags.length})</span>
        </div>
        <div className="flex flex-wrap gap-3">
          {activeTags.map((tag, i) => renderTag(tag, i))}
          {activeTags.length === 0 && (
            <p className="text-sm text-muted-foreground">No active tags. Add one to get started.</p>
          )}
        </div>
      </div>

      {/* Archived Tags */}
      {archivedTags.length > 0 && (
        <Collapsible open={showArchived} onOpenChange={setShowArchived}>
          <div className="glass-card p-4 sm:p-6">
            <CollapsibleTrigger className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <Archive className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">
                  Archived Tags ({archivedTags.length})
                </span>
              </div>
              {showArchived ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-border/50">
                {archivedTags.map((tag, i) => renderTag(tag, i, true))}
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      )}

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
                placeholder="e.g., Vacation 2025, Home Renovation"
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
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
              <div className="space-y-0.5">
                <Label htmlFor="project-tag" className="text-sm font-medium flex items-center gap-2">
                  <FolderKanban className="w-4 h-4 text-accent" />
                  Project Tag
                </Label>
                <p className="text-xs text-muted-foreground">
                  Exclude from regular analytics (vacations, renovations, etc.)
                </p>
              </div>
              <Switch
                id="project-tag"
                checked={newIsProject}
                onCheckedChange={setNewIsProject}
              />
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
