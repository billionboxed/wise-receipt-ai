import { supabase } from '@/integrations/supabase/client';
import type { Category, Account } from '@/types/expense';

export interface SmsCandidate {
  id: string;
  sender: string;
  body: string;
  occurredAt: number;
}

export interface AiSmsResult {
  id: string;
  isTransaction: boolean;
  amount: number | null;
  type: 'debit' | 'credit' | null;
  date: string | null;
  merchant: string | null;
  description: string | null;
  categoryId: string | null;
  accountId: string | null;
  confidence: number;
  reason: string;
}

const BATCH = 25;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export async function aiExtractSms(
  candidates: SmsCandidate[],
  categories: Pick<Category, 'id' | 'combined'>[],
  accounts: (Pick<Account, 'id' | 'name'> & { last4?: string | null })[],
  currency?: string,
): Promise<AiSmsResult[]> {
  if (candidates.length === 0) return [];
  const all: AiSmsResult[] = [];
  for (const batch of chunk(candidates, BATCH)) {
    const { data, error } = await supabase.functions.invoke('parse-sms-transactions', {
      body: {
        messages: batch,
        categories: categories.map((c) => ({ id: c.id, combined: c.combined })),
        accounts,
        currency,
      },
    });
    if (error) throw error;
    if (data?.results && Array.isArray(data.results)) {
      all.push(...(data.results as AiSmsResult[]));
    }
  }
  return all;
}