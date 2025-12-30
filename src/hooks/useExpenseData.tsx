import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from './use-toast';

export interface Category {
  id: string;
  main: string;
  sub: string;
  combined: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface Account {
  id: string;
  name: string;
  type: 'bank' | 'credit' | 'cash' | 'wallet';
}

export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'debit' | 'credit';
  categoryId: string | null;
  accountId: string | null;
  tagIds: string[];
  status: 'pending' | 'confirmed' | 'skipped';
  aiSuggested?: boolean;
}

export interface ParsedTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'debit' | 'credit';
  suggestedCategoryId?: string;
  suggestedAccountId?: string;
  suggestedTagIds?: string[];
  selected: boolean;
  confirmed: boolean;
  isDuplicate?: boolean;
  duplicateOf?: string;
}


export function useExpenseData() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [parsedTransactions, setParsedTransactions] = useState<ParsedTransaction[]>([]);
  const [loading, setLoading] = useState(true);


  // Fetch all data
  const fetchData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Fetch categories
      const { data: categoriesData, error: catError } = await supabase
        .from('categories')
        .select('*')
        .order('main', { ascending: true });

      if (catError) throw catError;
      setCategories((categoriesData || []).map(c => ({
        id: c.id,
        main: c.main,
        sub: c.sub,
        combined: c.combined,
      })));

      // Fetch accounts
      const { data: accountsData, error: accError } = await supabase
        .from('accounts')
        .select('*')
        .order('name', { ascending: true });

      if (accError) throw accError;
      setAccounts((accountsData || []).map(a => ({
        id: a.id,
        name: a.name,
        type: a.type as Account['type'],
      })));

      // Fetch tags
      const { data: tagsData, error: tagError } = await supabase
        .from('tags')
        .select('*')
        .order('name', { ascending: true });

      if (tagError) throw tagError;
      setTags((tagsData || []).map(t => ({
        id: t.id,
        name: t.name,
        color: t.color,
      })));

      // Fetch transactions
      const { data: transactionsData, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false });

      if (txError) throw txError;
      setTransactions((transactionsData || []).map(t => ({
        id: t.id,
        date: t.date,
        description: t.description,
        amount: Number(t.amount),
        type: t.type as 'debit' | 'credit',
        categoryId: t.category_id,
        accountId: t.account_id,
        tagIds: t.tag_ids || [],
        status: t.status as 'pending' | 'confirmed' | 'skipped',
        aiSuggested: t.ai_suggested || false,
      })));

    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error loading data',
        description: 'Failed to load your expense data.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Transaction CRUD
  const addTransaction = async (transaction: Omit<Transaction, 'id'>) => {
    if (!user) return;

    const { data, error } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        date: transaction.date,
        description: transaction.description,
        amount: transaction.amount,
        type: transaction.type,
        category_id: transaction.categoryId,
        account_id: transaction.accountId,
        tag_ids: transaction.tagIds,
        status: transaction.status,
        ai_suggested: transaction.aiSuggested || false,
      })
      .select()
      .single();

    if (error) {
      toast({ title: 'Error', description: 'Failed to add transaction', variant: 'destructive' });
      return;
    }

    setTransactions(prev => [{
      id: data.id,
      date: data.date,
      description: data.description,
      amount: Number(data.amount),
      type: data.type as 'debit' | 'credit',
      categoryId: data.category_id,
      accountId: data.account_id,
      tagIds: data.tag_ids || [],
      status: data.status as 'pending' | 'confirmed' | 'skipped',
      aiSuggested: data.ai_suggested || false,
    }, ...prev]);
  };

  const addTransactions = async (newTransactions: Omit<Transaction, 'id'>[]) => {
    if (!user || newTransactions.length === 0) return;

    const inserts = newTransactions.map(t => ({
      user_id: user.id,
      date: t.date,
      description: t.description,
      amount: t.amount,
      type: t.type,
      category_id: t.categoryId,
      account_id: t.accountId,
      tag_ids: t.tagIds,
      status: t.status,
      ai_suggested: t.aiSuggested || false,
    }));

    const { data, error } = await supabase
      .from('transactions')
      .insert(inserts)
      .select();

    if (error) {
      toast({ title: 'Error', description: 'Failed to add transactions', variant: 'destructive' });
      return;
    }

    const mapped = (data || []).map(t => ({
      id: t.id,
      date: t.date,
      description: t.description,
      amount: Number(t.amount),
      type: t.type as 'debit' | 'credit',
      categoryId: t.category_id,
      accountId: t.account_id,
      tagIds: t.tag_ids || [],
      status: t.status as 'pending' | 'confirmed' | 'skipped',
      aiSuggested: t.ai_suggested || false,
    }));

    setTransactions(prev => [...mapped, ...prev]);
  };

  const updateTransaction = async (id: string, updates: Partial<Transaction>) => {
    const updateData: any = {};
    if (updates.date !== undefined) updateData.date = updates.date;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.amount !== undefined) updateData.amount = updates.amount;
    if (updates.type !== undefined) updateData.type = updates.type;
    if (updates.categoryId !== undefined) updateData.category_id = updates.categoryId;
    if (updates.accountId !== undefined) updateData.account_id = updates.accountId;
    if (updates.tagIds !== undefined) updateData.tag_ids = updates.tagIds;
    if (updates.status !== undefined) updateData.status = updates.status;

    const { error } = await supabase
      .from('transactions')
      .update(updateData)
      .eq('id', id);

    if (error) {
      toast({ title: 'Error', description: 'Failed to update transaction', variant: 'destructive' });
      return;
    }

    setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const deleteTransaction = async (id: string) => {
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    
    if (error) {
      toast({ title: 'Error', description: 'Failed to delete transaction', variant: 'destructive' });
      return;
    }

    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  // Category CRUD
  const addCategory = async (category: Omit<Category, 'id'>) => {
    if (!user) return;

    const { data, error } = await supabase
      .from('categories')
      .insert({
        user_id: user.id,
        main: category.main,
        sub: category.sub,
        combined: category.combined,
      })
      .select()
      .single();

    if (error) {
      toast({ title: 'Error', description: 'Failed to add category', variant: 'destructive' });
      return;
    }

    setCategories(prev => [...prev, {
      id: data.id,
      main: data.main,
      sub: data.sub,
      combined: data.combined,
    }]);
  };

  const updateCategory = async (id: string, updates: Partial<Category>) => {
    const { error } = await supabase
      .from('categories')
      .update(updates)
      .eq('id', id);

    if (error) {
      toast({ title: 'Error', description: 'Failed to update category', variant: 'destructive' });
      return;
    }

    setCategories(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const deleteCategory = async (id: string) => {
    const { error } = await supabase.from('categories').delete().eq('id', id);
    
    if (error) {
      toast({ title: 'Error', description: 'Failed to delete category', variant: 'destructive' });
      return;
    }

    setCategories(prev => prev.filter(c => c.id !== id));
  };

  // Tag CRUD
  const addTag = async (tag: Omit<Tag, 'id'>) => {
    if (!user) return;

    const { data, error } = await supabase
      .from('tags')
      .insert({
        user_id: user.id,
        name: tag.name,
        color: tag.color,
      })
      .select()
      .single();

    if (error) {
      toast({ title: 'Error', description: 'Failed to add tag', variant: 'destructive' });
      return;
    }

    setTags(prev => [...prev, { id: data.id, name: data.name, color: data.color }]);
  };

  const updateTag = async (id: string, updates: Partial<Tag>) => {
    const { error } = await supabase.from('tags').update(updates).eq('id', id);
    
    if (error) {
      toast({ title: 'Error', description: 'Failed to update tag', variant: 'destructive' });
      return;
    }

    setTags(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const deleteTag = async (id: string) => {
    const { error } = await supabase.from('tags').delete().eq('id', id);
    
    if (error) {
      toast({ title: 'Error', description: 'Failed to delete tag', variant: 'destructive' });
      return;
    }

    setTags(prev => prev.filter(t => t.id !== id));
  };

  // Account CRUD
  const addAccount = async (account: Omit<Account, 'id'>) => {
    if (!user) return;

    const { data, error } = await supabase
      .from('accounts')
      .insert({
        user_id: user.id,
        name: account.name,
        type: account.type,
      })
      .select()
      .single();

    if (error) {
      toast({ title: 'Error', description: 'Failed to add account', variant: 'destructive' });
      return;
    }

    setAccounts(prev => [...prev, {
      id: data.id,
      name: data.name,
      type: data.type as Account['type'],
    }]);
  };

  const updateAccount = async (id: string, updates: Partial<Account>) => {
    const { error } = await supabase.from('accounts').update(updates).eq('id', id);
    
    if (error) {
      toast({ title: 'Error', description: 'Failed to update account', variant: 'destructive' });
      return;
    }

    setAccounts(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
  };

  const deleteAccount = async (id: string) => {
    const { error } = await supabase.from('accounts').delete().eq('id', id);
    
    if (error) {
      toast({ title: 'Error', description: 'Failed to delete account', variant: 'destructive' });
      return;
    }

    setAccounts(prev => prev.filter(a => a.id !== id));
  };

  // Helpers
  const getCategoryById = (id: string) => categories.find(c => c.id === id);
  const getTagById = (id: string) => tags.find(t => t.id === id);
  const getAccountById = (id: string) => accounts.find(a => a.id === id);

  // Parsed transactions (for upload flow)
  const updateParsedTransaction = (id: string, updates: Partial<ParsedTransaction>) => {
    setParsedTransactions(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const confirmParsedTransactions = async (ids: string[]) => {
    const toConfirm = parsedTransactions.filter(t => ids.includes(t.id));
    const newTxns: Omit<Transaction, 'id'>[] = toConfirm.map(pt => ({
      date: pt.date,
      description: pt.description,
      amount: pt.amount,
      type: pt.type,
      categoryId: pt.suggestedCategoryId || null,
      accountId: pt.suggestedAccountId || null,
      tagIds: pt.suggestedTagIds || [],
      status: 'confirmed' as const,
      aiSuggested: true,
    }));
    
    await addTransactions(newTxns);
    setParsedTransactions(prev => prev.filter(t => !ids.includes(t.id)));
  };

  const skipParsedTransactions = (ids: string[]) => {
    setParsedTransactions(prev => prev.filter(t => !ids.includes(t.id)));
  };

  const clearParsedTransactions = () => {
    setParsedTransactions([]);
  };

  return {
    categories,
    tags,
    accounts,
    transactions,
    parsedTransactions,
    loading,
    addTransaction,
    addTransactions,
    updateTransaction,
    deleteTransaction,
    addCategory,
    updateCategory,
    deleteCategory,
    addTag,
    updateTag,
    deleteTag,
    addAccount,
    updateAccount,
    deleteAccount,
    getCategoryById,
    getTagById,
    getAccountById,
    setParsedTransactions,
    updateParsedTransaction,
    confirmParsedTransactions,
    skipParsedTransactions,
    clearParsedTransactions,
    refetch: fetchData,
  };
}
