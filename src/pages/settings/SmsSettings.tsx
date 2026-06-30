import { Layout } from '@/components/layout/Layout';
import { NavLink } from 'react-router-dom';
import { ArrowLeft, MessageSquare, Smartphone, Loader2, RotateCcw, Info, Trash2, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useSmsImport } from '@/hooks/useSmsImport';
import { useExpense } from '@/context/ExpenseContext';
import { toast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { useCurrency } from '@/context/CurrencyContext';

export default function SmsSettings() {
  const { accounts } = useExpense();
  const { formatAmount } = useCurrency();
  const {
    supported, loading, busy, prefs,
    savePrefs, scanInbox,
    pending, restorePending, purgePending, emptyTrash,
  } = useSmsImport();

  const trash = pending.filter(p => p.status === 'deleted');

  const onToggle = async (enabled: boolean) => {
    await savePrefs({ enabled });
    if (!supported && enabled) {
      toast({
        title: 'Saved for Android',
        description: 'SMS auto-import runs on the Android app. Your preferences will activate there.',
      });
    }
  };

  const handleScan = async (fullRescan: boolean) => {
    const { added, removed, autoAssigned } = await scanInbox({ fullRescan });
    const parts: string[] = [];
    if (added) parts.push(`${added} added`);
    if (removed) parts.push(`${removed} cleaned`);
    if (autoAssigned) parts.push(`${autoAssigned} account-assigned`);
    toast({
      title: parts.length ? 'Scan complete' : 'No new SMS',
      description: parts.length ? parts.join(' · ') : 'Nothing new from your bank SMS.',
    });
  };

  return (
    <Layout>
      <div className="space-y-6 max-w-2xl">
        <div className="flex items-center gap-4">
          <NavLink to="/settings" className="p-2 rounded-xl glass-card border border-white/5 hover:border-white/10 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </NavLink>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight flex items-center gap-2">
              <MessageSquare className="w-7 h-7 text-primary" />
              SMS Auto-Import
            </h1>
            <p className="text-muted-foreground mt-1">Capture bank/card SMS as expenses automatically</p>
          </div>
        </div>

        {!supported && (
          <Alert>
            <Smartphone className="w-4 h-4" />
            <AlertDescription>
              SMS auto-import only works in the <b>Android app</b>. iOS blocks SMS access at the OS level.
              On web you can still configure preferences here — they'll activate the next time you sign in on Android.
            </AlertDescription>
          </Alert>
        )}

        {/* Main toggle */}
        <div className="p-4 rounded-xl glass-card border border-white/5 flex items-center justify-between">
          <div>
            <p className="font-medium">Auto-import from SMS</p>
            <p className="text-sm text-muted-foreground">
              Reads bank/card SMS and queues them in your <NavLink to="/sms-review" className="underline font-medium">SMS Inbox</NavLink> for review.
              Nothing is added to Transactions until you confirm.
            </p>
          </div>
          <Switch checked={prefs.enabled} onCheckedChange={onToggle} disabled={loading} />
        </div>

        {prefs.enabled && (
          <>
            {/* Default fallback account */}
            <div className="p-4 rounded-xl glass-card border border-white/5 space-y-3">
              <div>
                <p className="font-medium">Default account</p>
                <p className="text-sm text-muted-foreground">
                  Used when the SMS does not match a known card.
                </p>
              </div>
              <Select
                value={prefs.defaultAccountId ?? ''}
                onValueChange={(v) => savePrefs({ defaultAccountId: v || null })}
              >
                <SelectTrigger><SelectValue placeholder="Pick an account" /></SelectTrigger>
                <SelectContent>
                  {accounts.map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Alert>
              <Info className="w-4 h-4" />
              <AlertDescription>
                Only SMS that match an <NavLink to="/settings/accounts" className="underline font-medium">account identifier</NavLink> are imported.
                Add card last-4 digits or bank keywords (e.g. <code>1234</code>, <code>HDFC</code>) to each account.
              </AlertDescription>
            </Alert>

            {/* Scan controls */}
            <div className="p-4 rounded-xl glass-card border border-white/5 space-y-3">
              <div>
                <p className="font-medium">Scan inbox</p>
                <p className="text-sm text-muted-foreground">
                  {prefs.lastScanAt
                    ? `Last scanned ${new Date(prefs.lastScanAt).toLocaleString()}`
                    : 'Never scanned'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => handleScan(false)} disabled={!supported || busy}>
                  {busy ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <RotateCcw className="w-4 h-4 mr-1" />}
                  Scan new
                </Button>
                <Button variant="outline" onClick={() => handleScan(true)} disabled={!supported || busy}>
                  Scan all SMS
                </Button>
                <NavLink to="/sms-review" className="ml-auto">
                  <Button variant="ghost">Open SMS inbox →</Button>
                </NavLink>
              </div>
            </div>
          </>
        )}

        {/* Deleted SMS archive */}
        <div className="p-4 rounded-xl glass-card border border-white/5 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-medium">Deleted SMS ({trash.length})</p>
              <p className="text-sm text-muted-foreground">
                Discarded SMS land here. Restore to send them back to your inbox, or empty to forget them forever.
              </p>
            </div>
            {trash.length > 0 && (
              <Button size="sm" variant="ghost" className="text-destructive" onClick={emptyTrash}>
                <Trash2 className="w-4 h-4 mr-1" /> Empty
              </Button>
            )}
          </div>
          {trash.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nothing deleted yet.</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {trash.map(t => (
                <div key={t.id} className="p-2 rounded-lg border border-border bg-background flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium truncate">{t.suggestedDescription || 'SMS Transaction'}</p>
                      <span className="text-sm font-semibold whitespace-nowrap">{formatAmount(t.parsedAmount)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {format(parseISO(t.parsedDate), 'dd MMM yyyy')}
                      {t.smsSender && <> • {t.smsSender}</>}
                    </p>
                  </div>
                  <Button size="icon" variant="ghost" className="h-7 w-7" title="Restore" onClick={() => restorePending(t.id)}>
                    <Undo2 className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" title="Delete permanently" onClick={() => purgePending(t.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}