import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const NATIVE_REDIRECT_URI = 'app.lovable.e9a7d0885b7d43b1a87e025dea4b76fa://auth/callback';

export function isNativeMobileApp() {
  return Capacitor.isNativePlatform();
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
  if (!isNativeMobileApp()) return () => undefined;

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
      redirectTo: NATIVE_REDIRECT_URI,
      skipBrowserRedirect: true,
      queryParams: { prompt: 'select_account' },
    },
  });

  if (error) return { error };
  if (!data.url) return { error: new Error('No Google sign-in URL was returned.') };

  await Browser.open({ url: data.url });
  return { error: null };
}