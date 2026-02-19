import { supabase } from '@/integrations/supabase/client';

/**
 * Verifica se um item tem accounts vinculadas
 * Usa uma função SQL pública que contorna as políticas RLS
 * 
 * @param itemId - ID do item a ser verificado
 * @returns Promise<boolean> - true se tem accounts vinculadas
 */
export async function checkItemHasAccounts(itemId: string): Promise<boolean> {
  try {
    // Usar a função SQL pública que contorna RLS
    const { data, error } = await supabase
      .rpc('check_item_has_accounts', { item_id_param: itemId });

    if (error) {
      console.error('Erro na função check_item_has_accounts:', error);
      return false;
    }

    const hasAccount = data === true;
    if (hasAccount) {
      console.log('✅ Account encontrada para o item', itemId);
    } else {
      console.log('ℹ️ Nenhuma account vinculada para o item', itemId);
    }
    return hasAccount;
  } catch (error) {
    console.error('Erro ao verificar accounts do item:', error);
    return false;
  }
}

/**
 * Versão otimizada para uso no CheckoutForm
 * Inclui cache local para evitar múltiplas consultas
 */
const accountCheckCache = new Map<string, boolean>();

export async function checkItemHasAccountsCached(itemId: string): Promise<boolean> {
  if (accountCheckCache.has(itemId)) {
    return accountCheckCache.get(itemId)!;
  }

  const result = await checkItemHasAccounts(itemId);
  accountCheckCache.set(itemId, result);
  
  // Limpar cache após 5 minutos
  setTimeout(() => {
    accountCheckCache.delete(itemId);
  }, 5 * 60 * 1000);

  return result;
}
