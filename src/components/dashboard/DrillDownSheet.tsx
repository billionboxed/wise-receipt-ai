import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ArrowDownRight, ArrowUpRight, ExternalLink } from 'lucide-react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useExpense, Transaction } from '@/context/ExpenseContext';
import { useCurrency } from '@/context/CurrencyContext';
import { useFilteredTransactions } from '@/hooks/useFilteredTransactions';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { TransactionDialog } from '@/components/transactions/TransactionDialog';

export type DrillKind = 'category' | 'account' | 'tag' | 'period';
export type Period = 'this-month' | 'last-month' | 'all';

const PARAM = 'drill';

export function encodeDrill(kind: DrillKind, value: string) {
  return `${kind}:${value}`;
}

function decodeDrill(raw: string | null): { kind: DrillKind; value: string } | null {
  if (!raw) return null;
  const i = raw.indexOf(':');
  if (i < 0) return null;
  const kind = raw.slice(0, i) as DrillKind;
  if (!['category', 'account', 'tag', 'period'].includes(kind)) return null;
  return { kind, value: raw.slice(i + 1) };
}

/** Opens a drill-down panel by pushing a history entry, so Back closes it. */
export function useDrillDown() {
  const [params, setParams] = useSearchParams();
  return useCallback(
    (kind: DrillKind, value: string) => {
      const next = new URLSearchParams(params);
      next.set(PARAM, encodeDrill(kind, value));
      setParams(next, { state: { drill: true } });
    },
    [params, setParams],
  );
}

function inPeriod(dateStr: string, period: Period) {
  if (period === 'all') return true;
  const d = new Date(dateStr);
  const now = new Date();
  let m = now.getMonth();
  let y = now.getFullYear();
  if (period === 'last-month') {
    m = m === 0 ? 11 : m - 1;
    y = now.getMonth() === 0 ? y - 1 : y;
  }
  return d.getMonth() === m && d.getFullYear() === y;
}

const PERIOD_LABEL: Record<Period, string> = {
  'this-month': 'This month',
  'last-month': 'Last month',
  all: 'All expenses',
};

const PAGE = 30;

