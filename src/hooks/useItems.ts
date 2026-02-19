import { useContext } from 'react';
import { ItemsContext, type ItemsContextType } from '@/contexts/ItemsContext';

export const useItems = (): ItemsContextType => {
  const context = useContext(ItemsContext);
  if (context === undefined) {
    throw new Error('useItems must be used within an ItemsProvider');
  }
  return context;
};
