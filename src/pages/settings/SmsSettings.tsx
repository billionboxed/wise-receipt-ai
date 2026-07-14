import { Layout } from '@/components/layout/Layout';
import { NavLink } from 'react-router-dom';
import { ArrowLeft, MessageSquare, Smartphone, Loader2, RotateCcw, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useSmsImport } from '@/hooks/useSmsImport';
import { useExpense } from '@/context/ExpenseContext';
import { toast } from '@/hooks/use-toast';

export default function SmsSettings() {
  const { accounts } = useExpense();
  const {
    supported, loading, busy, prefs,
    savePrefs, scanInbox,
  } = useSmsImport();

  const onToggle = async (enabled: boolean) => {
    await savePrefs({ enabled });
    if (!supported && enabled) {
      toast({
        title: 'Saved for Android',
        description: 'SMS auto-import runs on the Android app. Your preferences will activate there.',
      });
    }
  };

  const handleScan = async () => {
    const { added, removed, autoAssigned } = await scanInbox({ fullRescan: true });
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
                <Button onClick={handleScan} disabled={!supported || busy}>
                  {busy ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <RotateCcw className="w-4 h-4 mr-1" />}
                  Scan
                </Button>
                <NavLink to="/sms-review" className="ml-auto">
                  <Button variant="ghost">Open SMS inbox →</Button>
                </NavLink>
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}