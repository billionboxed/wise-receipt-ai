import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tag as TagIcon, Plus, Trash2, Edit2, Check, X, FolderKanban, Archive, ArchiveRestore, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { useExpense } from '@/context/ExpenseContext';
import { Tag } from '@/types/expense';
import { useTheme } from 'next-themes';
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

const colorOptions = [
  '#22d3ee', '#a78bfa', '#f472b6', '#fb923c', '#4ade80',
  '#facc15', '#f87171', '#60a5fa', '#c084fc', '#34d399',
];

// Convert hex color to grayscale value (0-100)
function hexToGrayscale(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  // Use relative luminance formula
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  // Map to a range between 75-95% to get visible shades
  return 75 + luminance * 20;
}

function getMonochromeStyle(color: string) {
  const lightness = hexToGrayscale(color);
  return {
    backgroundColor: `hsl(0 0% ${lightness}%)`,
    color: 'hsl(0 0% 20%)',
    borderColor: `hsl(0 0% ${lightness - 10}%)`,
  };
}

export function TagManager() {
  const { tags, transactions, addTag, updateTag, deleteTag, updateTransaction } = useExpense();
  const { theme } = useTheme();
  const isMonochrome = theme === 'mono';
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(colorOptions[0]);
  const [newIsProject, setNewIsProject] = useState(false);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editIsProject, setEditIsProject] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  // Delete confirmation state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [tagToDelete, setTagToDelete] = useState<Tag | null>(null);
  const [replacementTagId, setReplacementTagId] = useState<string>('remove');

  // Archive confirmation state
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);
  const [tagToArchive, setTagToArchive] = useState<Tag | null>(null);

  const activeTags = tags.filter(t => !t.isArchived);
  const archivedTags = tags.filter(t => t.isArchived);

  // Get transactions using a specific tag
  const getTransactionsUsingTag = (tagId: string) => {
    return transactions.filter(t => t.tagIds?.includes(tagId));
  };

  // Get available replacement tags (excluding the one being deleted and archived tags)
  const getReplacementTags = (excludeId: string) => {
    return tags.filter(t => t.id !== excludeId && !t.isArchived);
  };

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

  const initiateDelete = (tag: Tag) => {
    const affectedTransactions = getTransactionsUsingTag(tag.id);
    setTagToDelete(tag);
    setReplacementTagId('remove');

    if (affectedTransactions.length > 0) {
      setDeleteConfirmOpen(true);
    } else {
      // No transactions affected, delete directly
      deleteTag(tag.id);
      toast({ title: 'Tag Deleted' });
    }
  };

  const handleConfirmDelete = async () => {
    if (!tagToDelete) return;

    const affectedTransactions = getTransactionsUsingTag(tagToDelete.id);

    // Update transactions: either remove the tag or replace with another
    for (const transaction of affectedTransactions) {
      const currentTagIds = transaction.tagIds || [];
      let newTagIds: string[];

      if (replacementTagId === 'remove') {
        // Remove the tag from the transaction
        newTagIds = currentTagIds.filter(id => id !== tagToDelete.id);
      } else {
        // Replace with the new tag (avoid duplicates)
        newTagIds = currentTagIds
          .filter(id => id !== tagToDelete.id)
          .concat(currentTagIds.includes(replacementTagId) ? [] : [replacementTagId]);
      }

      await updateTransaction(transaction.id, { tagIds: newTagIds });
    }

    // Delete the tag
    await deleteTag(tagToDelete.id);

    const replacementTag = tags.find(t => t.id === replacementTagId);
    if (replacementTagId === 'remove') {
      toast({
        title: 'Tag Deleted',
        description: `Tag removed from ${affectedTransactions.length} transaction${affectedTransactions.length > 1 ? 's' : ''}.`,
      });
    } else {
      toast({
        title: 'Tag Deleted',
        description: `${affectedTransactions.length} transaction${affectedTransactions.length > 1 ? 's' : ''} reassigned to "${replacementTag?.name}".`,
      });
    }

    setDeleteConfirmOpen(false);
    setTagToDelete(null);
  };

  const initiateArchive = (tag: Tag) => {
    const affectedTransactions = getTransactionsUsingTag(tag.id);
    setTagToArchive(tag);

    if (affectedTransactions.length > 0) {
      setArchiveConfirmOpen(true);
    } else {
      // No transactions affected, archive directly
      updateTag(tag.id, { isArchived: true });
      toast({ title: 'Tag Archived', description: `${tag.name} has been archived.` });
    }
  };

  const handleConfirmArchive = () => {
    if (!tagToArchive) return;

    updateTag(tagToArchive.id, { isArchived: true });
    const affectedCount = getTransactionsUsingTag(tagToArchive.id).length;
    toast({
      title: 'Tag Archived',
      description: `${tagToArchive.name} has been archived. ${affectedCount} transaction${affectedCount > 1 ? 's' : ''} will show it as "(archived)".`,
    });
    setArchiveConfirmOpen(false);
    setTagToArchive(null);
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

  const deleteAffectedCount = tagToDelete ? getTransactionsUsingTag(tagToDelete.id).length : 0;
  const archiveAffectedCount = tagToArchive ? getTransactionsUsingTag(tagToArchive.id).length : 0;
  const replacementOptions = tagToDelete ? getReplacementTags(tagToDelete.id) : [];

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
                  className={`w-5 h-5 rounded-full border-2 ${editColor === color ? 'border-primary' : 'border-transparent'}`}
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
            style={isMonochrome 
              ? getMonochromeStyle(tag.color)
              : { backgroundColor: `${tag.color}20`, color: tag.color }
            }
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
                onClick={() => initiateArchive(tag)}
              >
                <Archive className="w-3.5 h-3.5" />
              </Button>
            )}
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={() => initiateDelete(tag)}
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
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground">
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
                      newColor === color ? 'border-primary scale-110' : 'border-transparent'
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-[450px] bg-card border-border/50">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-warning" />
              Delete Tag
            </DialogTitle>
            <DialogDescription>
              This tag is used by <strong>{deleteAffectedCount} transaction{deleteAffectedCount > 1 ? 's' : ''}</strong>.
              What would you like to do with them?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <p className="text-sm font-medium mb-1">Tag to delete:</p>
              <Badge
                variant="secondary"
                className="text-sm"
                style={isMonochrome && tagToDelete
                  ? getMonochromeStyle(tagToDelete.color)
                  : { backgroundColor: `${tagToDelete?.color}20`, color: tagToDelete?.color }
                }
              >
                {tagToDelete?.isProject && <FolderKanban className="w-3 h-3 mr-1" />}
                {tagToDelete?.name}
              </Badge>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Action for affected transactions:</label>
              <Select value={replacementTagId} onValueChange={setReplacementTagId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="remove">
                    <span className="text-muted-foreground">Remove tag from transactions</span>
                  </SelectItem>
                  {replacementOptions.map(tag => (
                    <SelectItem key={tag.id} value={tag.id}>
                      <span className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: tag.color }}
                        />
                        Reassign to "{tag.name}"
                      </span>
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
              Delete Tag
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Archive Confirmation Dialog */}
      <Dialog open={archiveConfirmOpen} onOpenChange={setArchiveConfirmOpen}>
        <DialogContent className="sm:max-w-[450px] bg-card border-border/50">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Archive className="w-5 h-5 text-muted-foreground" />
              Archive Tag
            </DialogTitle>
            <DialogDescription>
              This tag is used by <strong>{archiveAffectedCount} transaction{archiveAffectedCount > 1 ? 's' : ''}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <p className="text-sm font-medium mb-1">Tag to archive:</p>
              <Badge
                variant="secondary"
                className="text-sm"
                style={isMonochrome && tagToArchive
                  ? getMonochromeStyle(tagToArchive.color)
                  : { backgroundColor: `${tagToArchive?.color}20`, color: tagToArchive?.color }
                }
              >
                {tagToArchive?.isProject && <FolderKanban className="w-3 h-3 mr-1" />}
                {tagToArchive?.name}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Archived tags will be hidden from new transactions but will remain visible on existing transactions labeled as "(archived)".
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setArchiveConfirmOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmArchive}>
              Archive Tag
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
