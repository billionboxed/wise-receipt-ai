import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Sparkles, Loader2, Plus, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useExpense } from '@/context/ExpenseContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/context/CurrencyContext';
import { Transaction } from '@/types/expense';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  expenseAction?: ExpenseAction | null;
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
  const { transactions, categories, accounts, getCategoryById, addTransaction } = useExpense();
  const { toast } = useToast();
  const { formatAmount } = useCurrency();

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

  // Create inline form state for each message with expense action
  const [inlineForms, setInlineForms] = useState<Record<number, {
    date: string;
    description: string;
    amount: string;
    categoryId: string;
    accountId: string;
    isSubmitting: boolean;
    isAdded: boolean;
  }>>({});

  const initializeInlineForm = (messageIndex: number, expenseAction: ExpenseAction) => {
    if (inlineForms[messageIndex]) return;
    
    const matchingCategory = categories.find(
      c => c.combined.toLowerCase().includes(expenseAction.suggestedCategory?.toLowerCase() || '')
    );

    // Use AI-parsed date if provided, otherwise default to today
    const today = new Date().toISOString().split('T')[0];
    const formDate = expenseAction.date || today;
    
    setInlineForms(prev => ({
      ...prev,
      [messageIndex]: {
        date: formDate,
        description: expenseAction.description,
        amount: expenseAction.amount.toString(),
        categoryId: matchingCategory?.id || categories[0]?.id || '',
        accountId: accounts[0]?.id || '',
        isSubmitting: false,
        isAdded: false,
      }
    }));
  };

  const updateInlineForm = (messageIndex: number, field: string, value: string) => {
    setInlineForms(prev => ({
      ...prev,
      [messageIndex]: {
        ...prev[messageIndex],
        [field]: value,
      }
    }));
  };

  const handleInlineSubmit = async (messageIndex: number) => {
    const form = inlineForms[messageIndex];
    if (!form || form.isSubmitting || form.isAdded) return;

    if (!form.description || !form.amount || !form.categoryId || !form.accountId) {
      toast({
        title: 'Missing Fields',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    const amount = parseFloat(form.amount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid amount.',
        variant: 'destructive',
      });
      return;
    }

    setInlineForms(prev => ({
      ...prev,
      [messageIndex]: { ...prev[messageIndex], isSubmitting: true }
    }));

    const newTransaction: Transaction = {
      id: `t_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      date: form.date,
      description: form.description,
      amount,
      type: 'debit',
      categoryId: form.categoryId,
      accountId: form.accountId,
      tagIds: [],
      status: 'confirmed',
    };

    addTransaction(newTransaction);
    
    setInlineForms(prev => ({
      ...prev,
      [messageIndex]: { ...prev[messageIndex], isSubmitting: false, isAdded: true }
    }));

    toast({
      title: 'Transaction Added',
      description: `${form.description} - ${formatAmount(amount)} has been added.`,
    });
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
            messages: [...messages.map(m => ({ role: m.role, content: m.content })), { role: userMessage.role, content: userMessage.content }],
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

      // Parse expense action and add to the final message
      const expenseAction = parseExpenseAction(assistantContent);
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant') {
          return prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, expenseAction } : m
          );
        }
        return prev;
      });
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
                      'flex flex-col gap-2',
                      message.role === 'user' ? 'items-end' : 'items-start'
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
                    
                    {/* Inline Add Transaction Form */}
                    {message.role === 'assistant' && message.expenseAction && (() => {
                      // Initialize form if not yet done
                      if (!inlineForms[index]) {
                        initializeInlineForm(index, message.expenseAction);
                      }
                      const form = inlineForms[index];
                      if (!form) return null;
                      
                      if (form.isAdded) {
                        return (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex items-center gap-2 text-sm text-green-400"
                          >
                            <Check className="w-4 h-4" />
                            <span>Transaction added successfully!</span>
                          </motion.div>
                        );
                      }

                      return (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="w-full max-w-[95%] mt-2 p-3 rounded-xl bg-background/60 border border-border/50 space-y-3"
                        >
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Plus className="w-3 h-3" />
                            <span>Add Transaction</span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">Date</Label>
                              <Input
                                type="date"
                                value={form.date}
                                onChange={(e) => updateInlineForm(index, 'date', e.target.value)}
                                className="h-8 text-xs bg-background/50"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">Amount</Label>
                              <Input
                                type="number"
                                value={form.amount}
                                onChange={(e) => updateInlineForm(index, 'amount', e.target.value)}
                                placeholder="0.00"
                                className="h-8 text-xs bg-background/50"
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Description</Label>
                            <Input
                              value={form.description}
                              onChange={(e) => updateInlineForm(index, 'description', e.target.value)}
                              placeholder="Description"
                              className="h-8 text-xs bg-background/50"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">Category</Label>
                              <Select
                                value={form.categoryId}
                                onValueChange={(value) => updateInlineForm(index, 'categoryId', value)}
                              >
                                <SelectTrigger className="h-8 text-xs bg-background/50">
                                  <SelectValue placeholder="Category" />
                                </SelectTrigger>
                                <SelectContent className="max-h-48">
                                  {categories.map(cat => (
                                    <SelectItem key={cat.id} value={cat.id} className="text-xs">
                                      {cat.combined}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">Account</Label>
                              <Select
                                value={form.accountId}
                                onValueChange={(value) => updateInlineForm(index, 'accountId', value)}
                              >
                                <SelectTrigger className="h-8 text-xs bg-background/50">
                                  <SelectValue placeholder="Account" />
                                </SelectTrigger>
                                <SelectContent>
                                  {accounts.map(acc => (
                                    <SelectItem key={acc.id} value={acc.id} className="text-xs">
                                      {acc.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <Button
                            size="sm"
                            className="w-full h-8 text-xs gap-2"
                            onClick={() => handleInlineSubmit(index)}
                            disabled={form.isSubmitting}
                          >
                            {form.isSubmitting ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Plus className="w-3 h-3" />
                            )}
                            Add {form.description} - {formatAmount(parseFloat(form.amount) || 0)}
                          </Button>
                        </motion.div>
                      );
                    })()}
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
