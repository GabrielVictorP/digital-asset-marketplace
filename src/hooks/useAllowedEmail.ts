import { useEffect, useState } from 'react';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { supabase } from '@/integrations/supabase/client';
import logger from '@/lib/logger';

export interface AllowedEmailInfo {
  isAllowedEmail: boolean;
  loading: boolean;
}

export const useAllowedEmail = (): AllowedEmailInfo => {
  const { user, loading: authLoading } = useSupabaseAuth();
  const [isAllowedEmail, setIsAllowedEmail] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAllowedEmail = async () => {
      if (authLoading) {
        setLoading(true);
        return;
      }

      if (!user || !user.email) {
        setIsAllowedEmail(false);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Usa função RPC para contornar políticas RLS
        const { data, error } = await supabase
          .rpc('is_allowed_email');

        if (error) {
          logger.error('Error checking allowed_emails:', error);
          setIsAllowedEmail(false);
        } else {
          setIsAllowedEmail(data === true);
        }
      } catch (err) {
        logger.error('Unexpected error checking allowed_emails:', err);
        setIsAllowedEmail(false);
      } finally {
        setLoading(false);
      }
    };

    checkAllowedEmail();
  }, [user, authLoading]);

  return {
    isAllowedEmail,
    loading: loading || authLoading
  };
};
