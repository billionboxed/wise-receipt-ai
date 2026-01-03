import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from './use-toast';

export interface RecurringExpense {
  id: string;
  description: string;
  amount: number;
  frequency: 'weekly' | 'biweekly' | 'monthly' | 'quarterly';
  categoryId: string | null;
  accountId: string | null;
  tagIds: string[];
  dayOfMonth: number;
  isActive: boolean;
  lastAddedDate: string | null;
}

export function useRecurringExpenses() {
  const { user } = useAuth();
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecurringExpenses = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('recurring_expenses')
        .select('*')
        .order('description', { ascending: true });

      if (error) throw error;

      setRecurringExpenses((data || []).map(r => ({
        id: r.id,
        description: r.description,
        amount: Number(r.amount),
        frequency: r.frequency as RecurringExpense['frequency'],
        categoryId: r.category_id,
        accountId: r.account_id,
        tagIds: r.tag_ids || [],
        dayOfMonth: r.day_of_month || 1,
        isActive: r.is_active !== false,
        lastAddedDate: r.last_added_date,
      })));
    } catch (error) {
      console.error('Error fetching recurring expenses:', error);
      toast({
        title: 'Error loading recurring expenses',
        description: 'Failed to load your recurring expenses.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchRecurringExpenses();
  }, [fetchRecurringExpenses]);

  const addRecurringExpense = async (expense: Omit<RecurringExpense, 'id' | 'lastAddedDate'>) => {
    if (!user) return;

    const { data, error } = await supabase
      .from('recurring_expenses')
      .insert({
        user_id: user.id,
        description: expense.description,
        amount: expense.amount,
        frequency: expense.frequency,
        category_id: expense.categoryId,
        account_id: expense.accountId,
        tag_ids: expense.tagIds,
        day_of_month: expense.dayOfMonth,
        is_active: expense.isActive,
      })
      .select()
      .single();

    if (error) {
      toast({ title: 'Error', description: 'Failed to add recurring expense', variant: 'destructive' });
      return;
    }

    setRecurringExpenses(prev => [...prev, {
      id: data.id,
      description: data.description,
      amount: Number(data.amount),
      frequency: data.frequency as RecurringExpense['frequency'],
      categoryId: data.category_id,
      accountId: data.account_id,
      tagIds: data.tag_ids || [],
      dayOfMonth: data.day_of_month || 1,
      isActive: data.is_active !== false,
      lastAddedDate: data.last_added_date,
    }]);

    toast({ title: 'Success', description: 'Recurring expense added' });
  };

  const updateRecurringExpense = async (id: string, updates: Partial<RecurringExpense>) => {
    const updateData: Record<string, unknown> = {};
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.amount !== undefined) updateData.amount = updates.amount;
    if (updates.frequency !== undefined) updateData.frequency = updates.frequency;
    if (updates.categoryId !== undefined) updateData.category_id = updates.categoryId;
    if (updates.accountId !== undefined) updateData.account_id = updates.accountId;
    if (updates.tagIds !== undefined) updateData.tag_ids = updates.tagIds;
    if (updates.dayOfMonth !== undefined) updateData.day_of_month = updates.dayOfMonth;
    if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
    if (updates.lastAddedDate !== undefined) updateData.last_added_date = updates.lastAddedDate;

    const { error } = await supabase
      .from('recurring_expenses')
      .update(updateData)
      .eq('id', id);

    if (error) {
      toast({ title: 'Error', description: 'Failed to update recurring expense', variant: 'destructive' });
      return;
    }

    setRecurringExpenses(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
  };

  const deleteRecurringExpense = async (id: string) => {
    const { error } = await supabase.from('recurring_expenses').delete().eq('id', id);

    if (error) {
      toast({ title: 'Error', description: 'Failed to delete recurring expense', variant: 'destructive' });
      return;
    }

    setRecurringExpenses(prev => prev.filter(r => r.id !== id));
    toast({ title: 'Deleted', description: 'Recurring expense removed. Previous transactions are unchanged.' });
  };

  return {
    recurringExpenses,
    loading,
    addRecurringExpense,
    updateRecurringExpense,
    deleteRecurringExpense,
    refetch: fetchRecurringExpenses,
  };
}