export function DrillDownSheet() {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const drill = decodeDrill(params.get(PARAM));
  const { getCategoryById, getAccountById, getTagById } = useExpense();
  const { formatAmount } = useCurrency();
  const { filteredTransactions } = useFilteredTransactions();
  const [sub, setSub] = useState<string | null>(null);
  const [limit, setLimit] = useState(PAGE);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const sentinel = useRef<HTMLDivElement>(null);

  const key = params.get(PARAM);
  useEffect(() => {
    setSub(null);
    setLimit(PAGE);
  }, [key]);

  const close = useCallback(() => {
    if ((location.state as { drill?: boolean } | null)?.drill) {
      navigate(-1);
    } else {
      const next = new URLSearchParams(params);
      next.delete(PARAM);
      setParams(next, { replace: true });
    }
  }, [location.state, navigate, params, setParams]);

  const base = useMemo(() => {
    if (!drill) return [];
    return filteredTransactions
      .filter(t => t.status === 'confirmed')
      .filter(t => {
        switch (drill.kind) {
          case 'category':
            return t.type === 'debit' && getCategoryById(t.categoryId)?.main === drill.value;
          case 'account':
            return t.accountId === drill.value;
          case 'tag':
            return t.type === 'debit' && t.tagIds.includes(drill.value);
          case 'period':
            return t.type === 'debit' && inPeriod(t.date, drill.value as Period);
        }
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [drill?.kind, drill?.value, filteredTransactions, getCategoryById]);

  const subs = useMemo(() => {
    if (drill?.kind !== 'category') return [];
    const totals: Record<string, number> = {};
    base.forEach(t => {
      const s = getCategoryById(t.categoryId)?.sub || 'Other';
      totals[s] = (totals[s] || 0) + t.amount;
    });
    return Object.entries(totals).sort((a, b) => b[1] - a[1]);
  }, [base, drill?.kind, getCategoryById]);

  const list = useMemo(
    () => (sub ? base.filter(t => (getCategoryById(t.categoryId)?.sub || 'Other') === sub) : base),
    [base, sub, getCategoryById],
  );

  const totals = useMemo(() => {
    const spent = list.filter(t => t.type === 'debit').reduce((s, t) => s + t.amount, 0);
    const credit = list.filter(t => t.type === 'credit').reduce((s, t) => s + t.amount, 0);
    return { spent, credit };
  }, [list]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) setLimit(l => l + PAGE);
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [list.length, limit, key]);

  if (!drill && !editing) return null;

  let title = '';
  let seeAll = '/transactions';
  if (drill) {
    if (drill.kind === 'category') {
      title = drill.value;
      seeAll += `?category=${encodeURIComponent(drill.value)}`;
    } else if (drill.kind === 'account') {
      title = getAccountById(drill.value)?.name || 'Account';
      seeAll += `?account=${encodeURIComponent(drill.value)}`;
    } else if (drill.kind === 'tag') {
      title = getTagById(drill.value)?.name || 'Tag';
      seeAll += `?tag=${encodeURIComponent(drill.value)}`;
    } else {
      title = PERIOD_LABEL[drill.value as Period] || 'Expenses';
    }
  }

  return (
    <>
      <Sheet open={!!drill} onOpenChange={o => !o && close()}>
        <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col gap-0">
          <SheetHeader className="p-4 pb-3 text-left border-b border-border">
            <SheetTitle className="text-lg font-semibold truncate pr-8">{title}</SheetTitle>
            <SheetDescription asChild>
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span className="text-xl font-bold text-foreground">{formatAmount(totals.spent)}</span>
                <span>· {list.length} transaction{list.length !== 1 ? 's' : ''}</span>
                {totals.credit > 0 && (
                  <Badge variant="secondary">{formatAmount(totals.credit)} refunds</Badge>
                )}
              </div>
            </SheetDescription>
            {subs.length > 1 && (
              <div className="flex gap-1.5 overflow-x-auto pt-2 -mx-4 px-4 scrollbar-none">
                <button
                  onClick={() => setSub(null)}
                  className={cn(
                    'shrink-0 rounded-full px-3 py-1 text-xs border transition-colors',
                    !sub ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground',
                  )}
                >
                  All
                </button>
                {subs.map(([name, amt]) => (
                  <button
                    key={name}
                    onClick={() => setSub(name === sub ? null : name)}
                    className={cn(
                      'shrink-0 rounded-full px-3 py-1 text-xs border transition-colors',
                      sub === name ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground',
                    )}
                  >
                    {name} · {formatAmount(amt)}
                  </button>
                ))}
              </div>
            )}
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-4 py-3 overscroll-contain">
            <div className="space-y-1.5">
              {list.slice(0, limit).map(t => {
                const cat = getCategoryById(t.categoryId);
                const acc = getAccountById(t.accountId);
                const meta = [
                  format(parseISO(t.date), 'dd MMM yyyy'),
                  drill?.kind !== 'category' && cat ? `${cat.main} > ${cat.sub}` : cat?.sub,
                  drill?.kind !== 'account' ? acc?.name : null,
                ].filter(Boolean);
                return (
                  <button
                    key={t.id}
                    onClick={() => setEditing(t)}
                    className="w-full text-left flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border active:scale-[0.99] hover:bg-muted transition"
                  >
                    <div
                      className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                        t.type === 'credit' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive',
                      )}
                    >
                      {t.type === 'credit' ? <ArrowDownRight className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{t.description}</p>
                      <p className="text-xs text-muted-foreground truncate">{meta.join(' · ')}</p>
                    </div>
                    <p className={cn('text-sm font-semibold shrink-0', t.type === 'credit' ? 'text-success' : 'text-foreground')}>
                      {t.type === 'credit' ? '+' : ''}
                      {formatAmount(t.amount)}
                    </p>
                  </button>
                );
              })}
              {limit < list.length && <div ref={sentinel} className="h-8" />}
              {list.length === 0 && (
                <p className="text-center py-12 text-sm text-muted-foreground">No transactions in this period</p>
              )}
            </div>
          </div>

          <div className="p-4 border-t border-border">
            <Button variant="outline" className="w-full" onClick={() => navigate(seeAll)}>
              <ExternalLink className="w-4 h-4 mr-2" />
              See all in Transactions
            </Button>
          </div>
        </SheetContent>
      </Sheet>
      <TransactionDialog
        open={!!editing}
        onOpenChange={o => !o && setEditing(null)}
        transaction={editing}
        mode="edit"
      />
    </>
  );
}
