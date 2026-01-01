import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useExpense } from '@/context/ExpenseContext';
import { useTransactionDialog } from '@/context/TransactionDialogContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ExpenseAction {
  action: 'add_expense';
  date: string;
  description: string;
  amount: number;
  type: 'debit' | 'credit';
  suggestedCategory?: string;
}

interface ExpenseAIChatProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ExpenseAIChat({ isOpen, onClose }: ExpenseAIChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { transactions, categories, accounts, getCategoryById } = useExpense();
  const { openAddDialog } = useTransactionDialog();
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const getExpenseContext = useCallback(() => {
    const confirmedTransactions = transactions.filter(t => t.status === 'confirmed');
    const recentTransactions = confirmedTransactions.slice(0, 20).map(t => ({
      date: t.date,
      description: t.description,
      amount: t.amount,
      type: t.type,
      category: t.categoryId ? getCategoryById(t.categoryId)?.combined : 'Uncategorized',
    }));

    const totalExpenses = confirmedTransactions
      .filter(t => t.type === 'debit')
      .reduce((sum, t) => sum + t.amount, 0);

    const categoryBreakdown = confirmedTransactions
      .filter(t => t.type === 'debit')
      .reduce((acc, t) => {
        const cat = t.categoryId ? getCategoryById(t.categoryId)?.combined || 'Uncategorized' : 'Uncategorized';
        acc[cat] = (acc[cat] || 0) + t.amount;
        return acc;
      }, {} as Record<string, number>);

    return {
      totalTransactions: confirmedTransactions.length,
      totalExpenses,
      categoryBreakdown,
      recentTransactions,
      availableCategories: categories.map(c => ({ id: c.id, name: c.combined })),
      availableAccounts: accounts.map(a => ({ id: a.id, name: a.name })),
    };
  }, [transactions, categories, accounts, getCategoryById]);

  const parseExpenseAction = (content: string): ExpenseAction | null => {
    const expenseMatch = content.match(/```expense\s*([\s\S]*?)```/);
    if (expenseMatch) {
      try {
        return JSON.parse(expenseMatch[1].trim());
      } catch {
        return null;
      }
    }
    return null;
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    let assistantContent = '';

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/expense-ai-chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: [...messages, userMessage],
            expenseContext: getExpenseContext(),
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get response');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response stream');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === 'assistant') {
                  return prev.map((m, i) =>
                    i === prev.length - 1 ? { ...m, content: assistantContent } : m
                  );
                }
                return [...prev, { role: 'assistant', content: assistantContent }];
              });
            }
          } catch {
            buffer = line + '\n' + buffer;
            break;
          }
        }
      }

      // Check for expense action in response - open the transaction dialog with prefilled data
      const expenseAction = parseExpenseAction(assistantContent);
      if (expenseAction) {
        // Find matching category
        const matchingCategory = categories.find(
          c => c.combined.toLowerCase().includes(expenseAction.suggestedCategory?.toLowerCase() || '')
        );
        
        // Open the transaction dialog with prefilled data
        openAddDialog({
          date: expenseAction.date,
          description: expenseAction.description,
          amount: expenseAction.amount,
          type: expenseAction.type,
          categoryId: matchingCategory?.id || null,
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send message',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatMessage = (content: string) => {
    // Remove expense code blocks from display
    let formatted = content.replace(/```expense[\s\S]*?```/g, '').trim();
    return formatted;
  };

  // Render formatted text with basic markdown support
  const renderFormattedText = (text: string) => {
    const lines = text.split('\n');
    
    return lines.map((line, lineIdx) => {
      // Handle headers
      if (line.startsWith('### ')) {
        return <h4 key={lineIdx} className="font-semibold text-sm mt-2 mb-1">{line.slice(4)}</h4>;
      }
      if (line.startsWith('## ')) {
        return <h3 key={lineIdx} className="font-semibold text-sm mt-2 mb-1">{line.slice(3)}</h3>;
      }
      if (line.startsWith('# ')) {
        return <h2 key={lineIdx} className="font-bold text-sm mt-2 mb-1">{line.slice(2)}</h2>;
      }

      // Handle bullet points
      if (line.match(/^[-•*]\s/)) {
        const content = line.slice(2);
        return (
          <div key={lineIdx} className="flex gap-2 ml-1">
            <span className="text-primary">•</span>
            <span>{renderInlineFormatting(content)}</span>
          </div>
        );
      }

      // Handle numbered lists
      if (line.match(/^\d+\.\s/)) {
        const match = line.match(/^(\d+)\.\s(.*)$/);
        if (match) {
          return (
            <div key={lineIdx} className="flex gap-2 ml-1">
              <span className="text-muted-foreground min-w-[1.2rem]">{match[1]}.</span>
              <span>{renderInlineFormatting(match[2])}</span>
            </div>
          );
        }
      }

      // Empty lines
      if (line.trim() === '') {
        return <div key={lineIdx} className="h-2" />;
      }

      // Regular paragraph
      return <p key={lineIdx} className="leading-relaxed">{renderInlineFormatting(line)}</p>;
    });
  };

  // Handle inline formatting (bold, italic, code)
  const renderInlineFormatting = (text: string) => {
    // Handle **bold**, *italic*, `code`, and ₹ amounts
    const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|₹[\d,]+)/g);
    
    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={idx} className="font-semibold">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return <em key={idx}>{part.slice(1, -1)}</em>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={idx} className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">{part.slice(1, -1)}</code>;
      }
      if (part.match(/^₹[\d,]+$/)) {
        return <span key={idx} className="text-primary font-semibold">{part}</span>;
      }
      return part;
    });
  };

  const quickActions = [
    { label: 'Spending insights', prompt: 'Give me insights on my spending patterns' },
    { label: 'This month', prompt: 'Summarize my expenses this month' },
    { label: 'Top categories', prompt: 'What are my top spending categories?' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-36 right-4 z-50 w-[400px] max-w-[calc(100vw-2rem)] h-[450px] max-h-[60vh] lg:bottom-20 lg:h-[520px] lg:max-h-[70vh] glass-card flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border/50">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Expense AI</h3>
                <p className="text-xs text-muted-foreground">Insights & Add Expenses</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            {messages.length === 0 ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground text-center">
                  Ask me about your expenses or tell me to add one!
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {quickActions.map((action) => (
                    <Button
                      key={action.label}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => {
                        setInput(action.prompt);
                        inputRef.current?.focus();
                      }}
                    >
                      {action.label}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      'flex',
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    <div
                      className={cn(
                        'max-w-[90%] rounded-2xl px-4 py-3 text-sm',
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary/80 text-secondary-foreground'
                      )}
                    >
                      {message.role === 'assistant' 
                        ? renderFormattedText(formatMessage(message.content))
                        : <p>{message.content}</p>
                      }
                    </div>
                  </motion.div>
                ))}

                {isLoading && messages[messages.length - 1]?.role === 'user' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex justify-start"
                  >
                    <div className="bg-secondary rounded-2xl px-4 py-2.5">
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </div>
                  </motion.div>
                )}
              </div>
            )}
          </ScrollArea>

          {/* Input */}
          <div className="p-4 border-t border-border/50">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage();
              }}
              className="flex gap-2"
            >
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about expenses or add one..."
                className="flex-1 bg-background/50"
                disabled={isLoading}
              />
              <Button
                type="submit"
                size="icon"
                disabled={isLoading || !input.trim()}
                className="btn-glow"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </form>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
