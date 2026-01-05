import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FolderPlus, 
  Tag, 
  Wallet, 
  Check, 
  AlertTriangle, 
  ChevronRight,
  FileCheck,
  Loader2 
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useExpense } from '@/context/ExpenseContext';
import { useCurrency } from '@/context/CurrencyContext';
import { ClearSpendsExport, ImportAnalysis, ClearSpendsExportTransaction } from '@/types/clearspends-export';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface ClearSpendsImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  importData: ClearSpendsExport;
  analysis: ImportAnalysis;
  onComplete: () => void;
}

type ImportStep = 'review' | 'transactions' | 'importing';

export function ClearSpendsImportDialog({
  open,
  onOpenChange,
  importData,
  analysis,
  onComplete,
}: ClearSpendsImportDialogProps) {
  const { 
    addCategory, 
    addTag, 
    addAccount, 
    addTransactions,
    categories,
    tags,
    accounts,
    transactions: existingTransactions,
  } = useExpense();
  const { formatAmount } = useCurrency();

  const [step, setStep] = useState<ImportStep>('review');
  const [selectedNewCategories, setSelectedNewCategories] = useState<Set<string>>(
    new Set(analysis.newCategories.map(c => c.combined))
  );
  const [selectedNewTags, setSelectedNewTags] = useState<Set<string>>(
    new Set(analysis.newTags.map(t => t.name))
  );
  const [selectedNewAccounts, setSelectedNewAccounts] = useState<Set<string>>(
    new Set(analysis.newAccounts.map(a => a.name))
  );
  const [selectedTransactions, setSelectedTransactions] = useState<Set<number>>(() => {
    // Pre-select non-duplicate transactions
    const selected = new Set<number>();
    analysis.transactions.forEach((t, i) => {
      const isDuplicate = existingTransactions.some(
        existing => 
          existing.date === t.date && 
          Math.abs(existing.amount - t.amount) < 0.01 && 
          existing.type === t.type
      );
      if (!isDuplicate) selected.add(i);
    });
    return selected;
  });
  const [isImporting, setIsImporting] = useState(false);

  // Memoized transaction analysis
  const transactionAnalysis = useMemo(() => {
    return analysis.transactions.map((t, index) => {
      const isDuplicate = existingTransactions.some(
        existing => 
          existing.date === t.date && 
          Math.abs(existing.amount - t.amount) < 0.01 && 
          existing.type === t.type
      );
      return { ...t, index, isDuplicate };
    });
  }, [analysis.transactions, existingTransactions]);

  const selectedCount = selectedTransactions.size;
  const totalSelected = useMemo(() => {
    return analysis.transactions
      .filter((_, i) => selectedTransactions.has(i))
      .reduce((sum, t) => sum + t.amount, 0);
  }, [analysis.transactions, selectedTransactions]);

  const toggleTransaction = useCallback((index: number) => {
    setSelectedTransactions(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  const handleImport = async () => {
    setIsImporting(true);
    setStep('importing');

    try {
      // Step 1: Create new categories
      for (const cat of analysis.newCategories) {
        if (selectedNewCategories.has(cat.combined)) {
          await addCategory({
            main: cat.main,
            sub: cat.sub,
            combined: cat.combined,
          });
        }
      }

      // Step 2: Create new tags (including archived/project flags)
      for (const tag of analysis.newTags) {
        if (selectedNewTags.has(tag.name)) {
          await addTag({
            name: tag.name,
            color: tag.color,
            isProject: tag.isProject,
            isArchived: tag.isArchived,
          });
        }
      }

      // Step 3: Create new accounts
      for (const acc of analysis.newAccounts) {
        if (selectedNewAccounts.has(acc.name)) {
          await addAccount({
            name: acc.name,
            type: acc.type,
          });
        }
      }

      // Step 4: Fetch fresh IDs so transactions can be linked correctly
      const [catRes, tagRes, accRes] = await Promise.all([
        supabase.from('categories').select('id, main, sub, combined'),
        supabase.from('tags').select('id, name'),
        supabase.from('accounts').select('id, name'),
      ]);

      if (catRes.error) throw catRes.error;
      if (tagRes.error) throw tagRes.error;
      if (accRes.error) throw accRes.error;

      const norm = (v?: string | null) => (v ?? '').trim().toLowerCase();

      const categoryIdByCombined = new Map<string, string>();
      (catRes.data || []).forEach((c) => {
        categoryIdByCombined.set(norm(c.combined), c.id);
        // Extra fallback key (main/sub) for older exports
        categoryIdByCombined.set(norm(`${c.main} > ${c.sub}`), c.id);
      });

      const accountIdByName = new Map<string, string>();
      (accRes.data || []).forEach((a) => accountIdByName.set(norm(a.name), a.id));

      const tagIdByName = new Map<string, string>();
      (tagRes.data || []).forEach((t) => tagIdByName.set(norm(t.name), t.id));

      // Step 5: Prepare and add transactions (with correct category/account/tag IDs)
      const transactionsToImport = analysis.transactions
        .filter((_, i) => selectedTransactions.has(i))
        .map((t) => {
          const combined = t.categorySub && t.categorySub !== t.categoryMain
            ? `${t.categoryMain} > ${t.categorySub}`
            : t.categoryMain;

          const categoryId = categoryIdByCombined.get(norm(combined)) ||
            categoryIdByCombined.get(norm(`${t.categoryMain} > ${t.categorySub}`)) ||
            null;

          const accountId = t.accountName ? (accountIdByName.get(norm(t.accountName)) || null) : null;

          const tagIds = (t.tagNames || [])
            .map((name) => tagIdByName.get(norm(name)))
            .filter(Boolean) as string[];

          return {
            date: t.date,
            description: t.description,
            amount: t.amount,
            type: t.type,
            categoryId,
            accountId,
            tagIds,
            status: t.status,
            aiSuggested: false,
          };
        });

      if (transactionsToImport.length > 0) {
        await addTransactions(transactionsToImport as any);
      }

      toast({
        title: 'Import complete!',
        description: `Imported ${transactionsToImport.length} transactions`,
      });

      onComplete();
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: 'Import failed',
        description: 'An error occurred during import. Please try again.',
        variant: 'destructive',
      });
      setStep('review');
    } finally {
      setIsImporting(false);
    }
  };

  const hasNewItems = analysis.newCategories.length > 0 || 
                      analysis.newTags.length > 0 || 
                      analysis.newAccounts.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-primary" />
            Import ClearSpends Data
          </DialogTitle>
          <DialogDescription>
            {step === 'review' && 'Review new items to be created'}
            {step === 'transactions' && 'Select transactions to import'}
            {step === 'importing' && 'Importing your data...'}
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {step === 'review' && (
            <motion.div
              key="review"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex-1 overflow-hidden"
            >
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-6">
                  {/* New Categories */}
                  {analysis.newCategories.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <FolderPlus className="w-4 h-4 text-primary" />
                        <span className="font-medium">New Categories ({analysis.newCategories.length})</span>
                      </div>
                      <div className="space-y-1 pl-6">
                        {analysis.newCategories.map(cat => (
                          <label
                            key={cat.combined}
                            className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 cursor-pointer"
                          >
                            <Checkbox
                              checked={selectedNewCategories.has(cat.combined)}
                              onCheckedChange={(checked) => {
                                setSelectedNewCategories(prev => {
                                  const next = new Set(prev);
                                  if (checked) next.add(cat.combined);
                                  else next.delete(cat.combined);
                                  return next;
                                });
                              }}
                            />
                            <span className="text-sm">
                              {cat.main} <ChevronRight className="w-3 h-3 inline" /> {cat.sub}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* New Tags */}
                  {analysis.newTags.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Tag className="w-4 h-4 text-primary" />
                        <span className="font-medium">New Tags ({analysis.newTags.length})</span>
                      </div>
                      <div className="space-y-1 pl-6">
                        {analysis.newTags.map(tag => (
                          <label
                            key={tag.name}
                            className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 cursor-pointer"
                          >
                            <Checkbox
                              checked={selectedNewTags.has(tag.name)}
                              onCheckedChange={(checked) => {
                                setSelectedNewTags(prev => {
                                  const next = new Set(prev);
                                  if (checked) next.add(tag.name);
                                  else next.delete(tag.name);
                                  return next;
                                });
                              }}
                            />
                            <span
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: tag.color }}
                            />
                            <span className="text-sm">{tag.name}</span>
                            {tag.isProject && (
                              <Badge variant="secondary" className="text-xs">Project</Badge>
                            )}
                            {tag.isArchived && (
                              <Badge variant="outline" className="text-xs">Archived</Badge>
                            )}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* New Accounts */}
                  {analysis.newAccounts.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Wallet className="w-4 h-4 text-primary" />
                        <span className="font-medium">New Accounts ({analysis.newAccounts.length})</span>
                      </div>
                      <div className="space-y-1 pl-6">
                        {analysis.newAccounts.map(acc => (
                          <label
                            key={acc.name}
                            className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 cursor-pointer"
                          >
                            <Checkbox
                              checked={selectedNewAccounts.has(acc.name)}
                              onCheckedChange={(checked) => {
                                setSelectedNewAccounts(prev => {
                                  const next = new Set(prev);
                                  if (checked) next.add(acc.name);
                                  else next.delete(acc.name);
                                  return next;
                                });
                              }}
                            />
                            <span className="text-sm">{acc.name}</span>
                            <Badge variant="outline" className="text-xs capitalize">{acc.type}</Badge>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* No new items message */}
                  {!hasNewItems && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Check className="w-12 h-12 mx-auto mb-3 text-green-500" />
                      <p>All categories, tags, and accounts already exist!</p>
                      <p className="text-sm mt-1">Proceeding directly to transaction review.</p>
                    </div>
                  )}

                  {/* Transaction Summary */}
                  <div className="p-4 rounded-xl bg-muted/30 border border-muted">
                    <p className="font-medium mb-2">Transaction Summary</p>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total transactions:</span>
                      <span>{analysis.transactions.length}</span>
                    </div>
                    {analysis.duplicateCount > 0 && (
                      <div className="flex justify-between text-sm mt-1">
                        <span className="text-amber-500 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Potential duplicates:
                        </span>
                        <span className="text-amber-500">{analysis.duplicateCount}</span>
                      </div>
                    )}
                  </div>
                </div>
              </ScrollArea>
            </motion.div>
          )}

          {step === 'transactions' && (
            <motion.div
              key="transactions"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 overflow-hidden"
            >
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-2">
                  {/* Select All */}
                  <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50 sticky top-0 z-10">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={selectedCount === analysis.transactions.length}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedTransactions(new Set(analysis.transactions.map((_, i) => i)));
                          } else {
                            setSelectedTransactions(new Set());
                          }
                        }}
                      />
                      <span className="text-sm font-medium">Select All</span>
                    </label>
                    <span className="text-sm text-muted-foreground">
                      {selectedCount} selected
                    </span>
                  </div>

                  {/* Transaction List */}
                  {transactionAnalysis.map((t) => (
                    <label
                      key={t.index}
                      className={cn(
                        'flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors',
                        'hover:bg-muted/50',
                        t.isDuplicate && 'opacity-60 bg-amber-500/10'
                      )}
                    >
                      <Checkbox
                        checked={selectedTransactions.has(t.index)}
                        onCheckedChange={() => toggleTransaction(t.index)}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium truncate">{t.description}</span>
                          <span className="text-sm font-semibold text-destructive whitespace-nowrap">
                            {formatAmount(t.amount)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <span>{t.date}</span>
                          <span>•</span>
                          <span>{t.categoryMain}</span>
                        </div>
                        {t.tagNames?.length > 0 && (
                          <div className="mt-1 text-xs text-muted-foreground truncate">
                            Tags: {t.tagNames.join(', ')}
                          </div>
                        )}
                        {t.isDuplicate && (
                          <div className="flex items-center gap-1 mt-1 text-xs text-amber-500">
                            <AlertTriangle className="w-3 h-3" />
                            Potential duplicate
                          </div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </ScrollArea>

              {/* Selected Summary */}
              <div className="mt-4 p-3 rounded-xl bg-primary/10 border border-primary/20">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Selected Total:</span>
                  <span className="text-lg font-bold text-primary">{formatAmount(totalSelected)}</span>
                </div>
              </div>
            </motion.div>
          )}

          {step === 'importing' && (
            <motion.div
              key="importing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 flex items-center justify-center py-12"
            >
              <div className="text-center">
                <Loader2 className="w-12 h-12 mx-auto mb-4 text-primary animate-spin" />
                <p className="text-lg font-medium">Importing your data...</p>
                <p className="text-sm text-muted-foreground mt-1">This may take a moment</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <DialogFooter className="flex-shrink-0">
          {step === 'review' && (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={() => setStep('transactions')}>
                Continue
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </>
          )}
          
          {step === 'transactions' && (
            <>
              <Button variant="outline" onClick={() => setStep('review')}>
                Back
              </Button>
              <Button 
                onClick={handleImport}
                disabled={selectedCount === 0}
              >
                Import {selectedCount} Transactions
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
