import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Download, Calendar, FileDown, Check, Info, FileJson, FileSpreadsheet, Table } from 'lucide-react';
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
import * as XLSX from 'xlsx';

type ExportFormat = 'clearspends' | 'csv' | 'excel';

const formatOptions: { id: ExportFormat; label: string; description: string; icon: React.ElementType; recommended?: boolean }[] = [
  { id: 'clearspends', label: 'ClearSpends JSON', description: 'Complete backup - recommended for transferring all data', icon: FileJson, recommended: true },
  { id: 'csv', label: 'CSV', description: 'Spreadsheet format with categories, tags & accounts', icon: Table },
  { id: 'excel', label: 'Excel', description: 'Excel workbook with categories, tags & accounts', icon: FileSpreadsheet },
];

export function ExportTransactions() {
  const { transactions, categories, tags, accounts, getCategoryById, getAccountById, getTagById } = useExpense();
  const { formatAmount, currency } = useCurrency();
  
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: startOfMonth(subMonths(new Date(), 11)),
    to: endOfMonth(new Date()),
  });
  const [exported, setExported] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('clearspends');

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

  // Build flat transaction data for CSV/Excel
  const buildFlatData = () => {
    return filteredTransactions.map(t => {
      const category = getCategoryById(t.categoryId);
      const account = getAccountById(t.accountId);
      const txTags = t.tagIds.map(id => getTagById(id)?.name).filter(Boolean) as string[];
      
      return {
        Date: t.date,
        Description: t.description,
        Amount: t.amount,
        Type: t.type,
        Category: category?.combined || '',
        Account: account?.name || '',
        Tags: txTags.join(', '),
        Status: t.status,
      };
    });
  };

  const handleExportCSV = () => {
    const data = buildFlatData();
    const headers = ['Date', 'Description', 'Amount', 'Type', 'Category', 'Account', 'Tags', 'Status'];
    
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(h => {
          const value = row[h as keyof typeof row];
          // Escape quotes and wrap in quotes if contains comma
          const str = String(value);
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        }).join(',')
      )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStr = format(new Date(), 'yyyy-MM-dd');
    a.href = url;
    a.download = `transactions-${dateStr}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportExcel = () => {
    const data = buildFlatData();
    
    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    
    // Set column widths
    ws['!cols'] = [
      { wch: 12 },  // Date
      { wch: 40 },  // Description
      { wch: 12 },  // Amount
      { wch: 8 },   // Type
      { wch: 25 },  // Category
      { wch: 20 },  // Account
      { wch: 30 },  // Tags
      { wch: 10 },  // Status
    ];
    
    XLSX.utils.book_append_sheet(wb, ws, 'Transactions');
    
    const dateStr = format(new Date(), 'yyyy-MM-dd');
    XLSX.writeFile(wb, `transactions-${dateStr}.xlsx`);
  };

  const handleExportClearSpends = () => {
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
  };

  const handleExport = () => {
    switch (selectedFormat) {
      case 'csv':
        handleExportCSV();
        break;
      case 'excel':
        handleExportExcel();
        break;
      case 'clearspends':
      default:
        handleExportClearSpends();
        break;
    }

    setExported(true);
    setTimeout(() => setExported(false), 3000);
    
    toast({
      title: 'Export complete',
      description: `Exported ${stats.transactionCount} transactions as ${formatOptions.find(f => f.id === selectedFormat)?.label}`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Format Selection */}
      <div className="space-y-3">
        <Label className="text-sm text-muted-foreground">Export Format</Label>
        <div className="grid gap-2">
          {formatOptions.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setSelectedFormat(opt.id)}
              className={cn(
                'flex items-center gap-3 p-3 rounded-xl border transition-all text-left',
                selectedFormat === opt.id
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-muted-foreground/30 hover:bg-muted/50'
              )}
            >
              <div className={cn(
                'w-10 h-10 rounded-lg flex items-center justify-center',
                selectedFormat === opt.id ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
              )}>
                <opt.icon className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className={cn(
                  'font-medium text-sm',
                  selectedFormat === opt.id ? 'text-foreground' : 'text-foreground/80'
                )}>{opt.label}</p>
                <p className="text-xs text-muted-foreground">{opt.description}</p>
              </div>
              <div className="flex items-center gap-2">
                {opt.recommended && (
                  <span className="text-[10px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                    Recommended
                  </span>
                )}
                {selectedFormat === opt.id && (
                  <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-3 h-3 text-primary-foreground" />
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

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

        {selectedFormat === 'clearspends' ? (
          <p className="text-xs text-primary/70 pt-2 border-t border-border">
            Best for complete backup or transferring data to another account. Includes all metadata and archived items.
          </p>
        ) : (
          <p className="text-xs text-muted-foreground pt-2 border-t border-border">
            All formats can be re-imported with categories, tags & accounts. Use JSON for complete backup including archived items.
          </p>
        )}
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
            Download {formatOptions.find(f => f.id === selectedFormat)?.label}
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
