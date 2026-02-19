import { useContext } from 'react';
import { SupabaseAuthContext, type AuthContextType } from '@/contexts/SupabaseAuthContext';

export const useSupabaseAuth = (): AuthContextType => {
  const context = useContext(SupabaseAuthContext);
  if (context === undefined) {
    throw new Error('useSupabaseAuth must be used within a SupabaseAuthProvider');
  }
  return context;
};
