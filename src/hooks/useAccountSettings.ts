import { useState, useEffect } from 'react';
import { useSupabaseAuth } from './useSupabaseAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import logger from '@/lib/logger';

export interface UserAccountData {
  full_name: string | null;
  email: string | null;
  phone_number: string | null;
}

export interface UpdateAccountData {
  full_name?: string;
  phone_number?: string;
}

export const useAccountSettings = () => {
  const { user } = useSupabaseAuth();
  const [userData, setUserData] = useState<UserAccountData>({
    full_name: null,
    email: null,
    phone_number: null
  });
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Fetch user data when component mounts or user changes
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) {
        setUserData({
          full_name: null,
          email: null,
          phone_number: null
        });
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        logger.info('Fetching user data for:', user.id);

        // Get user data from users table first (for customers)
        const { data: userDataFromDb, error } = await supabase
          .from('users')
          .select('full_name, email, phone_number')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          logger.error('Error fetching from users table:', error);
        }

        if (userDataFromDb) {
          // User found in users table
          logger.info('User data found in users table:', userDataFromDb);
          setUserData({
            full_name: userDataFromDb.full_name || null,
            email: userDataFromDb.email || user.email || null,
            phone_number: userDataFromDb.phone_number || null
          });
        } else {
          // Fallback: check profiles table (for admin users)
          logger.info('User not found in users table, checking profiles...');
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('full_name, email, phone_number')
            .eq('id', user.id)
            .maybeSingle();
          
          if (profileError) {
            logger.error('Error fetching user profile:', profileError);
          }

          if (profileData) {
            logger.info('User data found in profiles table:', profileData);
            setUserData({
              full_name: profileData.full_name || null,
              email: profileData.email || user.email || null,
              phone_number: profileData.phone_number || null
            });
          } else {
            // No data found in either table, use auth data
            logger.info('No data found in tables, using auth data');
            setUserData({
              full_name: null,
              email: user.email || null,
              phone_number: null
            });
          }
        }
      } catch (error) {
        logger.error('Unexpected error fetching user data:', error);
        // Still set email from auth even if there's an error
        setUserData({
          full_name: null,
          email: user.email || null,
          phone_number: null
        });
        toast.error('Erro ao carregar alguns dados da conta');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [user]);

  // Update user account data
  const updateAccountData = async (updates: UpdateAccountData) => {
    if (!user) {
      toast.error('Usuário não encontrado');
      return false;
    }

    try {
      setUpdating(true);

      // Update data in users table using universal function
      const { data, error } = await supabase
        .rpc('update_user_account_universal', { 
          updates: updates
        });

      if (error) {
        logger.error('Error updating account data:', error);
        toast.error('Erro ao atualizar dados da conta');
        return false;
      }

      if (data) {
        // Update local state
        setUserData(prev => ({ ...prev, ...updates }));
        toast.success('Dados atualizados com sucesso!');
        return true;
      } else {
        toast.error('Erro ao atualizar dados da conta');
        return false;
      }
    } catch (error) {
      logger.error('Error updating account data:', error);
      toast.error('Erro ao atualizar dados da conta');
      return false;
    } finally {
      setUpdating(false);
    }
  };

  // Update user password
  const updatePassword = async (newPassword: string) => {
    try {
      setUpdating(true);

      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        logger.error('Error updating password:', error);
        toast.error('Erro ao atualizar senha');
        return false;
      }

      toast.success('Senha atualizada com sucesso!');
      return true;
    } catch (error) {
      logger.error('Error updating password:', error);
      toast.error('Erro ao atualizar senha');
      return false;
    } finally {
      setUpdating(false);
    }
  };

  return {
    userData,
    loading,
    updating,
    updateAccountData,
    updatePassword
  };
};
