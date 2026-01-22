-- Add column to track which recurring expense generated a transaction
ALTER TABLE public.transactions 
ADD COLUMN recurring_expense_id UUID REFERENCES public.recurring_expenses(id) ON DELETE SET NULL;