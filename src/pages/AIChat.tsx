import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Send, Loader2, Sparkles, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useExpense } from '@/context/ExpenseContext';
import { useCurrency } from '@/context/CurrencyContext';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, parse, isValid } from 'date-fns';
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
}

export default function AIChat() {
  const navigate = useNavigate();
  const { transactions, categories, accounts, addTransaction } = useExpense();
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
    const thisMonth = transactions.filter(t => {
      const date = new Date(t.date);
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    });

    const totalSpent = thisMonth.filter(t => t.type === 'debit' && t.status === 'confirmed')
      .reduce((sum, t) => sum + t.amount, 0);

    const categorySpending = thisMonth
      .filter(t => t.type === 'debit' && t.status === 'confirmed')
      .reduce((acc, t) => {
        const cat = categories.find(c => c.id === t.categoryId);
        const catName = cat?.combined || 'Uncategorized';
        acc[catName] = (acc[catName] || 0) + t.amount;
        return acc;
      }, {} as Record<string, number>);

    return {
      currentMonth: format(now, 'MMMM yyyy'),
      totalSpent,
      categorySpending,
      recentTransactions: thisMonth.slice(0, 10).map(t => ({
        date: t.date,
        description: t.description,
        amount: t.amount,
        type: t.type,
        category: categories.find(c => c.id === t.categoryId)?.combined
      })),
      availableCategories: categories.map(c => c.combined),
      availableAccounts: accounts.map(a => a.name)
    };
  }, [transactions, categories, accounts]);

  const parseExpenseAction = useCallback((content: string): ExpenseAction | null => {
    const expenseMatch = content.match(/\[EXPENSE_ACTION\]([\s\S]*?)\[\/EXPENSE_ACTION\]/);
    if (!expenseMatch) return null;

    try {
      const data = JSON.parse(expenseMatch[1]);
      return {
        type: 'add_expense',
        date: data.date || format(new Date(), 'yyyy-MM-dd'),
        description: data.description || '',
        amount: parseFloat(data.amount) || 0,
        expenseType: data.type === 'credit' ? 'credit' : 'debit',
        category: data.category,
        account: data.account
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
        category: matchedCategory?.id || '',
        account: matchedAccount?.id || ''
      }
    }));
  }, [categories, accounts]);

  const updateInlineForm = useCallback((index: number, field: keyof InlineFormState, value: string) => {
    setInlineForms(prev => ({
      ...prev,
      [index]: { ...prev[index], [field]: value }
    }));
  }, []);

  const handleInlineSubmit = useCallback(async (index: number, action: ExpenseAction) => {
    const form = inlineForms[index];
    if (!form) return;

    const amount = parseFloat(form.amount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: 'Invalid amount', variant: 'destructive' });
      return;
    }

    try {
      await addTransaction({
        date: form.date,
        description: form.description || action.description,
        amount,
        type: action.expenseType,
        categoryId: form.category || null,
        accountId: form.account || null,
        status: 'confirmed',
        tagIds: []
      });

      toast({ title: 'Transaction added!' });

      setMessages(prev => prev.map((msg, i) => {
        if (i === index) {
          return { ...msg, expenseAction: undefined };
        }
        return msg;
      }));
    } catch (error) {
      toast({ title: 'Failed to add transaction', variant: 'destructive' });
    }
  }, [inlineForms, addTransaction]);

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
    return content.replace(/\[EXPENSE_ACTION\][\s\S]*?\[\/EXPENSE_ACTION\]/g, '').trim();
  }, []);

  const quickActions = useMemo(() => [
    "What did I spend this month?",
    "Show my top categories",
    "How much on food?"
  ], []);

  return (
    <Layout hideAIButton>
      <div className="flex flex-col h-[calc(100vh-8rem)] lg:h-[calc(100vh-4rem)]">
        {/* Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-border/50">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => navigate(-1)}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
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
                  {message.expenseAction && (
                    <div className="mt-3 p-3 rounded-lg bg-background/80 border border-border/50 space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">Add this expense:</p>

                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          type="date"
                          value={inlineForms[index]?.date || message.expenseAction.date}
                          onChange={(e) => updateInlineForm(index, 'date', e.target.value)}
                          className="h-8 text-xs"
                        />
                        <Input
                          type="number"
                          step="0.01"
                          value={inlineForms[index]?.amount || message.expenseAction.amount}
                          onChange={(e) => updateInlineForm(index, 'amount', e.target.value)}
                          className="h-8 text-xs"
                          placeholder="Amount"
                        />
                      </div>

                      <Input
                        value={inlineForms[index]?.description || message.expenseAction.description}
                        onChange={(e) => updateInlineForm(index, 'description', e.target.value)}
                        className="h-8 text-xs"
                        placeholder="Description"
                      />

                      <div className="grid grid-cols-2 gap-2">
                        <Select
                          value={inlineForms[index]?.category || ''}
                          onValueChange={(v) => updateInlineForm(index, 'category', v)}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Category" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map(cat => (
                              <SelectItem key={cat.id} value={cat.id} className="text-xs">
                                {cat.combined}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Select
                          value={inlineForms[index]?.account || ''}
                          onValueChange={(v) => updateInlineForm(index, 'account', v)}
                        >
                          <SelectTrigger className="h-8 text-xs">
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

                      <Button
                        size="sm"
                        className="w-full h-8 text-xs"
                        onClick={() => handleInlineSubmit(index, message.expenseAction!)}
                      >
                        Add Transaction
                      </Button>
                    </div>
                  )}
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
