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

    const clearOAuthParamsFromUrl = () => {
      // Remove query/hash so refreshes don't re-trigger the callback flow
      window.history.replaceState({}, document.title, window.location.pathname);
    };

    let oauthPending = urlHasOAuthParams();
    let retries = 0;
    const maxRetries = 12; // ~3s

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
