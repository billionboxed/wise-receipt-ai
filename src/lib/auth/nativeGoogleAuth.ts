import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const NATIVE_APP_ID = 'app.lovable.e9a7d0885b7d43b1a87e025dea4b76fa';
const NATIVE_REDIRECT_URI = 'app.lovable.e9a7d0885b7d43b1a87e025dea4b76fa://auth/callback';
const NATIVE_LOGIN_FLAG = 'clearspends_native_google_login';

export function isNativeMobileApp() {
  return Capacitor.isNativePlatform();
}

export function isNativeAuthBridgeRequest() {
  const params = new URLSearchParams(window.location.search);
  return params.get('native') === '1' || window.localStorage.getItem(NATIVE_LOGIN_FLAG) === '1';
}

function buildNativeSessionUrl(session: Session) {
  const query = new URLSearchParams({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  }).toString();

  return `${NATIVE_REDIRECT_URI}?${query}`;
}

function buildAndroidIntentUrl(session: Session) {
  const query = new URLSearchParams({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  }).toString();
  const fallbackUrl = `${window.location.origin}/auth?native=1`;

  return `intent://auth/callback?${query}#Intent;scheme=${NATIVE_APP_ID};package=${NATIVE_APP_ID};S.browser_fallback_url=${encodeURIComponent(fallbackUrl)};end`;
}

export async function bridgeSessionBackToNativeApp(session?: Session | null) {
  if (!isNativeAuthBridgeRequest()) return false;

  const activeSession = session ?? (await supabase.auth.getSession()).data.session;
  if (!activeSession?.access_token || !activeSession.refresh_token) return false;

  window.localStorage.removeItem(NATIVE_LOGIN_FLAG);
  const targetUrl = /Android/i.test(window.navigator.userAgent)
    ? buildAndroidIntentUrl(activeSession)
    : buildNativeSessionUrl(activeSession);

  window.location.replace(targetUrl);
  return true;
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
    let disposed = false;
    let attempts = 0;

    const retryBridgeSessionBackToApp = async () => {
      if (disposed || !isNativeAuthBridgeRequest()) return;

      const bridged = await bridgeSessionBackToNativeApp();
      if (!bridged && attempts < 80) {
        attempts += 1;
        window.setTimeout(() => {
          retryBridgeSessionBackToApp().catch(() => undefined);
        }, 250);
      }
    };

    retryBridgeSessionBackToApp().catch(() => undefined);
    return () => {
      disposed = true;
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