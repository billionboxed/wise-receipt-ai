import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Upload, FileJson, AlertCircle, FileSpreadsheet } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { useExpense } from '@/context/ExpenseContext';
import { ClearSpendsExport, ImportAnalysis } from '@/types/clearspends-export';
import { ClearSpendsImportDialog } from '@/components/upload/ClearSpendsImportDialog';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';

// Expected columns for ClearSpends CSV/Excel export
const CLEARSPENDS_COLUMNS = ['Date', 'Description', 'Amount', 'Type', 'Category', 'Account', 'Tags', 'Status'];

export function ImportTransactions() {
  const { categories, tags, accounts, transactions } = useExpense();
  const navigate = useNavigate();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [importData, setImportData] = useState<ClearSpendsExport | null>(null);
  const [analysis, setAnalysis] = useState<ImportAnalysis | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const isClearSpendsFile = (content: any): content is ClearSpendsExport => {
    return (
      content &&
      content.version &&
      content.exportType === 'clearspends' &&
      content.data &&
      Array.isArray(content.data.transactions)
    );
  };

  // Check if spreadsheet has ClearSpends column structure
  const isClearSpendsSpreadsheet = (headers: string[]): boolean => {
    const normalizedHeaders = headers.map(h => h?.trim().toLowerCase());
    const requiredHeaders = ['date', 'description', 'amount', 'type', 'category'];
    return requiredHeaders.every(req => normalizedHeaders.includes(req));
  };

  // Parse CSV/Excel data into ClearSpends format
  const parseSpreadsheetData = (rows: any[]): ClearSpendsExport => {
    const categoriesMap = new Map<string, { main: string; sub: string; combined: string }>();
    const tagsMap = new Map<string, { name: string; color: string; isProject: boolean; isArchived: boolean }>();
    const accountsMap = new Map<string, { name: string; type: 'bank' | 'credit' | 'cash' | 'wallet' }>();
    
    const transactionsData = rows.map(row => {
      const category = row.Category?.trim() || '';
      const account = row.Account?.trim() || '';
      const tagsStr = row.Tags?.trim() || '';
      
      // Parse category (format: "Main > Sub" or just "Main")
      let categoryMain = '';
      let categorySub = '';
      if (category) {
        const parts = category.split('>').map((p: string) => p.trim());
        categoryMain = parts[0] || '';
        categorySub = parts[1] || parts[0] || '';
        const combined = parts.length > 1 ? `${categoryMain} > ${categorySub}` : categoryMain;
        if (!categoriesMap.has(combined.toLowerCase())) {
          categoriesMap.set(combined.toLowerCase(), { main: categoryMain, sub: categorySub, combined });
        }
      }
      
      // Parse account
      if (account && !accountsMap.has(account.toLowerCase())) {
        accountsMap.set(account.toLowerCase(), { name: account, type: 'bank' as const });
      }
      
      // Parse tags (comma-separated)
      const tagNames: string[] = tagsStr ? tagsStr.split(',').map((t: string) => t.trim()).filter(Boolean) : [];
      tagNames.forEach(tagName => {
        if (!tagsMap.has(tagName.toLowerCase())) {
          // Generate a random color for new tags
          const colors = ['#f97316', '#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#14b8a6'];
          const randomColor = colors[Math.floor(Math.random() * colors.length)];
          tagsMap.set(tagName.toLowerCase(), { name: tagName, color: randomColor, isProject: false, isArchived: false });
        }
      });
      
      return {
        date: row.Date || '',
        description: row.Description || '',
        amount: parseFloat(row.Amount) || 0,
        type: (row.Type || 'debit').toLowerCase(),
        categoryMain,
        categorySub,
        accountName: account || null,
        tagNames,
        status: row.Status || 'confirmed',
      };
    }).filter(t => t.date && t.description && t.amount > 0);

    return {
      version: '1.0',
      exportType: 'clearspends',
      exportedAt: new Date().toISOString(),
      data: {
        categories: Array.from(categoriesMap.values()),
        tags: Array.from(tagsMap.values()),
        accounts: Array.from(accountsMap.values()),
        transactions: transactionsData,
      },
    };
  };

  const analyzeImport = useCallback((data: ClearSpendsExport): ImportAnalysis => {
    const existingCategoryKeys = new Set(categories.map(c => c.combined.toLowerCase()));
    const existingTagNames = new Set(tags.map(t => t.name.toLowerCase()));
    const existingAccountNames = new Set(accounts.map(a => a.name.toLowerCase()));
    
    // Analyze categories
    const newCategories = data.data.categories.filter(
      c => !existingCategoryKeys.has(c.combined.toLowerCase())
    );
    const existingCategories = data.data.categories.filter(
      c => existingCategoryKeys.has(c.combined.toLowerCase())
    );
    
    // Analyze tags
    const newTags = data.data.tags.filter(
      t => !existingTagNames.has(t.name.toLowerCase())
    );
    const existingTags = data.data.tags.filter(
      t => existingTagNames.has(t.name.toLowerCase())
    );
    
    // Analyze accounts
    const newAccounts = data.data.accounts.filter(
      a => !existingAccountNames.has(a.name.toLowerCase())
    );
    const existingAccounts = data.data.accounts.filter(
      a => existingAccountNames.has(a.name.toLowerCase())
    );
    
    // Check for duplicate transactions
    let duplicateCount = 0;
    data.data.transactions.forEach(t => {
      const isDuplicate = transactions.some(
        existing => 
          existing.date === t.date && 
          Math.abs(existing.amount - t.amount) < 0.01 && 
          existing.type === t.type
      );
      if (isDuplicate) duplicateCount++;
    });

    return {
      newCategories,
      existingCategories,
      newTags,
      existingTags,
      newAccounts,
      existingAccounts,
      transactions: data.data.transactions,
      duplicateCount,
    };
  }, [categories, tags, accounts, transactions]);

  const parseCSV = (text: string): any[] => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];
    
    // Parse header
    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
    
    // Parse rows
    return lines.slice(1).map(line => {
      const values: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (const char of line) {
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim());
      
      const row: any = {};
      headers.forEach((header, i) => {
        row[header] = values[i] || '';
      });
      return row;
    });
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setIsProcessing(true);

    try {
      const fileName = file.name.toLowerCase();
      
      if (fileName.endsWith('.json') || fileName.endsWith('.clearspends.json')) {
        // JSON format
        const text = await file.text();
        const content = JSON.parse(text);
        
        if (isClearSpendsFile(content)) {
          const analysisResult = analyzeImport(content);
          setImportData(content);
          setAnalysis(analysisResult);
          setDialogOpen(true);
        } else {
          toast({
            title: 'Invalid file format',
            description: 'This JSON file is not a valid ClearSpends export.',
            variant: 'destructive',
          });
        }
      } else if (fileName.endsWith('.csv')) {
        // CSV format
        const text = await file.text();
        const rows = parseCSV(text);
        
        if (rows.length > 0) {
          const headers = Object.keys(rows[0]);
          
          if (isClearSpendsSpreadsheet(headers)) {
            // ClearSpends CSV export
            const clearSpendsData = parseSpreadsheetData(rows);
            const analysisResult = analyzeImport(clearSpendsData);
            setImportData(clearSpendsData);
            setAnalysis(analysisResult);
            setDialogOpen(true);
          } else {
            // Regular bank statement CSV
            toast({
              title: 'Bank statement detected',
              description: 'Redirecting to the Upload page for AI processing...',
            });
            navigate('/upload');
          }
        }
      } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        // Excel format
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet) as any[];
        
        if (rows.length > 0) {
          const headers = Object.keys(rows[0]);
          
          if (isClearSpendsSpreadsheet(headers)) {
            // ClearSpends Excel export
            const clearSpendsData = parseSpreadsheetData(rows);
            const analysisResult = analyzeImport(clearSpendsData);
            setImportData(clearSpendsData);
            setAnalysis(analysisResult);
            setDialogOpen(true);
          } else {
            // Regular bank statement Excel
            toast({
              title: 'Bank statement detected',
              description: 'Redirecting to the Upload page for AI processing...',
            });
            navigate('/upload');
          }
        }
      } else if (fileName.endsWith('.pdf')) {
        // PDF - always treat as bank statement
        toast({
          title: 'Bank statement detected',
          description: 'Redirecting to the Upload page for AI processing...',
        });
        navigate('/upload');
      } else {
        toast({
          title: 'Unsupported file type',
          description: 'Please upload a ClearSpends file (JSON, CSV, Excel) or bank statement.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: 'Import failed',
        description: 'Could not read the file. Please check the format and try again.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  }, [analyzeImport, navigate]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/json': ['.json'],
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/pdf': ['.pdf'],
    },
    maxFiles: 1,
    disabled: isProcessing,
  });

  const handleDialogClose = () => {
    setDialogOpen(false);
    setImportData(null);
    setAnalysis(null);
  };

  return (
    <div className="space-y-6">
      {/* Drop Zone */}
      <div
        {...getRootProps()}
        className={cn(
          'relative rounded-xl border-2 border-dashed transition-all duration-300 cursor-pointer',
          'p-8 flex flex-col items-center justify-center gap-4 min-h-[200px]',
          isDragActive
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/20 hover:border-primary/50 hover:bg-primary/5',
          isProcessing && 'pointer-events-none opacity-50'
        )}
      >
        <input {...getInputProps()} />
        
        <motion.div
          animate={isDragActive ? { scale: 1.1 } : { scale: 1 }}
          className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center"
        >
          {isDragActive ? (
            <Upload className="w-8 h-8 text-primary animate-bounce" />
          ) : (
            <FileJson className="w-8 h-8 text-primary" />
          )}
        </motion.div>

        <div className="text-center">
          <p className="text-lg font-medium text-foreground">
            {isDragActive ? 'Drop to import' : 'Drop ClearSpends export here'}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            or click to browse files
          </p>
        </div>
      </div>

      {/* Supported Formats */}
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">Supported formats:</p>
        
        <div className="grid gap-2">
          <div className="flex items-center gap-3 p-3 rounded-lg glass-card border border-white/5">
            <FileJson className="w-5 h-5 text-primary" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">ClearSpends JSON</p>
              <p className="text-xs text-muted-foreground">Full backup with all metadata</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 rounded-lg glass-card border border-white/5">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">ClearSpends CSV / Excel</p>
              <p className="text-xs text-muted-foreground">Exports with categories, accounts & tags</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 rounded-lg glass-card border border-white/5">
            <FileSpreadsheet className="w-5 h-5 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Bank statements</p>
              <p className="text-xs text-muted-foreground">CSV, Excel, PDF → AI processing on Upload page</p>
            </div>
          </div>
        </div>
      </div>

      {/* Info Note */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/30 border border-muted">
        <AlertCircle className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
        <div className="text-sm text-muted-foreground">
          <p className="font-medium text-foreground mb-1">Smart file detection</p>
          <ul className="space-y-1 list-disc list-inside">
            <li>ClearSpends exports are auto-detected by column structure</li>
            <li>New categories, tags & accounts are created automatically</li>
            <li>Duplicate transactions are detected and can be skipped</li>
          </ul>
        </div>
      </div>

      {/* Import Dialog */}
      {importData && analysis && (
        <ClearSpendsImportDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          importData={importData}
          analysis={analysis}
          onComplete={handleDialogClose}
        />
      )}
    </div>
  );
}
