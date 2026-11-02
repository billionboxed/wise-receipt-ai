import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/ui/Logo';

type OAuthResult = { data: any; error: { message: string } | null };
type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<OAuthResult>;
  approveAuthorization: (id: string) => Promise<OAuthResult>;
  denyAuthorization: (id: string) => Promise<OAuthResult>;
};
const oauth = () => (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

const SCOPE_LABELS: Record<string, string> = {
  openid: 'Confirm your identity',
  email: 'Share your email address',
  profile: 'Share your basic profile',
};

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get('authorization_id') ?? '';
  const [details, setDetails] = useState<any>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        if (!authorizationId) return setError('This connection link is missing its authorization request.');
        const { data: sess } = await supabase.auth.getSession();
        if (!sess.session) {
          const next = window.location.pathname + window.location.search;
          window.location.href = '/auth?next=' + encodeURIComponent(next);
          return;
        }
        setEmail(sess.session.user.email ?? null);
        const { data, error } = await oauth().getAuthorizationDetails(authorizationId);
        if (!active) return;
        if (error) return setError(error.message);
        const immediate = data?.redirect_url ?? data?.redirect_to;
        if (immediate && !data?.client) { window.location.href = immediate; return; }
        setDetails(data);
      } catch (e: any) {
        if (active) setError(e?.message || 'Could not load this request.');
      }
    })();
    return () => { active = false; };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    try {
      const { data, error } = approve
        ? await oauth().approveAuthorization(authorizationId)
        : await oauth().denyAuthorization(authorizationId);
      if (error) throw new Error(error.message);
      const target = data?.redirect_url ?? data?.redirect_to;
      if (!target) throw new Error('No redirect returned. Please try connecting again.');
      window.location.href = target;
    } catch (e: any) {
      setBusy(false);
      setError(`${approve ? 'Approve' : 'Cancel'} failed: ${e?.message || 'unknown error'}`);
    }
  }

  const clientName = details?.client?.name ?? details?.client?.client_name ?? 'An app';
  const redirect = details?.redirect_uri ?? details?.client?.redirect_uri;
  const scopes = String(details?.scope ?? details?.scopes ?? '').split(/[\s,]+/).filter(Boolean);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="glass-card w-full max-w-md p-6 space-y-5">
        <div className="flex justify-center"><Logo size="lg" /></div>
        {error ? (
          <p className="text-sm text-destructive text-center">{error}</p>
        ) : !details ? (
          <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <>
            <div className="text-center space-y-1">
              <h1 className="text-xl font-semibold">Connect {clientName} to ClearSpends</h1>
              {email && <p className="text-xs text-muted-foreground">Signed in as {email}</p>}
            </div>
            <p className="text-sm">
              {clientName} will be able to read your expenses, accounts, categories and tags, and add, edit or delete expenses on your behalf.
            </p>
            {redirect && <p className="text-xs text-muted-foreground break-all">Returns to: {redirect}</p>}
            {scopes.length > 0 && (
              <ul className="text-sm space-y-1">
                {scopes.map((s) => (
                  <li key={s} className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-primary" />
                    {SCOPE_LABELS[s] ?? `Additional permission requested: ${s}`}
                  </li>
                ))}
              </ul>
            )}
            <p className="text-xs text-muted-foreground">Only your own data is accessible. You can disconnect anytime from {clientName}.</p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" disabled={busy} onClick={() => decide(false)}>Cancel connection</Button>
              <Button className="flex-1" disabled={busy} onClick={() => decide(true)}>
                {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Approve
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
