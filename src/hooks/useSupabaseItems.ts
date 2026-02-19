import { useContext } from 'react';
import { SupabaseItemsContext, type ItemsContextType } from '@/contexts/SupabaseItemsContext';

export const useSupabaseItems = (): ItemsContextType => {
  const context = useContext(SupabaseItemsContext);
  if (context === undefined) {
    throw new Error('useSupabaseItems must be used within a SupabaseItemsProvider');
  }
  return context;
};
