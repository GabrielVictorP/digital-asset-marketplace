import { useEffect, useState } from 'react';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { supabase } from '@/integrations/supabase/client';
import logger from '@/lib/logger';

export interface UserTypeInfo {
  userType: 'admin' | 'customer' | null;
  isAdmin: boolean;
  isCustomer: boolean;
  loading: boolean;
}

export const useUserType = (): UserTypeInfo => {
  const { user, loading: authLoading } = useSupabaseAuth();
  const [userType, setUserType] = useState<'admin' | 'customer' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserType = async () => {
      if (!user || authLoading) {
        setUserType(null);
        setLoading(authLoading);
        return;
      }

      try {
        setLoading(true);

        // First try to get from user metadata (most reliable)
        const metadataType = user.user_metadata?.user_type;
        if (metadataType && (metadataType === 'admin' || metadataType === 'customer')) {
          setUserType(metadataType);
          setLoading(false);
          return;
        }

        // Fallback: check if user is in allowed emails list (admin) using safe function
        try {
          const { data: isAdmin, error: adminError } = await supabase
            .rpc('is_admin_safe');
            
          if (adminError) {
            logger.error('Error checking admin status:', adminError);
            setUserType('customer'); // Default to customer
          } else {
            setUserType(isAdmin ? 'admin' : 'customer');
          }
        } catch (err) {
          logger.error('Error calling is_admin_safe:', err);
          setUserType('customer'); // Default to customer
        }
      } catch (err) {
        logger.error('Unexpected error fetching user type:', err);
        setUserType('customer'); // Default fallback
      } finally {
        setLoading(false);
      }
    };

    fetchUserType();
  }, [user, authLoading]);

  return {
    userType,
    isAdmin: userType === 'admin',
    isCustomer: userType === 'customer',
    loading: loading || authLoading
  };
};
