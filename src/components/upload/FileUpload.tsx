import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Upload, FileSpreadsheet, X, Sparkles, AlertCircle, Zap, FileText } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import { useExpense } from '@/context/ExpenseContext';
import { ParsedTransaction } from '@/types/expense';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { findBestCategory, findCategoryByMain } from '@/utils/categoryMatcher';

interface FileUploadProps {
  onTransactionsParsed: (transactions: ParsedTransaction[]) => void;
}

export function FileUpload({ onTransactionsParsed }: FileUploadProps) {
  const { accounts, categories, transactions } = useExpense();
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [processingMessage, setProcessingMessage] = useState('');

  // Check for duplicate transactions based on date + amount
  const checkForDuplicates = useCallback(
    (parsedTransactions: ParsedTransaction[]): ParsedTransaction[] => {
      return parsedTransactions.map(pt => {
        // Check against existing transactions
        const duplicate = transactions.find(
          t => t.date === pt.date && Math.abs(t.amount - pt.amount) < 0.01 && t.type === pt.type
        );
        
        if (duplicate) {
          return {
            ...pt,
            isDuplicate: true,
            duplicateOf: duplicate.id,
            selected: false, // Auto-deselect duplicates
          };
        }
        
        return pt;
      });
    },
    [transactions]
  );

  const detectAccount = useCallback(
    (text: string, fileName?: string): string | undefined => {
      const lowerText = text.toLowerCase();
      const lowerFileName = (fileName || '').toLowerCase();
      
      // Check in both text content and filename
      const searchText = lowerText + ' ' + lowerFileName;
      
      // International bank keywords mapping
      const bankKeywords: Record<string, string[]> = {
        // Canada
        'rbc': ['rbc', 'royal bank'],
        'td': ['td bank', 'td canada', 'toronto-dominion'],
        'bmo': ['bmo', 'bank of montreal'],
        'scotiabank': ['scotiabank', 'scotia'],
        'cibc': ['cibc'],
        'tangerine': ['tangerine'],
        'simplii': ['simplii'],
        // USA
        'chase': ['chase', 'jpmorgan'],
        'bank of america': ['bank of america', 'bofa'],
        'wells fargo': ['wells fargo'],
        'citibank': ['citibank', 'citi'],
        'capital one': ['capital one'],
        'amex': ['american express', 'amex'],
        // India
        'kotak': ['kotak', 'kmbl'],
        'icici': ['icici'],
        'hdfc': ['hdfc'],
        'axis': ['axis'],
        'sbi': ['sbi', 'state bank'],
        // UK
        'barclays': ['barclays'],
        'hsbc': ['hsbc'],
        'lloyds': ['lloyds'],
        'monzo': ['monzo'],
        'revolut': ['revolut'],
        // Australia
        'commonwealth': ['commonwealth', 'cba'],
        'anz': ['anz'],
        'westpac': ['westpac'],
        'nab': ['nab'],
      };
      
      for (const account of accounts) {
        const accountNameLower = account.name.toLowerCase();
        
        // Direct name match
        if (searchText.includes(accountNameLower)) {
          return account.id;
        }
        
        // Check bank keywords
        for (const [bankName, keywords] of Object.entries(bankKeywords)) {
          if (accountNameLower.includes(bankName)) {
            if (keywords.some(kw => searchText.includes(kw))) {
              return account.id;
            }
          }
        }
      }
      return undefined;
    },
    [accounts]
  );

  // Smart category suggestion using the comprehensive matcher
  const suggestCategory = useCallback(
    (description: string): string | undefined => {
      const { categoryId } = findBestCategory(description, categories);
      return categoryId;
    },
    [categories]
  );

  const findAccountIdByName = useCallback(
    (accountName: string | null, fileName?: string): string | undefined => {
      if (!accountName && !fileName) return undefined;
      
      // First try to match by detected account name from AI
      if (accountName) {
        const lowerName = accountName.toLowerCase();
        
        // International bank mapping for AI-detected names
        const bankAliases: Record<string, string[]> = {
          // Canada
          'rbc': ['rbc', 'royal bank'],
          'td': ['td bank', 'td'],
          'bmo': ['bmo', 'bank of montreal'],
          'scotiabank': ['scotiabank', 'scotia'],
          'cibc': ['cibc'],
          'tangerine': ['tangerine'],
          // USA
          'chase': ['chase', 'jpmorgan'],
          'bank of america': ['bank of america', 'bofa'],
          'wells fargo': ['wells fargo'],
          'capital one': ['capital one'],
          'amex': ['american express', 'amex'],
          // India
          'kotak': ['kotak', 'kotak bank'],
          'icici': ['icici'],
          'hdfc': ['hdfc'],
          'axis': ['axis'],
          'sbi': ['sbi', 'state bank'],
          // UK
          'hsbc': ['hsbc'],
          'monzo': ['monzo'],
          'revolut': ['revolut'],
        };
        
        for (const account of accounts) {
          const accountNameLower = account.name.toLowerCase();
          
          // Direct match
          if (accountNameLower.includes(lowerName) || lowerName.includes(accountNameLower)) {
            return account.id;
          }
          
          // Check via aliases
          for (const [bankKey, aliases] of Object.entries(bankAliases)) {
            const matchesAccount = accountNameLower.includes(bankKey) || aliases.some(a => accountNameLower.includes(a));
            const matchesDetected = lowerName.includes(bankKey) || aliases.some(a => lowerName.includes(a));
            
            if (matchesAccount && matchesDetected) {
              return account.id;
            }
          }
        }
      }
      
      // Fallback to filename detection
      if (fileName) {
        return detectAccount('', fileName);
      }
      
      return undefined;
    },
    [accounts, detectAccount]
  );

  // Smart category finder with alias support
  const findCategoryIdByMain = useCallback(
    (categoryMain: string): string | undefined => {
      return findCategoryByMain(categoryMain, categories);
    },
    [categories]
  );

  const parsePdfWithAI = useCallback(
    async (file: File): Promise<ParsedTransaction[]> => {
      setProcessingMessage('Converting PDF to base64...');
      
      // Convert file to base64
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);

      setProcessingMessage('AI is analyzing your bank statement...');

      const { data, error } = await supabase.functions.invoke('parse-pdf-transactions', {
        body: { pdfBase64: base64, fileName: file.name },
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Failed to parse PDF');
      }

      if (!data.success) {
        const errorMessage = data.error || 'Failed to parse PDF';
        const hint = data.hint || 'Try uploading a clearer PDF or use Excel/CSV format.';
        throw new Error(`${errorMessage}\n\n${hint}`);
      }

      const parsedData = data.data;
      const detectedAccountId = findAccountIdByName(parsedData.detectedAccount, file.name);

      const transactions: ParsedTransaction[] = parsedData.transactions.map((t: any, index: number) => ({
        id: `parsed_${Date.now()}_${index}`,
        date: t.date || new Date().toISOString().split('T')[0],
        description: t.description?.trim() || 'Unknown',
        amount: typeof t.amount === 'number' ? t.amount : parseFloat(t.amount) || 0,
        type: t.type === 'credit' ? 'credit' : 'debit',
        suggestedCategoryId: findCategoryIdByMain(t.suggestedCategory || 'Misc'),
        suggestedAccountId: detectedAccountId,
        suggestedTagIds: [],
        selected: true,
        confirmed: false,
      }));

      return transactions.filter(t => t.amount > 0);
    },
    [findAccountIdByName, findCategoryIdByMain]
  );

  const parseAmount = (value: any): number => {
    if (typeof value === 'number') return Math.abs(value);
    const strValue = String(value)
      .replace(/[₹,\s]/g, '')
      .replace(/[^\d.-]/g, '');
    return Math.abs(parseFloat(strValue) || 0);
  };

  const parseDate = (value: any): string => {
    if (!value) return new Date().toISOString().split('T')[0];
    
    if (typeof value === 'number') {
      const excelDate = XLSX.SSF.parse_date_code(value);
      return `${excelDate.y}-${String(excelDate.m).padStart(2, '0')}-${String(excelDate.d).padStart(2, '0')}`;
    }
    
    const dateStr = String(value).trim();
    
    // Handle DD-MM-YYYY or DD/MM/YYYY format
    const ddmmyyyy = dateStr.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (ddmmyyyy) {
      const [, day, month, year] = ddmmyyyy;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    
    // Handle YYYY-MM-DD format
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return dateStr;
    }
    
    // Try parsing as generic date
    try {
      const parsed = new Date(dateStr);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().split('T')[0];
      }
    } catch {}
    
    return new Date().toISOString().split('T')[0];
  };

  const parseExcelFile = useCallback(
    async (file: File): Promise<ParsedTransaction[]> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = e.target?.result;
            const workbook = XLSX.read(data, { type: 'binary' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

            if (jsonData.length === 0) {
              resolve([]);
              return;
            }

            const headerRow = jsonData[0] || [];
            const columnMap: Record<string, number> = {};
            let hasHeaders = false;

            // Check if first row contains headers
            headerRow.forEach((header: any, index: number) => {
              if (header == null) return;
              const lowerHeader = String(header).toLowerCase();
              if (lowerHeader.includes('date')) { columnMap.date = index; hasHeaders = true; }
              if (lowerHeader.includes('description') || lowerHeader.includes('narration') || lowerHeader.includes('particular')) {
                columnMap.description = index; hasHeaders = true;
              }
              if (lowerHeader.includes('amount') || lowerHeader.includes('value')) { columnMap.amount = index; hasHeaders = true; }
              if (lowerHeader.includes('debit') || lowerHeader.includes('withdrawal')) { columnMap.debit = index; hasHeaders = true; }
              if (lowerHeader.includes('credit') || lowerHeader.includes('deposit')) { columnMap.credit = index; hasHeaders = true; }
              if (lowerHeader.includes('type') && (lowerHeader.length < 10)) { columnMap.type = index; hasHeaders = true; }
            });

            // If no headers found, try to detect column structure from first data row
            if (!hasHeaders) {
              const firstRow = jsonData[0];
              if (firstRow && firstRow.length >= 2) {
                // Heuristic: Date | Amount | Type format (user's format)
                for (let i = 0; i < firstRow.length; i++) {
                  const val = firstRow[i];
                  const strVal = String(val || '').toLowerCase();
                  
                  // Check if it looks like a date (DD-MM-YYYY)
                  if (String(val).match(/^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/)) {
                    columnMap.date = i;
                  }
                  // Check if it contains currency symbol or is a number (amount)
                  else if (String(val).includes('₹') || (typeof val === 'number' && val > 0)) {
                    columnMap.amount = i;
                  }
                  // Check if it's a type indicator (Debit/Credit)
                  else if (strVal === 'debit' || strVal === 'credit') {
                    columnMap.type = i;
                  }
                }
              }
            }

            const transactions: ParsedTransaction[] = [];
            const allText = jsonData.flat().join(' ');
            const detectedAccount = detectAccount(allText, file.name);
            const startIndex = hasHeaders ? 1 : 0;

            for (let i = startIndex; i < jsonData.length; i++) {
              const row = jsonData[i];
              if (!row || row.length === 0 || row.every(cell => cell == null || cell === '')) continue;

              let date = '';
              let description = '';
              let amount = 0;
              let type: 'debit' | 'credit' = 'debit';

              // Parse date
              if (columnMap.date !== undefined) {
                date = parseDate(row[columnMap.date]);
              } else {
                // Try to find a date-like value in the row
                for (const cell of row) {
                  if (cell && String(cell).match(/^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/)) {
                    date = parseDate(cell);
                    break;
                  }
                }
              }

              // Parse description
              if (columnMap.description !== undefined) {
                description = String(row[columnMap.description] || '').trim();
              }

              // Parse amount and type
              if (columnMap.debit !== undefined && columnMap.credit !== undefined) {
                const debitVal = parseAmount(row[columnMap.debit]);
                const creditVal = parseAmount(row[columnMap.credit]);
                if (debitVal > 0) {
                  amount = debitVal;
                  type = 'debit';
                } else if (creditVal > 0) {
                  amount = creditVal;
                  type = 'credit';
                }
              } else if (columnMap.amount !== undefined) {
                amount = parseAmount(row[columnMap.amount]);
                
                // Check for type column
                if (columnMap.type !== undefined) {
                  const typeVal = String(row[columnMap.type] || '').toLowerCase();
                  type = typeVal === 'credit' ? 'credit' : 'debit';
                } else {
                  // If no type column, check if amount was negative
                  const rawAmount = row[columnMap.amount];
                  if (typeof rawAmount === 'number' && rawAmount < 0) {
                    type = 'debit';
                  } else if (typeof rawAmount === 'string' && rawAmount.includes('-')) {
                    type = 'debit';
                  }
                }
              } else {
                // No mapped columns - try to extract from any column
                for (const cell of row) {
                  const cellStr = String(cell || '');
                  if (cellStr.includes('₹') || (typeof cell === 'number' && cell > 0)) {
                    amount = parseAmount(cell);
                    break;
                  }
                }
                // Look for type indicator
                for (const cell of row) {
                  const cellLower = String(cell || '').toLowerCase();
                  if (cellLower === 'credit') { type = 'credit'; break; }
                  if (cellLower === 'debit') { type = 'debit'; break; }
                }
              }

              // Skip if no amount found
              if (amount === 0) continue;

              // Generate description if empty
              if (!description) {
                description = `Transaction on ${date || 'unknown date'}`;
              }

              transactions.push({
                id: `parsed_${Date.now()}_${i}`,
                date: date || new Date().toISOString().split('T')[0],
                description: description.trim(),
                amount,
                type,
                suggestedCategoryId: suggestCategory(description),
                suggestedAccountId: detectedAccount,
                suggestedTagIds: [],
                selected: true,
                confirmed: false,
              });
            }

            resolve(transactions);
          } catch (error) {
            reject(error);
          }
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsBinaryString(file);
      });
    },
    [detectAccount, suggestCategory]
  );

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      setUploadedFile(file);
      setIsProcessing(true);
      setProcessingMessage('Processing file...');

      try {
        let parsedTxns: ParsedTransaction[];
        
        if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
          parsedTxns = await parsePdfWithAI(file);
        } else {
          parsedTxns = await parseExcelFile(file);
        }
        
        if (parsedTxns.length === 0) {
          toast({
            title: 'No transactions found',
            description: 'The file appears to be empty or in an unsupported format.',
            variant: 'destructive',
          });
          return;
        }

        // Check for duplicates
        setProcessingMessage('Checking for duplicates...');
        const transactionsWithDuplicateCheck = checkForDuplicates(parsedTxns);
        const duplicateCount = transactionsWithDuplicateCheck.filter(t => t.isDuplicate).length;

        if (duplicateCount > 0) {
          toast({
            title: `Found ${duplicateCount} potential duplicate(s)`,
            description: 'Duplicates are marked and auto-deselected. Review before confirming.',
            variant: 'default',
          });
        }

        toast({
          title: 'File processed successfully',
          description: `Found ${parsedTxns.length} transactions${duplicateCount > 0 ? ` (${duplicateCount} duplicates)` : ''}.`,
        });

        onTransactionsParsed(transactionsWithDuplicateCheck);
      } catch (error) {
        console.error('Error parsing file:', error);
        toast({
          title: 'Error processing file',
          description: error instanceof Error ? error.message : 'Please check the file format and try again.',
          variant: 'destructive',
        });
      } finally {
        setIsProcessing(false);
        setProcessingMessage('');
      }
    },
    [parseExcelFile, parsePdfWithAI, onTransactionsParsed, checkForDuplicates]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
      'application/pdf': ['.pdf'],
    },
    maxFiles: 1,
  });

  const clearFile = () => {
    setUploadedFile(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Upload Zone */}
      <div
        {...getRootProps()}
        className={cn(
          'relative overflow-hidden border-2 border-dashed rounded-2xl p-10 lg:p-16 text-center cursor-pointer transition-all duration-500',
          isDragActive
            ? 'border-primary bg-primary/5 scale-[1.01] shadow-glow'
            : 'border-border hover:border-primary/50 hover:bg-muted/50',
          isProcessing && 'pointer-events-none'
        )}
      >
        <input {...getInputProps()} />
        
        {/* Background glow effect */}
        <div className={cn(
          'absolute inset-0 opacity-0 transition-opacity duration-500',
          isDragActive && 'opacity-100'
        )}>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-primary/20 to-accent/20 rounded-full blur-3xl" />
        </div>

        <div className="relative flex flex-col items-center gap-6">
          <div
            className={cn(
              'w-20 h-20 rounded-3xl flex items-center justify-center transition-all duration-500 relative',
              isDragActive
                ? 'bg-gradient-to-br from-primary to-accent shadow-[0_0_40px_hsl(195_100%_50%/0.5)]'
                : 'bg-gradient-to-br from-primary/20 to-accent/20',
              isProcessing && 'animate-pulse'
            )}
          >
            {isProcessing ? (
              <Sparkles className="w-10 h-10 text-primary-foreground animate-pulse" />
            ) : (
              <Upload className={cn(
                'w-10 h-10 transition-colors duration-300',
                isDragActive ? 'text-primary-foreground' : 'text-primary'
              )} />
            )}
            {isDragActive && (
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary to-accent animate-pulse-glow" />
            )}
          </div>

          <div className="space-y-3">
            <h3 className="text-xl font-semibold text-foreground">
              {isProcessing
                ? processingMessage || 'AI is analyzing your transactions...'
                : isDragActive
                ? 'Drop your file here'
                : 'Upload Transaction File'}
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {isProcessing
                ? 'Detecting accounts, categorizing transactions, and preparing for review'
                : 'Drag and drop your bank statement or click to browse. Supports Excel, CSV, and PDF files.'}
            </p>
          </div>

          {!isProcessing && (
            <div className="flex items-center gap-3 flex-wrap justify-center">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted border border-border text-xs text-muted-foreground">
                <FileSpreadsheet className="w-4 h-4 text-primary" />
                <span>Excel, CSV</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 text-xs text-primary">
                <FileText className="w-4 h-4" />
                <span>PDF with AI</span>
                <Sparkles className="w-3 h-3" />
              </div>
            </div>
          )}
        </div>

        {/* Processing animation */}
        {isProcessing && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-2xl">
            <div className="flex flex-col items-center gap-6">
              <div className="relative">
                <div className="w-20 h-20 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary to-accent opacity-30 blur-xl animate-pulse" />
                <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-primary" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">{processingMessage || 'Processing with AI...'}</p>
                <p className="text-xs text-muted-foreground mt-1">This may take a moment</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Uploaded File Info */}
      {uploadedFile && !isProcessing && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 p-5 glass-card"
        >
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            {uploadedFile.name.endsWith('.pdf') ? (
              <FileText className="w-6 h-6 text-primary" />
            ) : (
              <FileSpreadsheet className="w-6 h-6 text-primary" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground truncate">{uploadedFile.name}</p>
            <p className="text-sm text-muted-foreground">
              {(uploadedFile.size / 1024).toFixed(1)} KB
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={clearFile} className="hover:bg-muted">
            <X className="w-4 h-4" />
          </Button>
        </motion.div>
      )}

      {/* AI Features Info */}
      <div className="grid md:grid-cols-3 gap-4">
        {[
          {
            icon: Sparkles,
            title: 'AI-Powered PDF Parsing',
            description: 'Upload bank statement PDFs and let AI extract transactions automatically',
            color: 'primary',
          },
          {
            icon: Zap,
            title: 'Smart Account Detection',
            description: 'Automatically detects which bank/card the statement belongs to',
            color: 'accent',
          },
          {
            icon: AlertCircle,
            title: 'Review Before Adding',
            description: 'Edit categories, tags, and skip transactions before confirming',
            color: 'success',
          },
        ].map((feature, index) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + index * 0.1 }}
            className="p-5 rounded-2xl bg-muted/50 border border-border hover:border-primary/30 transition-all duration-300 group"
          >
            <div className={cn(
              'w-11 h-11 rounded-xl flex items-center justify-center mb-4 transition-all duration-300',
              feature.color === 'primary' && 'bg-primary/10 text-primary group-hover:shadow-[0_0_20px_hsl(195_100%_50%/0.3)]',
              feature.color === 'accent' && 'bg-accent/10 text-accent group-hover:shadow-[0_0_20px_hsl(280_100%_65%/0.3)]',
              feature.color === 'success' && 'bg-success/10 text-success group-hover:shadow-[0_0_20px_hsl(160_100%_45%/0.3)]'
            )}>
              <feature.icon className="w-5 h-5" />
            </div>
            <h4 className="font-semibold text-foreground text-sm mb-1">{feature.title}</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">{feature.description}</p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
