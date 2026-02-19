// ============================================
// ASAAS CUSTOMER SERVICE
// Gerenciamento de clientes com sincronização Supabase
// ============================================

import { supabase } from '@/integrations/supabase/client';
import type { 
  IAsaasCustomer,
  AsaasCustomerResponse,
  CreateCustomerRequest,
  CustomerServiceResponse,
  DbAsaasCustomer
} from '@/types/asaas'

export class AsaasCustomerService {
  private static readonly ASAAS_API_URL = import.meta.env.VITE_ASAAS_ENV === 'production' 
    ? 'https://api.asaas.com/v3'
    : 'https://sandbox.asaas.com/api/v3'

  private static readonly API_KEY = import.meta.env.VITE_ASAAS_API_KEY

  // ============================================
  // ASAAS API METHODS
  // ============================================
  
  /**
   * Criar cliente no Asaas via Edge Function
   */
  static async createCustomer(customerData: CreateCustomerRequest): Promise<CustomerServiceResponse> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        return { success: false, error: 'Usuário não autenticado' }
      }

      // Call Supabase Edge Function para criar cliente
      console.log('Chamando create-customer com dados:', customerData)
      
      const { data, error } = await supabase.functions.invoke('create-customer', {
        body: customerData
      })

      console.log('Resposta da Edge Function:', { data, error })

      if (error) {
        console.error('Erro detalhado da Edge Function:', error)
        return { 
          success: false, 
          error: `Erro na Edge Function: ${error.message || error.toString()}`
        }
      }

      if (!data || !data.success) {
        const errorMessage = data?.error || 'Erro desconhecido ao criar cliente'
        console.error('Edge Function retornou erro:', errorMessage)
        return {
          success: false,
          error: errorMessage
        }
      }

      return { success: true, data: data.data }
    } catch (error) {
      console.error('Erro no createCustomer:', error)
      return { success: false, error: 'Erro interno' }
    }
  }

  /**
   * Buscar cliente por ID do Asaas
   */
  static async getCustomer(customerId: string): Promise<CustomerServiceResponse> {
    try {
      const response = await fetch(`${this.ASAAS_API_URL}/customers/${customerId}`, {
        headers: {
          'access_token': this.API_KEY,
          'Content-Type': 'application/json',
        }
      })

      if (!response.ok) {
        return { success: false, error: 'Cliente não encontrado' }
      }

      const data: AsaasCustomerResponse = await response.json()
      return { success: true, data }
    } catch (error) {
      console.error('Erro ao buscar cliente:', error)
      return { success: false, error: 'Erro ao buscar cliente' }
    }
  }

  /**
   * Atualizar cliente no Asaas
   */
  static async updateCustomer(
    customerId: string, 
    updateData: Partial<IAsaasCustomer>
  ): Promise<CustomerServiceResponse> {
    try {
      const response = await fetch(`${this.ASAAS_API_URL}/customers/${customerId}`, {
        method: 'POST',
        headers: {
          'access_token': this.API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData)
      })

      if (!response.ok) {
        return { success: false, error: 'Erro ao atualizar cliente' }
      }

      const data: AsaasCustomerResponse = await response.json()
      
      // Sync with Supabase
      await this.syncCustomerToSupabase(data)
      
      return { success: true, data }
    } catch (error) {
      console.error('Erro ao atualizar cliente:', error)
      return { success: false, error: 'Erro ao atualizar cliente' }
    }
  }

  // ============================================
  // SUPABASE SYNC METHODS
  // ============================================

  /**
   * Sincronizar cliente do Asaas com Supabase
   */
  static async syncCustomer(asaasCustomerId: string): Promise<CustomerServiceResponse> {
    try {
      // Buscar no Asaas
      const asaasResponse = await this.getCustomer(asaasCustomerId)
      
      if (!asaasResponse.success || !asaasResponse.data) {
        return { success: false, error: 'Cliente não encontrado no Asaas' }
      }

      // Salvar/atualizar no Supabase
      const syncResult = await this.syncCustomerToSupabase(asaasResponse.data)
      
      if (!syncResult) {
        return { success: false, error: 'Erro ao sincronizar com Supabase' }
      }

      return { success: true, data: asaasResponse.data }
    } catch (error) {
      console.error('Erro no syncCustomer:', error)
      return { success: false, error: 'Erro na sincronização' }
    }
  }

  /**
   * Salvar/atualizar cliente no Supabase
   */
  private static async syncCustomerToSupabase(customer: AsaasCustomerResponse): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        console.error('Usuário não autenticado para sync')
        return false
      }

      const customerData: Partial<DbAsaasCustomer> = {
        asaas_customer_id: customer.id,
        user_id: user.id,
        name: customer.name,
        email: customer.email,
        cpf_cnpj: customer.cpfCnpj,
        phone: customer.phone || customer.mobilePhone || null,
        address_data: {
          address: customer.address,
          addressNumber: customer.addressNumber,
          complement: customer.complement,
          province: customer.province,
          city: customer.city,
          state: customer.state,
          postalCode: customer.postalCode
        }
      }

      const { error } = await supabase
        .from('asaas_customers')
        .upsert(customerData, { 
          onConflict: 'asaas_customer_id' 
        })

      if (error) {
        console.error('Erro ao salvar no Supabase:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Erro no syncCustomerToSupabase:', error)
      return false
    }
  }

  // ============================================
  // SUPABASE QUERY METHODS
  // ============================================

  /**
   * Buscar clientes do usuário no Supabase
   */
  static async getCustomersFromSupabase(): Promise<DbAsaasCustomer[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error('Usuário não autenticado')
      }

      const { data, error } = await supabase
        .from('asaas_customers')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Erro ao buscar clientes no Supabase:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Erro no getCustomersFromSupabase:', error)
      return []
    }
  }

  /**
   * Buscar cliente por CPF/CNPJ no Supabase
   */
  static async findCustomerByCpfCnpj(cpfCnpj: string): Promise<DbAsaasCustomer | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        return null
      }

      const { data, error } = await supabase
        .from('asaas_customers')
        .select('*')
        .eq('user_id', user.id)
        .eq('cpf_cnpj', cpfCnpj)
        .single()

      if (error || !data) {
        return null
      }

      return data
    } catch (error) {
      console.error('Erro ao buscar por CPF/CNPJ:', error)
      return null
    }
  }

  /**
   * Deletar cliente (marcar como inativo)
   */
  static async deleteCustomer(customerId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.ASAAS_API_URL}/customers/${customerId}`, {
        method: 'DELETE',
        headers: {
          'access_token': this.API_KEY,
          'Content-Type': 'application/json',
        }
      })

      return response.ok
    } catch (error) {
      console.error('Erro ao deletar cliente:', error)
      return false
    }
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Validar CPF/CNPJ
   */
  static validateCpfCnpj(cpfCnpj: string): boolean {
    const cleaned = cpfCnpj.replace(/\D/g, '')
    return cleaned.length === 11 || cleaned.length === 14
  }

  /**
   * Formatar CPF/CNPJ para envio ao Asaas (apenas números)
   */
  static formatCpfCnpj(cpfCnpj: string): string {
    return cpfCnpj.replace(/\D/g, '')
  }

  /**
   * Verificar se é pessoa física ou jurídica
   */
  static getPersonType(cpfCnpj: string): 'FISICA' | 'JURIDICA' {
    const cleaned = cpfCnpj.replace(/\D/g, '')
    return cleaned.length === 11 ? 'FISICA' : 'JURIDICA'
  }
}
