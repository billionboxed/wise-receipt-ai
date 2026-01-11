import { supabase } from '@/integrations/supabase/client';

// Handle deep link callback for OAuth in native apps
export const handleAuthDeepLink = async (url: string) => {
  console.log('Handling auth deep link:', url);
  
  try {
    // Extract the fragment or query parameters from the URL
    const urlObj = new URL(url);
    
    // Check for OAuth code in query params (PKCE flow)
    const code = urlObj.searchParams.get('code');
    
    if (code) {
      // Exchange the code for a session
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        console.error('Error exchanging code for session:', error);
        return { error };
      }
      console.log('Session established:', data.session?.user?.email);
      return { data };
    }
    
    // Check for tokens in hash fragment (implicit flow)
    if (urlObj.hash) {
      const hashParams = new URLSearchParams(urlObj.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      
      if (accessToken && refreshToken) {
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error) {
          console.error('Error setting session:', error);
          return { error };
        }
        console.log('Session established via tokens:', data.session?.user?.email);
        return { data };
      }
    }
    
    console.log('No auth params found in URL');
    return { error: new Error('No auth params found in deep link') };
  } catch (error) {
    console.error('Error handling auth deep link:', error);
    return { error };
  }
};

// Check if a URL is an auth callback
export const isAuthCallback = (url: string): boolean => {
  try {
    const urlObj = new URL(url);
    return urlObj.pathname.includes('/auth/callback') || 
           urlObj.searchParams.has('code') ||
           urlObj.hash.includes('access_token');
  } catch {
    return false;
  }
};
