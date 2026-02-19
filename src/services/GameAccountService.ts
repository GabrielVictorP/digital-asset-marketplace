import { supabase } from '@/integrations/supabase/client';
import { GameAccount, CreateGameAccountData, UpdateGameAccountData } from '@/types/accounts';

/**
 * Serviço para gerenciar contas de jogos vinculadas aos itens
 * Apenas acessível pelo usuário support@example.com
 */
export class GameAccountService {
  /**
   * Busca a conta vinculada a um item específico
   */
  static async getAccountByItemId(itemId: string): Promise<GameAccount | null> {
    try {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('item_id', itemId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching game account:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in getAccountByItemId:', error);
      throw error;
    }
  }

  /**
   * Cria uma nova conta vinculada a um item
   */
  static async createAccount(accountData: CreateGameAccountData): Promise<GameAccount> {
    try {
      const { data, error } = await supabase
        .from('accounts')
        .insert(accountData)
        .select()
        .single();

      if (error) {
        console.error('Error creating game account:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in createAccount:', error);
      throw error;
    }
  }

  /**
   * Atualiza uma conta existente
   */
  static async updateAccount(itemId: string, updateData: UpdateGameAccountData): Promise<GameAccount> {
    try {
      const { data, error } = await supabase
        .from('accounts')
        .update(updateData)
        .eq('item_id', itemId)
        .select()
        .single();

      if (error) {
        console.error('Error updating game account:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in updateAccount:', error);
      throw error;
    }
  }

  /**
   * Remove a conta vinculada a um item
   */
  static async deleteAccount(itemId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('accounts')
        .delete()
        .eq('item_id', itemId);

      if (error) {
        console.error('Error deleting game account:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error in deleteAccount:', error);
      throw error;
    }
  }

  /**
   * Verifica se um item tem conta vinculada
   */
  static async hasLinkedAccount(itemId: string): Promise<boolean> {
    try {
      const account = await this.getAccountByItemId(itemId);
      return account !== null;
    } catch (error) {
      console.error('Error checking linked account:', error);
      return false;
    }
  }
}
