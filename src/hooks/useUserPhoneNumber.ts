import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from './useSupabaseAuth';
import logger from '@/lib/logger';
import { config } from '@/lib/config';

export const useUserPhoneNumber = (itemUserId?: string) => {
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { user } = useSupabaseAuth();

  useEffect(() => {
    const fetchPhoneNumber = async () => {
      // If no specific user ID is provided, don't fetch
      if (!itemUserId) {
        setPhoneNumber(null);
        return;
      }

      setLoading(true);
      
      try {
        // For the item owner's own items, fetch their phone number
        if (user && user.id === itemUserId) {
          const { data, error } = await supabase
            .from('profiles')
            .select('phone_number')
            .eq('id', itemUserId)
            .single();

          if (error) {
            logger.error('Error fetching user phone number:', error);
            setPhoneNumber(null);
          } else {
            setPhoneNumber(data?.phone_number || null);
          }
        } else {
          // For other users' items, we don't expose their phone numbers
          setPhoneNumber(null);
        }
      } catch (error) {
        logger.error('Error fetching phone number:', error);
        setPhoneNumber(null);
      } finally {
        setLoading(false);
      }
    };

    fetchPhoneNumber();
  }, [itemUserId, user]);

  // Get the phone number to use for WhatsApp (user's own or fallback)
  const getWhatsAppNumber = () => {
    // If we have the user's phone number, use it
    if (phoneNumber) {
      return phoneNumber;
    }

    // Fallback to environment variable
    return config.app.whatsappNumber;
  };

  return {
    phoneNumber,
    loading,
    getWhatsAppNumber
  };
};
