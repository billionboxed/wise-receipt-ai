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

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setIsProcessing(true);

    try {
      // Check file extension
      const fileName = file.name.toLowerCase();
      
      if (fileName.endsWith('.json') || fileName.endsWith('.clearspends.json')) {
        // Try to parse as ClearSpends format
        const text = await file.text();
        const content = JSON.parse(text);
        
        if (isClearSpendsFile(content)) {
          // It's a ClearSpends file - analyze and show dialog
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
      } else if (
        fileName.endsWith('.csv') || 
        fileName.endsWith('.xlsx') || 
        fileName.endsWith('.xls') ||
        fileName.endsWith('.pdf')
      ) {
        // Bank statement - redirect to upload page
        toast({
          title: 'Bank statement detected',
          description: 'Redirecting to the Upload page for processing...',
        });
        navigate('/upload');
      } else {
        toast({
          title: 'Unsupported file type',
          description: 'Please upload a ClearSpends JSON file or bank statement (CSV, Excel, PDF).',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: 'Import failed',
        description: 'Could not read the file. Please ensure it\'s a valid JSON file.',
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
              <p className="text-sm font-medium text-foreground">.clearspends.json</p>
              <p className="text-xs text-muted-foreground">ClearSpends export file with full metadata</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 rounded-lg glass-card border border-white/5">
            <FileSpreadsheet className="w-5 h-5 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">CSV, Excel, PDF</p>
              <p className="text-xs text-muted-foreground">Bank statements → redirects to Upload page</p>
            </div>
          </div>
        </div>
      </div>

      {/* Info Note */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/30 border border-muted">
        <AlertCircle className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
        <div className="text-sm text-muted-foreground">
          <p className="font-medium text-foreground mb-1">What gets imported?</p>
          <ul className="space-y-1 list-disc list-inside">
            <li>New categories and tags are automatically created</li>
            <li>Duplicate transactions are detected and can be skipped</li>
            <li>You'll review everything before confirming the import</li>
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
