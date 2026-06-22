import { useEffect, useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { NavLink } from 'react-router-dom';
import { ArrowLeft, MessageSquare, Plus, Trash2, Smartphone, Loader2, ListChecks, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useSmsImport } from '@/hooks/useSmsImport';
import { useExpense } from '@/context/ExpenseContext';
import { toast } from '@/hooks/use-toast';
import { DEFAULT_BANK_SENDERS } from '@/lib/sms/senders';

export default function SmsSettings() {
  const { accounts } = useExpense();
  const {
    supported, loading, busy, prefs, allowlist,
    savePrefs, addSender, toggleSender, removeSender,
    scanInbox, discoverSenders,
  } = useSmsImport();

  const [newSender, setNewSender] = useState('');
  const [discovered, setDiscovered] = useState<string[] | null>(null);

  // Seed default senders on first enable
  useEffect(() => {
    if (prefs.enabled && allowlist.length === 0 && !loading) {
      DEFAULT_BANK_SENDERS.slice(0, 12).forEach(s => addSender(s));
    }
  }, [prefs.enabled, allowlist.length, loading, addSender]);

  const onToggle = async (enabled: boolean) => {
    if (!supported && enabled) {
      toast({
        title: 'Available on Android only',
        description: 'SMS auto-import requires the native Android app.',
        variant: 'destructive',
      });
      return;
    }
    await savePrefs({ enabled });
  };

  const handleScan = async (days: number) => {
    const since = Date.now() - days * 24 * 60 * 60 * 1000;
    const count = await scanInbox(since);
    toast({
      title: count > 0 ? `Imported ${count} transaction${count > 1 ? 's' : ''}` : 'No new transactions',
      description: count > 0 ? 'Review them in the SMS inbox.' : 'Nothing new from your bank SMS.',
    });
  };

  const handleDiscover = async () => {
    const list = await discoverSenders();
    setDiscovered(list);
    if (list.length === 0) {
      toast({ title: 'No senders found', description: 'No bank-like SMS in the inbox.' });
    }
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
              Reads bank/card SMS from your inbox and adds them as expenses tagged "SMS".
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

            {/* Watched senders */}
            <div className="p-4 rounded-xl glass-card border border-white/5 space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <p className="font-medium">Watched senders</p>
                  <p className="text-sm text-muted-foreground">Only SMS from these senders are imported.</p>
                </div>
                <Button size="sm" variant="outline" onClick={handleDiscover} disabled={!supported || busy}>
                  <ListChecks className="w-4 h-4 mr-1" /> Detect from inbox
                </Button>
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="Add sender e.g. HDFCBK"
                  value={newSender}
                  onChange={e => setNewSender(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && newSender.trim()) {
                      addSender(newSender.trim()); setNewSender('');
                    }
                  }}
                />
                <Button onClick={() => { if (newSender.trim()) { addSender(newSender.trim()); setNewSender(''); } }}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                {allowlist.length === 0 && (
                  <p className="text-sm text-muted-foreground">No senders yet. Add one above or detect from inbox.</p>
                )}
                {allowlist.map(s => (
                  <Badge key={s.id} variant={s.enabled ? 'default' : 'secondary'} className="flex items-center gap-1.5">
                    <button onClick={() => toggleSender(s.id, !s.enabled)} className="cursor-pointer">{s.sender}</button>
                    <Trash2 className="w-3 h-3 cursor-pointer opacity-70 hover:opacity-100" onClick={() => removeSender(s.id)} />
                  </Badge>
                ))}
              </div>

              {discovered && discovered.length > 0 && (
                <div className="pt-3 border-t border-border/30 space-y-2">
                  <p className="text-sm font-medium">Detected in your inbox:</p>
                  <div className="flex flex-wrap gap-2">
                    {discovered.map(s => {
                      const already = allowlist.some(a => a.sender === s);
                      return (
                        <Badge
                          key={s}
                          variant={already ? 'secondary' : 'outline'}
                          className="cursor-pointer"
                          onClick={() => !already && addSender(s)}
                        >
                          {already ? '✓ ' : '+ '}{s}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

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
                <Button onClick={() => handleScan(30)} disabled={!supported || busy}>
                  {busy ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <RotateCcw className="w-4 h-4 mr-1" />}
                  Scan last 30 days
                </Button>
                <Button variant="outline" onClick={() => handleScan(90)} disabled={!supported || busy}>
                  Scan last 90 days
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