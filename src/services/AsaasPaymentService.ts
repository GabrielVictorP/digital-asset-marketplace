// ============================================
// ASAAS PAYMENT SERVICE
// Gerenciamento de pagamentos com sincronização Supabase
// ============================================

import { supabase } from '@/integrations/supabase/client';
import type { 
  IAsaasPayment,
  AsaasPaymentResponse,
  CreatePaymentRequest,
  PaymentServiceResponse,
  DbAsaasPayment,
  AsaasPaymentMethod,
  AsaasApiResponse,
  ASAAS_STATUS_MAP,
  BILLING_TYPE_MAP
} from '@/types/asaas'

export class AsaasPaymentService {
  private static readonly ASAAS_API_URL = import.meta.env.VITE_ASAAS_ENV === 'production' 
    ? 'https://api.asaas.com/v3'
    : 'https://sandbox.asaas.com/api/v3'

  private static readonly API_KEY = import.meta.env.VITE_ASAAS_API_KEY

  // ============================================
  // PAYMENT CREATION METHODS
  // ============================================
  
  /**
   * Criar pagamento no Asaas via Edge Function
   */
  static async createPayment(paymentData: CreatePaymentRequest): Promise<PaymentServiceResponse> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        return { success: false, error: 'Usuário não autenticado' }
      }

      // Call Supabase Edge Function para criar pagamento
      console.log('Sending payment data to Edge Function:', JSON.stringify(paymentData, null, 2))
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: paymentData
      })

      if (error) {
        console.error('Erro ao criar pagamento:', error)
        // Tentar extrair detalhes do erro retornado pela função (se houver)
        const detailedMessage = (error as any)?.context?.message || (error as any)?.hint || error.message
        return { 
          success: false, 
          error: detailedMessage || 'Erro ao criar pagamento' 
        }
      }

      if (!data?.success) {
        const combinedError = [data?.error, data?.message].filter(Boolean).join(' - ')
        return {
          success: false,
          error: data?.error || combinedError || 'Erro desconhecido ao criar pagamento',
          message: data?.message // Preservar mensagem original para o frontend
        }
      }

      return {
        success: true,
        data: data.data,
        pixQrCode: data.data.pixQrCode,
        pixCopyPaste: data.data.pixCopyPaste,
        paymentLink: data.data.paymentLink
      }
    } catch (error) {
      console.error('Erro no createPayment:', error)
      return { success: false, error: 'Erro interno' }
    }
  }

  /**
   * Criar pagamento PIX
   */
  static async createPixPayment(
    customerId: string,
    value: number,
    description?: string,
    externalReference?: string
  ): Promise<PaymentServiceResponse> {
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 1) // Vence amanhã

    return this.createPayment({
      customerId,
      billingType: 'PIX',
      value,
      dueDate: dueDate.toISOString().split('T')[0],
      description,
      externalReference
    })
  }

  /**
   * Criar pagamento por cartão
   */
  static async createCreditCardPayment(
    customerId: string,
    value: number,
    description?: string,
    installments?: number,
    externalReference?: string
  ): Promise<PaymentServiceResponse> {
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 30) // Vence em 30 dias

    return this.createPayment({
      customerId,
      billingType: 'CREDIT_CARD',
      value,
      dueDate: dueDate.toISOString().split('T')[0],
      description,
      externalReference
    })
  }

  /**
   * Criar boleto
   */
  static async createBoletoPayment(
    customerId: string,
    value: number,
    dueDate: string,
    description?: string,
    externalReference?: string
  ): Promise<PaymentServiceResponse> {
    return this.createPayment({
      customerId,
      billingType: 'BOLETO',
      value,
      dueDate,
      description,
      externalReference
    })
  }

  // ============================================
  // PAYMENT QUERY METHODS
  // ============================================

  /**
   * Buscar pagamento por ID do Asaas via Edge Function
   */
  static async getPayment(paymentId: string): Promise<PaymentServiceResponse> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        return { success: false, error: 'Usuário não autenticado' }
      }

      // Call Supabase Edge Function para buscar pagamento
      const { data, error } = await supabase.functions.invoke('get-payment', {
        body: { paymentId }
      })

      if (error) {
        console.error('Erro ao buscar pagamento:', error)
        return { 
          success: false, 
          error: error.message || 'Erro ao buscar pagamento' 
        }
      }

      if (!data.success) {
        return {
          success: false,
          error: data.error || 'Erro desconhecido ao buscar pagamento'
        }
      }

      return {
        success: true,
        data: data.data,
        pixQrCode: data.data.pixQrCode,
        pixCopyPaste: data.data.pixCopyPaste,
        paymentLink: data.data.paymentLink
      }
    } catch (error) {
      console.error('Erro no getPayment:', error)
      return { success: false, error: 'Erro interno ao buscar pagamento' }
    }
  }

  /**
   * Buscar dados do QR Code PIX pelo endpoint dedicado
   */
  static async fetchPixQrCode(paymentId: string): Promise<PaymentServiceResponse> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { success: false, error: 'Usuário não autenticado' }
      }

      const { data, error } = await supabase.functions.invoke('get-pix-qrcode', {
        body: { paymentId }
      })

      if (error) {
        console.error('Erro ao buscar QR Code PIX (edge):', error)
        return { success: false, error: error.message || 'Erro ao buscar QR Code PIX' }
      }

      if (!data?.success) {
        return { success: false, error: data?.error || 'Erro ao buscar QR Code PIX' }
      }

      return {
        success: true,
        pixQrCode: data.data?.pixQrCode || null,
        pixCopyPaste: data.data?.pixCopyPaste || null
      }
    } catch (error) {
      console.error('Erro no fetchPixQrCode:', error)
      return { success: false, error: 'Erro interno ao buscar QR Code PIX' }
    }
  }

  /**
   * Listar pagamentos do Asaas
   */
  static async listPayments(
    customerId?: string,
    status?: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<AsaasPaymentResponse[]> {
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString()
      })

      if (customerId) params.append('customer', customerId)
      if (status) params.append('status', status)

      const response = await fetch(`${this.ASAAS_API_URL}/payments?${params}`, {
        headers: {
          'access_token': this.API_KEY,
          'Content-Type': 'application/json',
        }
      })

      if (!response.ok) {
        console.error('Erro ao listar pagamentos')
        return []
      }

      const result: AsaasApiResponse<AsaasPaymentResponse> = await response.json()
      
      // Sync all payments to Supabase
      for (const payment of result.data) {
        await this.syncPaymentToSupabase(payment)
      }
      
      return result.data
    } catch (error) {
      console.error('Erro ao listar pagamentos:', error)
      return []
    }
  }

  /**
   * Cancelar pagamento
   */
  static async cancelPayment(paymentId: string): Promise<PaymentServiceResponse> {
    try {
      const response = await fetch(`${this.ASAAS_API_URL}/payments/${paymentId}`, {
        method: 'DELETE',
        headers: {
          'access_token': this.API_KEY,
          'Content-Type': 'application/json',
        }
      })

      if (!response.ok) {
        return { success: false, error: 'Erro ao cancelar pagamento' }
      }

      const data: AsaasPaymentResponse = await response.json()
      
      // Sync with Supabase
      await this.syncPaymentToSupabase(data)
      
      return { success: true, data }
    } catch (error) {
      console.error('Erro ao cancelar pagamento:', error)
      return { success: false, error: 'Erro ao cancelar pagamento' }
    }
  }

  // ============================================
  // SUPABASE SYNC METHODS
  // ============================================

  /**
   * Sincronizar pagamento do Asaas com Supabase
   */
  static async syncPayment(asaasPaymentId: string): Promise<PaymentServiceResponse> {
    try {
      // Buscar no Asaas
      const asaasResponse = await this.getPayment(asaasPaymentId)
      
      if (!asaasResponse.success || !asaasResponse.data) {
        return { success: false, error: 'Pagamento não encontrado no Asaas' }
      }

      return asaasResponse
    } catch (error) {
      console.error('Erro no syncPayment:', error)
      return { success: false, error: 'Erro na sincronização' }
    }
  }

  /**
   * Salvar/atualizar pagamento no Supabase
   */
  private static async syncPaymentToSupabase(payment: AsaasPaymentResponse): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        console.error('Usuário não autenticado para sync')
        return false
      }

      // Buscar customer_id no Supabase baseado no asaas_customer_id
      const { data: customer } = await supabase
        .from('asaas_customers')
        .select('id')
        .eq('asaas_customer_id', payment.customer)
        .eq('user_id', user.id)
        .single()

      const paymentData: Partial<DbAsaasPayment> = {
        asaas_payment_id: payment.id,
        customer_id: customer?.id || null,
        user_id: user.id,
        value: payment.value,
        net_value: payment.netValue,
        description: payment.description || null,
        payment_method: BILLING_TYPE_MAP[payment.billingType] || 'PIX',
        status: ASAAS_STATUS_MAP[payment.status] || 'PENDING',
        due_date: payment.dueDate,
        pix_qr_code: payment.pixTransaction?.qrCode || null,
        pix_copy_paste: payment.pixTransaction?.copyAndPaste || null,
        payment_link: payment.invoiceUrl || null,
        external_reference: payment.externalReference || null
      }

      const { error } = await supabase
        .from('asaas_payments')
        .upsert(paymentData, { 
          onConflict: 'asaas_payment_id' 
        })

      if (error) {
        console.error('Erro ao salvar pagamento no Supabase:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Erro no syncPaymentToSupabase:', error)
      return false
    }
  }

  // ============================================
  // SUPABASE QUERY METHODS
  // ============================================

  /**
   * Buscar pagamentos do usuário no Supabase
   */
  static async getPaymentsFromSupabase(
    status?: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<DbAsaasPayment[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error('Usuário não autenticado')
      }

      let query = supabase
        .from('asaas_payments')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (status) {
        query = query.eq('status', status)
      }

      const { data, error } = await query

      if (error) {
        console.error('Erro ao buscar pagamentos no Supabase:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Erro no getPaymentsFromSupabase:', error)
      return []
    }
  }

  /**
   * Buscar pagamento por external_reference
   */
  static async findPaymentByExternalReference(externalReference: string): Promise<DbAsaasPayment | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        return null
      }

      const { data, error } = await supabase
        .from('asaas_payments')
        .select('*')
        .eq('user_id', user.id)
        .eq('external_reference', externalReference)
        .single()

      if (error || !data) {
        return null
      }

      return data
    } catch (error) {
      console.error('Erro ao buscar por external_reference:', error)
      return null
    }
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Verificar se pagamento está vencido
   */
  static isPaymentOverdue(payment: AsaasPaymentResponse | DbAsaasPayment): boolean {
    const dueDate = new Date('dueDate' in payment ? payment.dueDate : payment.due_date || '')
    const now = new Date()
    return dueDate < now && !['RECEIVED', 'CONFIRMED'].includes(
      'status' in payment ? payment.status : payment.status
    )
  }

  /**
   * Calcular dias até vencimento
   */
  static getDaysUntilDue(payment: AsaasPaymentResponse | DbAsaasPayment): number {
    const dueDate = new Date('dueDate' in payment ? payment.dueDate : payment.due_date || '')
    const now = new Date()
    const diffTime = dueDate.getTime() - now.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  /**
   * Formatar valor monetário
   */
  static formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  /**
   * Gerar external_reference único
   */
  static generateExternalReference(prefix: string = 'payment'): string {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8)
    return `${prefix}_${timestamp}_${random}`
  }
}
