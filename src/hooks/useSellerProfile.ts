import { useEffect, useState } from 'react';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';

export interface SellerProfile {
  isSeller: boolean;
  loading: boolean;
  error: string | null;
}

export const useSellerProfile = (): SellerProfile => {
  const { user, loading: authLoading } = useSupabaseAuth();
  const [isSeller, setIsSeller] = useState(false);
  const [loading, setLoading] = useState(false); // Não carregar, retornar imediatamente
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // TEMPORÁRIO: Desabilitar verificação de seller para não travar checkout
    // Sempre retornar false (não é seller) para permitir compras
    if (user && !authLoading) {
      setIsSeller(false);
      setLoading(false);
      setError(null);
    }
  }, [user, authLoading]);

  return {
    isSeller: false, // Sempre false para permitir compras
    loading: authLoading, // Apenas aguardar autenticação
    error: null
  };
};
