import { useState, useEffect } from 'react';
import { GameAccountService } from '@/services/GameAccountService';

/**
 * Hook para gerenciar o estado das contas de jogos vinculadas aos itens
 */
export const useGameAccount = (itemId: string | null) => {
  const [hasLinkedAccount, setHasLinkedAccount] = useState(false);
  const [loading, setLoading] = useState(false);

  // Verifica se o item tem conta vinculada quando o itemId muda
  useEffect(() => {
    const checkLinkedAccount = async () => {
      if (!itemId) {
        setHasLinkedAccount(false);
        return;
      }

      setLoading(true);
      try {
        const hasAccount = await GameAccountService.hasLinkedAccount(itemId);
        setHasLinkedAccount(hasAccount);
      } catch (error) {
        console.error('Error checking linked account:', error);
        setHasLinkedAccount(false);
      } finally {
        setLoading(false);
      }
    };

    checkLinkedAccount();
  }, [itemId]);

  // Função para atualizar o estado quando uma conta é vinculada/desvinculada
  const updateAccountStatus = (hasAccount: boolean) => {
    setHasLinkedAccount(hasAccount);
  };

  return {
    hasLinkedAccount,
    loading,
    updateAccountStatus,
  };
};
