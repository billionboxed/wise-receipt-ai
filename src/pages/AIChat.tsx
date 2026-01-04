import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Send, Loader2, Sparkles, Plus, Check, X } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useExpense } from '@/context/ExpenseContext';
import { useCurrency } from '@/context/CurrencyContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  expenseAction?: ExpenseAction;
}

interface ExpenseAction {
  type: 'add_expense';
  date: string;
  description: string;
  amount: number;
  expenseType: 'debit' | 'credit';
  category?: string;
  account?: string;
}

interface InlineFormState {
  date: string;
  description: string;
  amount: string;
  category: string;
  account: string;
  tagIds: string[];
  isSubmitting: boolean;
  isAdded: boolean;
}

export default function AIChat() {
  const { transactions, categories, accounts, tags, addTransaction } = useExpense();
  const { formatAmount } = useCurrency();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hi! I'm your expense assistant. Ask me about your spending, or tell me about an expense to add it. For example: \"I spent $45 on groceries yesterday\" or \"What did I spend on food this month?\""
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [inlineForms, setInlineForms] = useState<Record<number, InlineFormState>>({});

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const getExpenseContext = useCallback(() => {
    const now = new Date();
    const confirmedTransactions = transactions.filter(t => t.status === 'confirmed');
    
    // Current month transactions
    const thisMonth = confirmedTransactions.filter(t => {
      const date = new Date(t.date);
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    });

    const thisMonthSpent = thisMonth.filter(t => t.type === 'debit')
      .reduce((sum, t) => sum + t.amount, 0);

    // All-time spending by category
    const categorySpending = confirmedTransactions
      .filter(t => t.type === 'debit')
      .reduce((acc, t) => {
        const cat = categories.find(c => c.id === t.categoryId);
        const catName = cat?.combined || 'Uncategorized';
        acc[catName] = (acc[catName] || 0) + t.amount;
        return acc;
      }, {} as Record<string, number>);

    // Spending by year
    const yearlySpending = confirmedTransactions
      .filter(t => t.type === 'debit')
      .reduce((acc, t) => {
        const year = new Date(t.date).getFullYear().toString();
        acc[year] = (acc[year] || 0) + t.amount;
        return acc;
      }, {} as Record<string, number>);

    // Total all-time spending
    const totalAllTimeSpent = confirmedTransactions
      .filter(t => t.type === 'debit')
      .reduce((sum, t) => sum + t.amount, 0);

    // Spending by tag
    const tagSpending = confirmedTransactions
      .filter(t => t.type === 'debit' && t.tagIds && t.tagIds.length > 0)
      .reduce((acc, t) => {
        t.tagIds?.forEach(tagId => {
          const tag = tags.find(tg => tg.id === tagId);
          if (tag) {
            acc[tag.name] = (acc[tag.name] || 0) + t.amount;
          }
        });
        return acc;
      }, {} as Record<string, number>);

    return {
      currentDate: format(now, 'MMMM d, yyyy'),
      currentMonth: format(now, 'MMMM yyyy'),
      thisMonthSpent,
      totalAllTimeSpent,
      yearlySpending,
      categorySpending,
      tagSpending,
      transactionCount: confirmedTransactions.length,
      recentTransactions: thisMonth.slice(0, 10).map(t => ({
        date: t.date,
        description: t.description,
        amount: t.amount,
        type: t.type,
        category: categories.find(c => c.id === t.categoryId)?.combined,
        tags: t.tagIds?.map(tid => tags.find(tg => tg.id === tid)?.name).filter(Boolean)
      })),
      availableCategories: categories.map(c => c.combined),
      availableAccounts: accounts.map(a => a.name),
      availableTags: tags.map(t => ({ name: t.name, isArchived: t.isArchived, isProject: t.isProject }))
    };
  }, [transactions, categories, accounts, tags]);

  const parseExpenseAction = useCallback((content: string): ExpenseAction | null => {
    const codeBlockMatch = content.match(/```expense\s*([\s\S]*?)```/i);
    const taggedMatch = content.match(/\[EXPENSE_ACTION\]([\s\S]*?)\[\/EXPENSE_ACTION\]/i);

    const jsonText = (codeBlockMatch?.[1] ?? taggedMatch?.[1])?.trim();
    if (!jsonText) return null;

    try {
      const data = JSON.parse(jsonText);

      // Accept either legacy formats or the current ```expense``` format.
      if ((data?.action ?? data?.type) == null) return null;

      return {
        type: 'add_expense',
        date: data.date || format(new Date(), 'yyyy-MM-dd'),
        description: data.description || '',
        amount: Number(data.amount) || 0,
        expenseType: data.type === 'credit' ? 'credit' : 'debit',
        category: data.suggestedCategory ?? data.category,
        account: data.account,
      };
    } catch {
      return null;
    }
  }, []);

  const initializeInlineForm = useCallback((index: number, action: ExpenseAction) => {
    const matchedCategory = categories.find(c =>
      c.combined.toLowerCase().includes(action.category?.toLowerCase() || '') ||
      action.category?.toLowerCase().includes(c.combined.toLowerCase())
    );

    const matchedAccount = accounts.find(a =>
      a.name.toLowerCase().includes(action.account?.toLowerCase() || '') ||
      action.account?.toLowerCase().includes(a.name.toLowerCase())
    );

    setInlineForms(prev => ({
      ...prev,
      [index]: {
        date: action.date,
        description: action.description,
        amount: action.amount.toString(),
        category: matchedCategory?.id || categories[0]?.id || '',
        account: matchedAccount?.id || accounts[0]?.id || '',
        tagIds: [],
        isSubmitting: false,
        isAdded: false,
      }
    }));
  }, [categories, accounts]);

  const updateInlineForm = useCallback((index: number, field: keyof InlineFormState, value: string | string[]) => {
    setInlineForms(prev => ({
      ...prev,
      [index]: { ...prev[index], [field]: value }
    }));
  }, []);

  const toggleTag = useCallback((index: number, tagId: string) => {
    setInlineForms(prev => {
      const form = prev[index];
      if (!form) return prev;
      const newTagIds = form.tagIds.includes(tagId)
        ? form.tagIds.filter(id => id !== tagId)
        : [...form.tagIds, tagId];
      return { ...prev, [index]: { ...form, tagIds: newTagIds } };
    });
  }, []);

  const handleInlineSubmit = useCallback(async (index: number, action: ExpenseAction) => {
    const form = inlineForms[index];
    if (!form || form.isSubmitting || form.isAdded) return;

    if (!form.description || !form.amount || !form.category || !form.account) {
      toast({ title: 'Please fill all fields', variant: 'destructive' });
      return;
    }

    const amount = parseFloat(form.amount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: 'Invalid amount', variant: 'destructive' });
      return;
    }

    setInlineForms(prev => ({
      ...prev,
      [index]: { ...prev[index], isSubmitting: true }
    }));

    try {
      await addTransaction({
        date: form.date,
        description: form.description,
        amount,
        type: action.expenseType,
        categoryId: form.category || null,
        accountId: form.account || null,
        status: 'confirmed',
        tagIds: form.tagIds,
      });

      setInlineForms(prev => ({
        ...prev,
        [index]: { ...prev[index], isSubmitting: false, isAdded: true }
      }));

      toast({ title: 'Transaction added!', description: `${form.description} - ${formatAmount(amount)}` });
    } catch (error) {
      setInlineForms(prev => ({
        ...prev,
        [index]: { ...prev[index], isSubmitting: false }
      }));
      toast({ title: 'Failed to add transaction', variant: 'destructive' });
    }
  }, [inlineForms, addTransaction, formatAmount]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const context = getExpenseContext();

      const { data, error } = await supabase.functions.invoke('expense-ai-chat', {
        body: {
          message: userMessage,
          context,
          conversationHistory: messages.slice(-10)
        }
      });

      if (error) throw error;

      const responseContent = data.response || "I'm sorry, I couldn't process that request.";
      const expenseAction = parseExpenseAction(responseContent);

      const newMessageIndex = messages.length + 1;

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: responseContent,
        expenseAction: expenseAction || undefined
      }]);

      if (expenseAction) {
        setTimeout(() => initializeInlineForm(newMessageIndex, expenseAction), 100);
      }

    } catch (error) {
      console.error('AI Chat error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "Sorry, I encountered an error. Please try again."
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, getExpenseContext, parseExpenseAction, initializeInlineForm]);

  const formatMessage = useCallback((content: string) => {
    return content
      .replace(/```expense[\s\S]*?```/gi, '')
      .replace(/\[EXPENSE_ACTION\][\s\S]*?\[\/EXPENSE_ACTION\]/gi, '')
      .trim();
  }, []);

  const quickActions = useMemo(() => [
    "What did I spend this month?",
    "Show my top categories",
    "How much on food?"
  ], []);

  return (
    <Layout>
      <div className="flex flex-col h-[calc(100vh-10rem)] lg:h-[calc(100vh-6rem)]">
        {/* Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-border/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-semibold text-foreground">AI Assistant</h1>
              <p className="text-xs text-muted-foreground">Expense insights & tracking</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 pr-2" ref={scrollRef}>
          <div className="space-y-4 py-4">
            {messages.map((message, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted/50 text-foreground'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{formatMessage(message.content)}</p>

                  {/* Inline expense form */}
                  {message.expenseAction && (() => {
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
                          className="mt-3 flex items-center gap-2 text-sm text-green-500"
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
                        className="mt-3 p-3 rounded-xl bg-background/60 border border-border/50 space-y-3"
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
                              step="0.01"
                              value={form.amount}
                              onChange={(e) => updateInlineForm(index, 'amount', e.target.value)}
                              className="h-8 text-xs bg-background/50"
                              placeholder="0.00"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Description</Label>
                          <Input
                            value={form.description}
                            onChange={(e) => updateInlineForm(index, 'description', e.target.value)}
                            className="h-8 text-xs bg-background/50"
                            placeholder="Description"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Category</Label>
                            <Select
                              value={form.category}
                              onValueChange={(v) => updateInlineForm(index, 'category', v)}
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
                              value={form.account}
                              onValueChange={(v) => updateInlineForm(index, 'account', v)}
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

                        {/* Tags */}
                        {tags.length > 0 && (
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Tags</Label>
                            <div className="flex flex-wrap gap-1.5 p-2 rounded-lg bg-background/50 border border-border/50 min-h-[36px]">
                              {tags.filter(t => !t.isArchived).map(tag => {
                                const isSelected = form.tagIds.includes(tag.id);
                                return (
                                  <Badge
                                    key={tag.id}
                                    variant="secondary"
                                    className="cursor-pointer text-xs transition-all hover:scale-105"
                                    style={{
                                      backgroundColor: isSelected ? tag.color : 'transparent',
                                      color: isSelected ? '#ffffff' : tag.color,
                                      borderColor: tag.color,
                                      borderWidth: '1px',
                                      textShadow: isSelected ? '0 1px 2px rgba(0,0,0,0.3)' : 'none',
                                    }}
                                    onClick={() => toggleTag(index, tag.id)}
                                  >
                                    {tag.name}
                                    {isSelected && <X className="w-2.5 h-2.5 ml-1" />}
                                  </Badge>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        <Button
                          size="sm"
                          className="w-full h-8 text-xs gap-2"
                          onClick={() => handleInlineSubmit(index, message.expenseAction!)}
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
                </div>
              </motion.div>
            ))}

            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-start"
              >
                <div className="bg-muted/50 rounded-2xl px-4 py-2.5">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              </motion.div>
            )}
          </div>
        </ScrollArea>

        {/* Quick Actions */}
        {messages.length === 1 && (
          <div className="flex gap-2 flex-wrap py-2">
            {quickActions.map((action) => (
              <Button
                key={action}
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => {
                  setInput(action);
                  setTimeout(() => inputRef.current?.focus(), 0);
                }}
              >
                {action}
              </Button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="flex items-center gap-2 pt-2 border-t border-border/50">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="Ask about spending or add an expense..."
            className="flex-1"
            disabled={isLoading}
          />
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="bg-gradient-to-r from-primary to-accent"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Layout>
  );
}
