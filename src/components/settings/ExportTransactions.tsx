import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Download, Calendar, FileDown, Check, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { useExpense } from '@/context/ExpenseContext';
import { useCurrency } from '@/context/CurrencyContext';
import { format, subMonths, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { ClearSpendsExport } from '@/types/clearspends-export';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export function ExportTransactions() {
  const { transactions, categories, tags, accounts, getCategoryById, getAccountById, getTagById } = useExpense();
  const { formatAmount } = useCurrency();
  
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: startOfMonth(subMonths(new Date(), 11)),
    to: endOfMonth(new Date()),
  });
  const [exported, setExported] = useState(false);

  // Filter transactions by date range
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const txDate = parseISO(t.date);
      return txDate >= dateRange.from && txDate <= dateRange.to;
    });
  }, [transactions, dateRange]);

  // Calculate stats
  const stats = useMemo(() => {
    const usedCategoryIds = new Set(filteredTransactions.map(t => t.categoryId).filter(Boolean));
    const usedAccountIds = new Set(filteredTransactions.map(t => t.accountId).filter(Boolean));
    const usedTagIds = new Set(filteredTransactions.flatMap(t => t.tagIds));
    
    const totalAmount = filteredTransactions.reduce((sum, t) => sum + t.amount, 0);
    
    return {
      transactionCount: filteredTransactions.length,
      categoryCount: usedCategoryIds.size,
      tagCount: usedTagIds.size,
      accountCount: usedAccountIds.size,
      totalAmount,
    };
  }, [filteredTransactions]);

  const handleExport = () => {
    // Get unique referenced items
    const usedCategoryIds = new Set(filteredTransactions.map(t => t.categoryId).filter(Boolean));
    const usedAccountIds = new Set(filteredTransactions.map(t => t.accountId).filter(Boolean));
    const usedTagIds = new Set(filteredTransactions.flatMap(t => t.tagIds));
    
    // Build export data
    const exportCategories = categories
      .filter(c => usedCategoryIds.has(c.id))
      .map(c => ({ main: c.main, sub: c.sub, combined: c.combined }));
    
    const exportTags = tags
      .filter(t => usedTagIds.has(t.id))
      .map(t => ({ name: t.name, color: t.color, isProject: t.isProject || false, isArchived: t.isArchived || false }));
    
    const exportAccounts = accounts
      .filter(a => usedAccountIds.has(a.id))
      .map(a => ({ name: a.name, type: a.type }));
    
    const exportTransactions = filteredTransactions.map(t => {
      const category = getCategoryById(t.categoryId);
      const account = getAccountById(t.accountId);
      const txTags = t.tagIds.map(id => getTagById(id)?.name).filter(Boolean) as string[];
      
      return {
        date: t.date,
        description: t.description,
        amount: t.amount,
        type: t.type,
        categoryMain: category?.main || '',
        categorySub: category?.sub || '',
        accountName: account?.name || null,
        tagNames: txTags,
        status: t.status,
      };
    });

    const exportData: ClearSpendsExport = {
      version: '1.0',
      exportType: 'clearspends',
      exportedAt: new Date().toISOString(),
      data: {
        categories: exportCategories,
        tags: exportTags,
        accounts: exportAccounts,
        transactions: exportTransactions,
      },
    };

    // Download file
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStr = format(new Date(), 'yyyy-MM-dd');
    a.href = url;
    a.download = `clearspends-export-${dateStr}.clearspends.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setExported(true);
    setTimeout(() => setExported(false), 3000);
    
    toast({
      title: 'Export complete',
      description: `Exported ${stats.transactionCount} transactions`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Date Range Selection */}
      <div className="space-y-3">
        <Label className="text-sm text-muted-foreground">Date Range</Label>
        <div className="flex gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="flex-1 justify-start gap-2">
                <Calendar className="w-4 h-4" />
                {format(dateRange.from, 'MMM d, yyyy')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={dateRange.from}
                onSelect={(date) => date && setDateRange(prev => ({ ...prev, from: date }))}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          
          <span className="flex items-center text-muted-foreground">to</span>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="flex-1 justify-start gap-2">
                <Calendar className="w-4 h-4" />
                {format(dateRange.to, 'MMM d, yyyy')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <CalendarComponent
                mode="single"
                selected={dateRange.to}
                onSelect={(date) => date && setDateRange(prev => ({ ...prev, to: date }))}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Quick Range Buttons */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: 'Last 30 days', from: subMonths(new Date(), 1), to: new Date() },
          { label: 'Last 3 months', from: subMonths(new Date(), 3), to: new Date() },
          { label: 'Last 6 months', from: subMonths(new Date(), 6), to: new Date() },
          { label: 'Last year', from: subMonths(new Date(), 12), to: new Date() },
          { label: 'All time', from: new Date(2000, 0, 1), to: new Date() },
        ].map((range) => (
          <Button
            key={range.label}
            variant="outline"
            size="sm"
            onClick={() => setDateRange({ from: range.from, to: range.to })}
            className="text-xs"
          >
            {range.label}
          </Button>
        ))}
      </div>

      {/* Export Summary */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 rounded-xl glass-card border border-white/5 space-y-3"
      >
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Info className="w-4 h-4" />
          <span>Export Summary</span>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-2xl font-bold text-foreground">{stats.transactionCount}</p>
            <p className="text-sm text-muted-foreground">Transactions</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{formatAmount(stats.totalAmount)}</p>
            <p className="text-sm text-muted-foreground">Total Amount</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-foreground">{stats.categoryCount}</p>
            <p className="text-sm text-muted-foreground">Categories</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-foreground">{stats.tagCount}</p>
            <p className="text-sm text-muted-foreground">Tags</p>
          </div>
        </div>
      </motion.div>

      {/* Export Button */}
      <Button
        onClick={handleExport}
        disabled={stats.transactionCount === 0}
        className={cn(
          'w-full h-14 rounded-xl gap-3 text-base',
          exported && 'bg-green-600 hover:bg-green-600'
        )}
      >
        {exported ? (
          <>
            <Check className="w-5 h-5" />
            Exported Successfully!
          </>
        ) : (
          <>
            <FileDown className="w-5 h-5" />
            Download Export File
          </>
        )}
      </Button>

      {stats.transactionCount === 0 && (
        <p className="text-sm text-center text-muted-foreground">
          No transactions found in the selected date range
        </p>
      )}
    </div>
  );
}
