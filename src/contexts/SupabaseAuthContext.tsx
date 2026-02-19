import { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getConfig } from '@/lib/config';
import logger from '@/lib/logger';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  signUp: (email: string, password: string, fullName?: string, metadata?: Record<string, any>) => Promise<{ error: AuthError | Error | null; isCustomer?: boolean }>;
  signIn: (email: string, password: string, skipEmailCheck?: boolean) => Promise<{ error: AuthError | Error | null }>;
  signOut: () => Promise<void>;
  loading: boolean;
}

const SupabaseAuthContext = createContext<AuthContextType | undefined>(undefined);

export const SupabaseAuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      } catch (error) {
        logger.error('Error getting initial session:', error);
        if (!mounted) return;
        setLoading(false);
      }
    };
    
    getInitialSession();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const sendLoginNotification = async (email: string) => {
    try {
      // Get user's timezone and locale
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const userLocale = navigator.language || 'pt-BR';

      // Try to get user's IP address (optional, will be detected server-side if possible)
      let userIP = 'Unknown';
      try {
        const ipResponse = await fetch('https://api.ipify.org?format=json');
        if (ipResponse.ok) {
          const ipData = await ipResponse.json();
          userIP = ipData.ip;
        }
      } catch (ipError) {
        // Ignore IP detection errors - not critical for functionality
      }

      await supabase.functions.invoke('send-login-notification', {
        body: {
          email,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          ip: userIP,
          timezone: userTimezone,
          locale: userLocale
        }
      });
    } catch (error) {
      logger.error('Failed to send login notification:', error);
      // Don't show error to user as this is not critical
    }
  };

  const signUp = async (email: string, password: string, fullName?: string, metadata?: Record<string, any>) => {
    const redirectUrl = `${window.location.origin}/`;
    
    // Prepare user metadata
    const userData: Record<string, any> = {};
    if (fullName) userData.full_name = fullName;
    if (metadata) Object.assign(userData, metadata);

    // Check if this is a customer signup (no email confirmation needed)
    const isCustomer = userData.user_type === 'customer';

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: isCustomer ? undefined : redirectUrl,
        data: Object.keys(userData).length > 0 ? userData : undefined
      }
    });

    if (error) {
      toast.error(error.message);
    } else {
      if (isCustomer) {
        toast.success('Conta criada com sucesso! Você já pode fazer login.');
      } else {
        toast.success('Verifique seu email para confirmar sua conta!');
      }
    }

    return { error, isCustomer };
  };

  const signIn = async (email: string, password: string, skipEmailCheck?: boolean) => {
    // Only check if email is allowed for admin users (when skipEmailCheck is false or undefined)
    if (!skipEmailCheck) {
      try {
        const { data: isAllowed, error: checkError } = await supabase
          .rpc('is_email_allowed', { email_to_check: email.trim().toLowerCase() });
        
        if (checkError) {
          logger.error('Error checking email permission:', checkError);
          // Continue with login if check fails (fallback behavior)
        } else if (!isAllowed) {
          const error = new Error('Acesso não autorizado. Sua conta foi desativada pelo administrador.');
          toast.error(error.message);
          return { error };
        }
      } catch (error) {
        logger.error('Error checking email permission:', error);
        // Continue with login if check fails (fallback behavior)
      }
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Login realizado com sucesso!');
      // Send login notification only for admin users
      if (!skipEmailCheck) {
        await sendLoginNotification(email);
      }
    }

    return { error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Logout realizado com sucesso!');
    }
  };

  return (
    <SupabaseAuthContext.Provider value={{
      user,
      session,
      signUp,
      signIn,
      signOut,
      loading
    }}>
      {children}
    </SupabaseAuthContext.Provider>
  );
};

// Export the context and type for use in the hook
export { SupabaseAuthContext };
export type { AuthContextType };
