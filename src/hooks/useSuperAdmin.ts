import { useEffect, useState } from 'react';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';

export interface SuperAdminInfo {
  isSuperAdmin: boolean;
  loading: boolean;
}

const SUPER_ADMIN_EMAIL = 'support@example.com';

export const useSuperAdmin = (): SuperAdminInfo => {
  const { user, loading: authLoading } = useSupabaseAuth();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSuperAdmin = () => {
      if (authLoading) {
        setLoading(true);
        return;
      }

      if (!user) {
        setIsSuperAdmin(false);
        setLoading(false);
        return;
      }

      // Verificar se o email do usuário é o super admin
      const userEmail = user.email?.toLowerCase();
      const isSuper = userEmail === SUPER_ADMIN_EMAIL.toLowerCase();
      
      setIsSuperAdmin(isSuper);
      setLoading(false);
    };

    checkSuperAdmin();
  }, [user, authLoading]);

  return {
    isSuperAdmin,
    loading: loading || authLoading
  };
};
