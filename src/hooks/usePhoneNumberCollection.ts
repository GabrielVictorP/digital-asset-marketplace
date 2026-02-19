import { useState, useEffect } from 'react';
import { useSupabaseAuth } from './useSupabaseAuth';
import { useUserType } from './useUserType';
import { supabase } from '@/integrations/supabase/client';
import logger from '@/lib/logger';

export const usePhoneNumberCollection = () => {
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [userPhoneNumber, setUserPhoneNumber] = useState<string | null>(null);
  const { user } = useSupabaseAuth();
  const { isAdmin, loading: userTypeLoading } = useUserType();

  // Check if user has phone number when they log in (only for admins)
  useEffect(() => {
    const checkUserPhoneNumber = async () => {
      if (!user || userTypeLoading) {
        setShowPhoneModal(false);
        setUserPhoneNumber(null);
        return;
      }

      // Only show phone modal for admin users (sellers)
      if (!isAdmin) {
        setShowPhoneModal(false);
        setUserPhoneNumber(null);
        return;
      }

      try {
        // First, try to get user's data from profiles table
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('phone_number')
          .eq('id', user.id)
          .maybeSingle();

        if (profileError) {
          logger.error('Error fetching user profile:', profileError);
          
          // If profiles fails, try users table as fallback
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('phone_number')
            .eq('user_id', user.id)
            .maybeSingle();

          if (userError) {
            logger.error('Error fetching user data:', userError);
            return;
          }

          setUserPhoneNumber(userData?.phone_number || null);
          
          // Show modal if user doesn't have phone number
          if (!userData?.phone_number) {
            setTimeout(() => {
              setShowPhoneModal(true);
            }, 1000);
          }
        } else {
          setUserPhoneNumber(profileData?.phone_number || null);
          
          // Show modal if user doesn't have phone number
          if (!profileData?.phone_number) {
            setTimeout(() => {
              setShowPhoneModal(true);
            }, 1000);
          }
        }
      } catch (error) {
        logger.error('Error checking user phone number:', error);
      }
    };

    checkUserPhoneNumber();
  }, [user, isAdmin, userTypeLoading]);

  const handlePhoneNumberSaved = (phoneNumber: string) => {
    setUserPhoneNumber(phoneNumber);
    setShowPhoneModal(false);
  };

  const closePhoneModal = () => {
    setShowPhoneModal(false);
  };

  return {
    showPhoneModal,
    userPhoneNumber,
    handlePhoneNumberSaved,
    closePhoneModal,
    user
  };
};
