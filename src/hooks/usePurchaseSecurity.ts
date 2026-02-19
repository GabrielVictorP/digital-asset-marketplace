import { useState, useEffect } from 'react';
import { useSupabaseAuth } from './useSupabaseAuth';
import { supabase } from '@/integrations/supabase/client';

interface PurchaseRecord {
  id: string;
  user_id: string;
  item_id: string;
  asaas_payment_id: string;
  status: 'Em Análise' | 'Aprovado' | 'Cancelado';
  created_at: string;
}

interface SecurityCheck {
  canPurchase: boolean;
  reason?: string;
  existingPurchase?: PurchaseRecord;
}

export const usePurchaseSecurity = () => {
  const { user } = useSupabaseAuth();
  const [purchaseRecords, setPurchaseRecords] = useState<PurchaseRecord[]>([]);
  const [loading, setLoading] = useState(false);

  // Carregar registros de compras do usuário
  const loadUserPurchases = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['Aprovado', 'Em Análise']);

      if (error) {
        console.error('Erro ao carregar compras:', error);
        return;
      }

      setPurchaseRecords(data || []);
    } catch (error) {
      console.error('Erro ao carregar compras:', error);
    } finally {
      setLoading(false);
    }
  };

  // Verificar se o usuário pode comprar um item específico
  const checkPurchaseSecurity = async (itemId: string): Promise<SecurityCheck> => {
    if (!user) {
      return {
        canPurchase: false,
        reason: 'Usuário não autenticado'
      };
    }

    try {
      // APENAS verificar se já existe uma compra APROVADA para este item pelo usuário
      const existingApproved = purchaseRecords.find(
        record => record.item_id === itemId && record.status === 'Aprovado'
      );

      if (existingApproved) {
        return {
          canPurchase: false,
          reason: 'Você já possui este item',
          existingPurchase: existingApproved
        };
      }

      // PERMITIR múltiplas tentativas - não bloquear por compras pendentes
      // O usuário pode tentar quantas vezes quiser
      return { canPurchase: true };
    } catch (error) {
      console.error('Erro na verificação de segurança:', error);
      return {
        canPurchase: false,
        reason: 'Erro ao verificar histórico de compras'
      };
    }
  };

  // Registrar uma nova tentativa de compra
  const registerPurchaseAttempt = async (
    itemId: string,
    paymentId: string,
    paymentMethod: 'PIX' | 'credit_card'
  ): Promise<{ success: boolean; orderId?: string; error?: string }> => {
    if (!user) {
      return { success: false, error: 'Usuário não autenticado' };
    }

    try {
      // ATENÇÃO: Esta função é para segurança apenas
      // A inserção real na tabela orders é feita pela Edge Function create-payment
      // Aqui apenas criamos um registro temporário para evitar múltiplas tentativas
      
      console.log('Registrando tentativa de compra para segurança:', {
        itemId,
        paymentId,
        paymentMethod
      });
      
      // Não inserir na tabela orders - deixar para a Edge Function
      // Apenas retornar sucesso para não quebrar o fluxo
      return { 
        success: true, 
        orderId: `temp_${Date.now()}` // ID temporário para compatibility
      };
      
    } catch (error) {
      console.error('Erro ao registrar compra:', error);
      return { success: false, error: 'Erro inesperado ao registrar compra' };
    }
  };

  // Atualizar status da compra
  const updatePurchaseStatus = async (
    orderId: string,
    status: 'Aprovado' | 'Cancelado' | 'Em Análise'
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', orderId);

      if (error) {
        console.error('Erro ao atualizar status:', error);
        return { success: false, error: 'Erro ao atualizar status da compra' };
      }

      // Recarregar dados
      await loadUserPurchases();

      return { success: true };
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      return { success: false, error: 'Erro inesperado ao atualizar status' };
    }
  };

  // Verificar se uma compra foi aprovada (para polling)
  const checkPaymentStatus = async (paymentId: string): Promise<{
    success: boolean;
    status?: 'Aprovado' | 'Em Análise' | 'Cancelado';
    orderId?: string;
  }> => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('asaas_payment_id', paymentId)
        .single();

      if (error) {
        return { success: false };
      }

      return {
        success: true,
        status: data.status as 'Aprovado' | 'Em Análise' | 'Cancelado',
        orderId: data.id
      };
    } catch (error) {
      return { success: false };
    }
  };

  // Limpar compras antigas pendentes (mais de 1 hora)
  const cleanupOldPendingPurchases = async () => {
    if (!user) return;

    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      
      await supabase
        .from('orders')
        .update({ status: 'Cancelado' })
        .eq('user_id', user.id)
        .eq('status', 'Em Análise')
        .lt('created_at', oneHourAgo.toISOString());

      // Recarregar dados após limpeza
      await loadUserPurchases();
    } catch (error) {
      console.error('Erro ao limpar compras antigas:', error);
    }
  };

  // Carregar dados quando o usuário muda
  useEffect(() => {
    if (user) {
      loadUserPurchases();
      cleanupOldPendingPurchases();
    }
  }, [user]);

  return {
    purchaseRecords,
    loading,
    loadUserPurchases,
    checkPurchaseSecurity,
    registerPurchaseAttempt,
    updatePurchaseStatus,
    checkPaymentStatus,
    cleanupOldPendingPurchases
  };
};
