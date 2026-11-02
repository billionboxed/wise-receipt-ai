import { useCallback, useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { ArrowLeft, Brain, Trash2, Plus } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useExpense } from '@/context/ExpenseContext';
import { toast } from '@/hooks/use-toast';

type Pref = { id: string; text: string };
type Rule = { id: string; merchant_pattern: string; category_id: string | null; account_id: string | null };

export default function AssistantMemorySettings() {
  const { user } = useAuth();
  const { categories, accounts } = useExpense() as any;
  const [prefs, setPrefs] = useState<Pref[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [text, setText] = useState('');

  const load = useCallback(async () => {
    const [p, r] = await Promise.all([
      supabase.from('assistant_preferences').select('id, text').order('created_at'),
      supabase.from('merchant_rules').select('id, merchant_pattern, category_id, account_id').order('merchant_pattern'),
    ]);
    setPrefs(p.data ?? []);
    setRules(r.data ?? []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const addPref = async () => {
    if (!user || text.trim().length < 2) return;
    const { error } = await supabase.from('assistant_preferences').insert({ user_id: user.id, text: text.trim() });
    if (error) return toast({ title: 'Could not save', description: error.message, variant: 'destructive' });
    setText('');
    load();
  };
  const remove = async (table: 'assistant_preferences' | 'merchant_rules', id: string) => {
    await supabase.from(table).delete().eq('id', id);
    load();
  };

  const catName = (id: string | null) => {
    const c = (categories ?? []).find((x: any) => x.id === id);
    return c ? `${c.main} > ${c.sub}` : null;
  };
  const accName = (id: string | null) => (accounts ?? []).find((x: any) => x.id === id)?.name ?? null;

  return (
    <Layout>
      <div className="space-y-6 max-w-2xl">
        <div className="flex items-center gap-4">
          <NavLink to="/settings" className="p-2 rounded-xl glass-card border border-border">
            <ArrowLeft className="w-5 h-5" />
          </NavLink>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Brain className="w-6 h-6 text-primary" /> Assistant memory
            </h1>
            <p className="text-sm text-muted-foreground">What ChatGPT and the AI chat remember about how you like things done.</p>
          </div>
        </div>

        <section className="p-4 rounded-lg glass-card space-y-3">
          <h2 className="font-medium">Preferences</h2>
          {prefs.length === 0 && <p className="text-sm text-muted-foreground">None yet. Example: "Don't ask to confirm, just add expenses from screenshots".</p>}
          {prefs.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-2 text-sm">
              <span>{p.text}</span>
              <Button size="icon" variant="ghost" onClick={() => remove('assistant_preferences', p.id)} aria-label="Delete preference"><Trash2 className="w-4 h-4" /></Button>
            </div>
          ))}
          <div className="flex gap-2">
            <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a preference" onKeyDown={(e) => e.key === 'Enter' && addPref()} />
            <Button onClick={addPref} aria-label="Add preference"><Plus className="w-4 h-4" /></Button>
          </div>
        </section>

        <section className="p-4 rounded-lg glass-card space-y-3">
          <h2 className="font-medium">Merchant rules</h2>
          {rules.length === 0 && <p className="text-sm text-muted-foreground">None yet. Tell ChatGPT "remember McDonald's goes to HDFC Card" to create one.</p>}
          {rules.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-2 text-sm">
              <span><b className="capitalize">{r.merchant_pattern}</b> → {[catName(r.category_id), accName(r.account_id)].filter(Boolean).join(' · ') || '—'}</span>
              <Button size="icon" variant="ghost" onClick={() => remove('merchant_rules', r.id)} aria-label="Delete rule"><Trash2 className="w-4 h-4" /></Button>
            </div>
          ))}
        </section>
      </div>
    </Layout>
  );
}
