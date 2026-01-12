import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const urlHasOAuthParams = () => {
      const url = new URL(window.location.href);
      return (
        url.searchParams.has('code') ||
        url.searchParams.has('error') ||
        url.searchParams.has('error_description') ||
        url.hash.includes('access_token=') ||
        url.hash.includes('refresh_token=')
      );
    };

    const getOAuthTokensFromHash = () => {
      const raw = window.location.hash.startsWith('#')
        ? window.location.hash.slice(1)
        : window.location.hash;

      if (!raw) return null;

      const params = new URLSearchParams(raw);
      const access_token = params.get('access_token');
      const refresh_token = params.get('refresh_token');

      if (!access_token || !refresh_token) return null;
      return { access_token, refresh_token };
    };

    const clearOAuthParamsFromUrl = () => {
      // Remove query/hash so refreshes don't re-trigger the callback flow
      window.history.replaceState({}, document.title, window.location.pathname);
    };

    let oauthPending = urlHasOAuthParams();
    let retries = 0;
    const maxRetries = 60; // ~15s (OAuth callbacks can be slow)

    // Set up auth state listener FIRST
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;

      setSession(session);
      setUser(session?.user ?? null);

      // During OAuth callbacks, session can be unavailable for a short moment.
      // Keep `loading=true` so ProtectedRoute doesn't redirect away mid-exchange.
      if (oauthPending) {
        if (session) {
          oauthPending = false;
          setLoading(false);
          setTimeout(() => {
            if (isMounted && urlHasOAuthParams()) clearOAuthParamsFromUrl();
          }, 0);
        }
        return;
      }

      setLoading(false);
    });

    const pollSession = async () => {
      // Some OAuth flows return tokens in the URL hash (e.g. #access_token=...)
      // If we don't persist them first, getSession() can stay null.
      if (oauthPending) {
        const tokens = getOAuthTokensFromHash();
        if (tokens) {
          await supabase.auth.setSession(tokens);
        }
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!isMounted) return;

      setSession(session);
      setUser(session?.user ?? null);

      if (oauthPending && !session && retries < maxRetries) {
        retries += 1;
        setTimeout(pollSession, 250);
        return;
      }

      oauthPending = false;
      setLoading(false);

      if (urlHasOAuthParams()) {
        setTimeout(() => {
          if (isMounted) clearOAuthParamsFromUrl();
        }, 0);
      }
    };

    // THEN check for existing session (and wait a moment if we're in an OAuth callback)
    pollSession();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/dashboard`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl
      }
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
