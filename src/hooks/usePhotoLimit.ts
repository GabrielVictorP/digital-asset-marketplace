import { useState, useEffect } from 'react';
import { useSupabaseAuth } from './useSupabaseAuth';
import { supabase } from '@/integrations/supabase/client';
import logger from '@/lib/logger';

interface PhotoLimitInfo {
  photoLimit: number;
  currentCount: number;
  canCreate: boolean;
  loading: boolean;
}

export const usePhotoLimit = () => {
  const { user } = useSupabaseAuth();
  const [photoLimitInfo, setPhotoLimitInfo] = useState<PhotoLimitInfo>({
    photoLimit: 0,
    currentCount: 0,
    canCreate: false,
    loading: true
  });

  const checkPhotoLimit = async () => {
    if (!user?.email) {
      setPhotoLimitInfo({
        photoLimit: 0,
        currentCount: 0,
        canCreate: false,
        loading: false
      });
      return;
    }

    try {
      setPhotoLimitInfo(prev => ({ ...prev, loading: true }));

      // Use RPC function to get photo limit info (handles RLS and admin logic)
      const { data: limitData, error: limitError } = await (supabase as any)
        .rpc('get_my_photo_limit');

      if (limitError) {
        logger.error('Error getting photo limit:', limitError);
        // Fallback to default
        setPhotoLimitInfo({
          photoLimit: 5,
          currentCount: 0,
          canCreate: true,
          loading: false
        });
        return;
      }

      if (limitData && Array.isArray(limitData) && limitData.length > 0) {
        const result = limitData[0];
        setPhotoLimitInfo({
          photoLimit: result.photo_limit,
          currentCount: result.current_count,
          canCreate: result.can_create,
          loading: false
        });
      } else {
        // No data returned, use default
        setPhotoLimitInfo({
          photoLimit: 5,
          currentCount: 0,
          canCreate: true,
          loading: false
        });
      }
    } catch (error) {
      logger.error('Error in checkPhotoLimit:', error);
      setPhotoLimitInfo({
        photoLimit: 5,
        currentCount: 0,
        canCreate: true,
        loading: false
      });
    }
  };

  useEffect(() => {
    checkPhotoLimit();
  }, [user?.email]);

  return {
    ...photoLimitInfo,
    refreshPhotoLimit: checkPhotoLimit
  };
};
