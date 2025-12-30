import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Upload, FileSpreadsheet, X, Sparkles, AlertCircle } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import { useExpense } from '@/context/ExpenseContext';
import { ParsedTransaction } from '@/types/expense';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

interface FileUploadProps {
  onTransactionsParsed: (transactions: ParsedTransaction[]) => void;
}

export function FileUpload({ onTransactionsParsed }: FileUploadProps) {
  const { accounts, categories } = useExpense();
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const detectAccount = useCallback(
    (text: string): string | undefined => {
      const lowerText = text.toLowerCase();
      for (const account of accounts) {
        if (lowerText.includes(account.name.toLowerCase())) {
          return account.id;
        }
        // Check for common variations
        if (account.name.includes('ICICI') && lowerText.includes('icici')) return account.id;
        if (account.name.includes('HDFC') && lowerText.includes('hdfc')) return account.id;
        if (account.name.includes('Axis') && lowerText.includes('axis')) return account.id;
        if (account.name.includes('Kotak') && lowerText.includes('kotak')) return account.id;
      }
      return undefined;
    },
    [accounts]
  );

  const suggestCategory = useCallback(
    (description: string): string => {
      const lowerDesc = description.toLowerCase();

      // Category detection rules
      const rules: { keywords: string[]; categoryMain: string }[] = [
        { keywords: ['grocery', 'supermarket', 'big bazaar', 'dmart', 'reliance fresh'], categoryMain: 'Household' },
        { keywords: ['fuel', 'petrol', 'diesel', 'hp', 'indian oil', 'bharat petroleum'], categoryMain: 'Fuel' },
        { keywords: ['restaurant', 'food', 'zomato', 'swiggy', 'uber eats', 'dominos', 'pizza'], categoryMain: 'Food' },
        { keywords: ['netflix', 'spotify', 'amazon prime', 'disney', 'subscription', 'hotstar'], categoryMain: 'Subscriptions' },
        { keywords: ['electricity', 'bill', 'water', 'gas', 'internet', 'mobile', 'phone'], categoryMain: 'Household' },
        { keywords: ['movie', 'pvr', 'inox', 'cinema', 'entertainment'], categoryMain: 'Entertainment' },
        { keywords: ['zara', 'h&m', 'clothes', 'apparel', 'fashion', 'shopping'], categoryMain: 'Apparel' },
        { keywords: ['doctor', 'hospital', 'medical', 'pharmacy', 'medicine', 'health'], categoryMain: 'Health' },
        { keywords: ['vacation', 'travel', 'hotel', 'flight', 'trip', 'holiday'], categoryMain: 'Vacation' },
        { keywords: ['school', 'college', 'course', 'education', 'tuition'], categoryMain: 'Education' },
        { keywords: ['maintenance', 'service', 'repair', 'car', 'bike'], categoryMain: 'Transportation' },
        { keywords: ['insurance', 'premium', 'policy'], categoryMain: 'Transportation' },
      ];

      for (const rule of rules) {
        if (rule.keywords.some(keyword => lowerDesc.includes(keyword))) {
          const category = categories.find(c => c.main === rule.categoryMain);
          if (category) return category.id;
        }
      }

      // Default to Misc
      const miscCategory = categories.find(c => c.main === 'Misc');
      return miscCategory?.id || '23';
    },
    [categories]
  );

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

            // Detect header row and column mapping
            const headerRow = jsonData[0] || [];
            const columnMap: Record<string, number> = {};

            headerRow.forEach((header: string, index: number) => {
              const lowerHeader = String(header).toLowerCase();
              if (lowerHeader.includes('date')) columnMap.date = index;
              if (lowerHeader.includes('description') || lowerHeader.includes('narration') || lowerHeader.includes('particular'))
                columnMap.description = index;
              if (lowerHeader.includes('amount') || lowerHeader.includes('value')) columnMap.amount = index;
              if (lowerHeader.includes('debit') || lowerHeader.includes('withdrawal')) columnMap.debit = index;
              if (lowerHeader.includes('credit') || lowerHeader.includes('deposit')) columnMap.credit = index;
            });

            // Parse transactions
            const transactions: ParsedTransaction[] = [];
            const allText = jsonData.flat().join(' ');
            const detectedAccount = detectAccount(allText);

            for (let i = 1; i < jsonData.length; i++) {
              const row = jsonData[i];
              if (!row || row.length === 0) continue;

              let date = '';
              let description = '';
              let amount = 0;
              let type: 'debit' | 'credit' = 'debit';

              // Extract date
              if (columnMap.date !== undefined) {
                const dateValue = row[columnMap.date];
                if (dateValue) {
                  if (typeof dateValue === 'number') {
                    // Excel date serial number
                    const excelDate = XLSX.SSF.parse_date_code(dateValue);
                    date = `${excelDate.y}-${String(excelDate.m).padStart(2, '0')}-${String(excelDate.d).padStart(2, '0')}`;
                  } else {
                    date = String(dateValue);
                  }
                }
              }

              // Extract description
              if (columnMap.description !== undefined) {
                description = String(row[columnMap.description] || '');
              }

              // Extract amount and type
              if (columnMap.debit !== undefined && columnMap.credit !== undefined) {
                const debitVal = parseFloat(row[columnMap.debit]) || 0;
                const creditVal = parseFloat(row[columnMap.credit]) || 0;
                if (debitVal > 0) {
                  amount = debitVal;
                  type = 'debit';
                } else if (creditVal > 0) {
                  amount = creditVal;
                  type = 'credit';
                }
              } else if (columnMap.amount !== undefined) {
                const amountVal = parseFloat(row[columnMap.amount]) || 0;
                amount = Math.abs(amountVal);
                type = amountVal < 0 ? 'debit' : 'credit';
              }

              // Skip invalid rows
              if (!description || amount === 0) continue;

              // Format date if needed
              if (date && !date.match(/^\d{4}-\d{2}-\d{2}$/)) {
                try {
                  const parsedDate = new Date(date);
                  if (!isNaN(parsedDate.getTime())) {
                    date = parsedDate.toISOString().split('T')[0];
                  }
                } catch {
                  date = new Date().toISOString().split('T')[0];
                }
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

      try {
        const transactions = await parseExcelFile(file);
        
        if (transactions.length === 0) {
          toast({
            title: 'No transactions found',
            description: 'The file appears to be empty or in an unsupported format.',
            variant: 'destructive',
          });
          return;
        }

        toast({
          title: 'File processed successfully',
          description: `Found ${transactions.length} transactions. AI has suggested categories.`,
        });

        onTransactionsParsed(transactions);
      } catch (error) {
        console.error('Error parsing file:', error);
        toast({
          title: 'Error processing file',
          description: 'Please check the file format and try again.',
          variant: 'destructive',
        });
      } finally {
        setIsProcessing(false);
      }
    },
    [parseExcelFile, onTransactionsParsed]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
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
          'relative border-2 border-dashed rounded-xl p-8 lg:p-12 text-center cursor-pointer transition-all duration-300',
          isDragActive
            ? 'border-primary bg-primary/5 scale-[1.02]'
            : 'border-border hover:border-primary/50 hover:bg-muted/50',
          isProcessing && 'pointer-events-none opacity-70'
        )}
      >
        <input {...getInputProps()} />

        <div className="flex flex-col items-center gap-4">
          <div
            className={cn(
              'w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300',
              isDragActive
                ? 'bg-primary text-primary-foreground scale-110'
                : 'bg-primary/10 text-primary'
            )}
          >
            {isProcessing ? (
              <Sparkles className="w-8 h-8 animate-pulse" />
            ) : (
              <Upload className="w-8 h-8" />
            )}
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold">
              {isProcessing
                ? 'AI is analyzing your transactions...'
                : isDragActive
                ? 'Drop your file here'
                : 'Upload Transaction File'}
            </h3>
            <p className="text-sm text-muted-foreground max-w-md">
              {isProcessing
                ? 'Detecting accounts, categorizing transactions, and preparing for review'
                : 'Drag and drop your bank statement or click to browse. Supports Excel (.xlsx, .xls) and CSV files.'}
            </p>
          </div>

          {!isProcessing && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <FileSpreadsheet className="w-4 h-4" />
              <span>Excel, CSV supported</span>
            </div>
          )}
        </div>

        {/* Processing animation */}
        {isProcessing && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-xl">
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-primary" />
              </div>
              <p className="text-sm font-medium">Processing with AI...</p>
            </div>
          </div>
        )}
      </div>

      {/* Uploaded File Info */}
      {uploadedFile && !isProcessing && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 p-4 bg-card rounded-lg border border-border shadow-sm"
        >
          <FileSpreadsheet className="w-10 h-10 text-primary" />
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{uploadedFile.name}</p>
            <p className="text-sm text-muted-foreground">
              {(uploadedFile.size / 1024).toFixed(1)} KB
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={clearFile}>
            <X className="w-4 h-4" />
          </Button>
        </motion.div>
      )}

      {/* AI Features Info */}
      <div className="grid md:grid-cols-3 gap-4">
        {[
          {
            icon: Sparkles,
            title: 'Smart Categorization',
            description: 'AI automatically suggests categories based on transaction descriptions',
          },
          {
            icon: FileSpreadsheet,
            title: 'Account Detection',
            description: 'Detects which account the statement belongs to from file content',
          },
          {
            icon: AlertCircle,
            title: 'Review Before Adding',
            description: 'Edit categories, tags, and skip transactions before confirming',
          },
        ].map((feature, index) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + index * 0.1 }}
            className="p-4 rounded-lg bg-muted/50 border border-border/50"
          >
            <feature.icon className="w-6 h-6 text-primary mb-3" />
            <h4 className="font-medium text-sm mb-1">{feature.title}</h4>
            <p className="text-xs text-muted-foreground">{feature.description}</p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
