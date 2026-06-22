import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const NATIVE_REDIRECT_URI = 'app.lovable.e9a7d0885b7d43b1a87e025dea4b76fa://auth/callback';
const NATIVE_LOGIN_FLAG = 'clearspends_native_google_login';
const HANDOFF_MAX_ATTEMPTS = 80;
const HANDOFF_RETRY_MS = 250;

export function isNativeMobileApp() {
  return Capacitor.isNativePlatform();
}

function isAndroidBrowserFallback() {
  const params = new URLSearchParams(window.location.search);
  return params.get('native') === '1' || window.localStorage.getItem(NATIVE_LOGIN_FLAG) === '1';
}

export function isNativeBrowserHandoffRequested() {
  return !isNativeMobileApp() && isAndroidBrowserFallback();
}

function readUrlParam(url: URL, key: string) {
  const hashParams = new URLSearchParams(url.hash.startsWith('#') ? url.hash.slice(1) : url.hash);
  return url.searchParams.get(key) ?? hashParams.get(key);
}

async function handleNativeOAuthUrl(rawUrl: string) {
  if (!rawUrl.startsWith(NATIVE_REDIRECT_URI)) return;

  try {
    await Browser.close();
  } catch {
    // Browser may already be closed by Android.
  }

  const url = new URL(rawUrl);
  const oauthError = readUrlParam(url, 'error_description') ?? readUrlParam(url, 'error');
  if (oauthError) {
    toast({ title: 'Google Sign In Failed', description: oauthError, variant: 'destructive' });
    return;
  }

  const code = readUrlParam(url, 'code');
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    window.location.assign('/dashboard');
    return;
  }

  const access_token = readUrlParam(url, 'access_token');
  const refresh_token = readUrlParam(url, 'refresh_token');
  if (!access_token || !refresh_token) {
    throw new Error('No session was returned from Google.');
  }

  const { error } = await supabase.auth.setSession({ access_token, refresh_token });
  if (error) throw error;
  window.location.assign('/dashboard');
}

export function initNativeGoogleAuthListener() {
  if (!isNativeMobileApp()) {
    if (new URLSearchParams(window.location.search).get('native') === '1') {
      window.localStorage.setItem(NATIVE_LOGIN_FLAG, '1');
    }

    let disposed = false;
    let timeoutId: number | undefined;
    let exchangedCode: string | null = null;

    const resolveBrowserFallbackSession = async () => {
      const url = new URL(window.location.href);
      const access_token = readUrlParam(url, 'access_token');
      const refresh_token = readUrlParam(url, 'refresh_token');
      if (access_token && refresh_token) {
        await supabase.auth.setSession({ access_token, refresh_token });
      }

      const code = readUrlParam(url, 'code');
      if (code && exchangedCode !== code) {
        exchangedCode = code;
        await supabase.auth.exchangeCodeForSession(code);
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      return session;
    };

    const bridgeSessionBackToApp = async (attempt = 0) => {
      if (disposed) return;
      if (!isAndroidBrowserFallback()) return;

      const session = await resolveBrowserFallbackSession().catch(() => null);
      if (!session?.access_token || !session.refresh_token) return;

      window.localStorage.removeItem(NATIVE_LOGIN_FLAG);
      window.location.replace(`${NATIVE_REDIRECT_URI}#access_token=${encodeURIComponent(session.access_token)}&refresh_token=${encodeURIComponent(session.refresh_token)}`);

      if (attempt < HANDOFF_MAX_ATTEMPTS) {
        timeoutId = window.setTimeout(() => {
          bridgeSessionBackToApp(attempt + 1).catch(() => undefined);
        }, HANDOFF_RETRY_MS);
      }
    };

    bridgeSessionBackToApp().catch(() => undefined);
    return () => {
      disposed = true;
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
  }

  let disposed = false;
  const listener = App.addListener('appUrlOpen', ({ url }) => {
    handleNativeOAuthUrl(url).catch((error) => {
      toast({
        title: 'Google Sign In Failed',
        description: error instanceof Error ? error.message : String(error),
        variant: 'destructive',
      });
    });
  });

  App.getLaunchUrl()
    .then((launch) => {
      if (!disposed && launch?.url) return handleNativeOAuthUrl(launch.url);
    })
    .catch(() => undefined);

  return () => {
    disposed = true;
    listener.then((handle) => handle.remove()).catch(() => undefined);
  };
}

export async function signInWithGoogleNative() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth?native=1`,
      skipBrowserRedirect: true,
      queryParams: { prompt: 'select_account' },
    },
  });

  if (error) return { error };
  if (!data.url) return { error: new Error('No Google sign-in URL was returned.') };

  window.localStorage.setItem(NATIVE_LOGIN_FLAG, '1');
  await Browser.open({ url: data.url });
  return { error: null };
}