// ============================================
// useAsaasPayment Hook
// Hook customizado para gerenciar pagamentos Asaas
// ============================================

import { useState, useCallback, useEffect } from 'react'
import { paymentApi } from '@/api/paymentApi'
import { customerApi } from '@/api/customerApi'
import type { 
  PaymentServiceResponse, 
  CreatePaymentRequest,
  AsaasPaymentMethod,
  DbAsaasPayment
} from '@/types/asaas'

// Interface para dados do PIX persistidos
interface PixPersistedData {
  paymentId: string
  pixQrCode: string
  pixCopyPaste: string
  paymentLink?: string
  timestamp: number
  expiresAt: number
  itemId?: string
  value: number
  description?: string
}

// Chave para localStorage
const PIX_STORAGE_KEY = 'pix_payment_data'

// Funções utilitárias para persistência
const savePixData = (data: PixPersistedData) => {
  try {
    localStorage.setItem(PIX_STORAGE_KEY, JSON.stringify(data))
  } catch (error) {
    console.warn('Erro ao salvar dados do PIX:', error)
  }
}

const getPixData = (): PixPersistedData | null => {
  try {
    const data = localStorage.getItem(PIX_STORAGE_KEY)
    if (!data) return null
    
    const parsed = JSON.parse(data) as PixPersistedData
    
    // Verificar se ainda está válido (5 minutos = 300000ms)
    if (Date.now() > parsed.expiresAt) {
      localStorage.removeItem(PIX_STORAGE_KEY)
      return null
    }
    
    return parsed
  } catch (error) {
    console.warn('Erro ao recuperar dados do PIX:', error)
    localStorage.removeItem(PIX_STORAGE_KEY)
    return null
  }
}

const clearPixData = () => {
  try {
    localStorage.removeItem(PIX_STORAGE_KEY)
  } catch (error) {
    console.warn('Erro ao limpar dados do PIX:', error)
  }
}

interface UseAsaasPaymentState {
  loading: boolean
  error: string | null
  success: boolean
  paymentData: PaymentServiceResponse['data'] | null
  pixQrCode: string | null
  pixCopyPaste: string | null
  paymentLink: string | null
}

interface CreditCardData {
  holderName: string
  number: string
  expiryMonth: string
  expiryYear: string
  ccv: string
}

interface UseAsaasPaymentActions {
  createPayment: (data: CreatePaymentRequest) => Promise<PaymentServiceResponse>
  createPixPayment: (customerId: string, value: number, description?: string, itemId?: string, platform?: string, addressData?: { phone?: string; addressLine1?: string; addressLine2?: string; city?: string; state?: string; postalCode?: string }) => Promise<PaymentServiceResponse>
  createCardPayment: (customerId: string, value: number, description?: string) => Promise<PaymentServiceResponse>
  createCreditCardPayment: (customerId: string, value: number, description: string, cardData: CreditCardData, customerData?: { 
      name: string; 
      cpf: string; 
      phone?: string;
      addressLine1?: string;
      addressLine2?: string;
      city?: string;
      state?: string;
      postalCode?: string;
    },
    itemId?: string,
    platform?: string,
    installments?: number
  ) => Promise<PaymentServiceResponse>
  createBoletoPayment: (customerId: string, value: number, dueDate: string, description?: string) => Promise<PaymentServiceResponse>
  getPayment: (paymentId: string) => Promise<PaymentServiceResponse>
  cancelPayment: (paymentId: string) => Promise<PaymentServiceResponse>
  loadPersistedPix: (itemId?: string) => boolean
  clearPersistedPix: () => void
  clearState: () => void
  clearError: () => void
}

type UseAsaasPaymentReturn = UseAsaasPaymentState & UseAsaasPaymentActions

export const useAsaasPayment = (): UseAsaasPaymentReturn => {
  const [state, setState] = useState<UseAsaasPaymentState>({
    loading: false,
    error: null,
    success: false,
    paymentData: null,
    pixQrCode: null,
    pixCopyPaste: null,
    paymentLink: null
  })

  // Carregar dados persistidos na inicialização
  useEffect(() => {
    const persistedData = getPixData()
    if (persistedData) {
      console.log('Dados do PIX recuperados do localStorage:', {
        paymentId: persistedData.paymentId,
        itemId: persistedData.itemId,
        timeRemaining: Math.max(0, Math.floor((persistedData.expiresAt - Date.now()) / 1000))
      })
      
      setState(prev => ({
        ...prev,
        pixQrCode: persistedData.pixQrCode,
        pixCopyPaste: persistedData.pixCopyPaste,
        paymentLink: persistedData.paymentLink || null,
        success: true
      }))
    }
  }, [])

  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({ ...prev, loading }))
  }, [])

  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error, loading: false, success: false }))
  }, [])

  const setSuccess = useCallback((
    paymentData: PaymentServiceResponse['data'],
    pixQrCode?: string,
    pixCopyPaste?: string,
    paymentLink?: string,
    itemId?: string,
    value?: number,
    description?: string
  ) => {
    setState(prev => ({
      ...prev,
      success: true,
      loading: false,
      error: null,
      paymentData,
      pixQrCode: pixQrCode || null,
      pixCopyPaste: pixCopyPaste || null,
      paymentLink: paymentLink || null
    }))

    // Salvar dados do PIX se fornecidos
    if (pixQrCode && pixCopyPaste && paymentData?.paymentId) {
      const now = Date.now()
      const pixData: PixPersistedData = {
        paymentId: paymentData.paymentId,
        pixQrCode,
        pixCopyPaste,
        paymentLink,
        timestamp: now,
        expiresAt: now + 300000, // 5 minutos
        itemId,
        value: value || 0,
        description
      }
      
      savePixData(pixData)
      console.log('Dados do PIX salvos no localStorage:', {
        paymentId: pixData.paymentId,
        itemId: pixData.itemId,
        expiresIn: '5 minutos'
      })
    }
  }, [])

  const createPayment = useCallback(async (data: CreatePaymentRequest): Promise<PaymentServiceResponse> => {
    setLoading(true)
    setError(null)

    try {
      // Validar dados antes de enviar
      const validationErrors = paymentApi.validate(data)
      if (validationErrors.length > 0) {
        setError(validationErrors.join(', '))
        return { success: false, error: validationErrors.join(', ') }
      }

      const result = await paymentApi.create(data)
      
      if (result.success) {
        setSuccess(result.data, result.pixQrCode, result.pixCopyPaste, result.paymentLink, itemId, value, description)
      } else {
        setError(result.error || 'Erro ao criar pagamento')
      }

      return result
    } catch (error) {
      const errorMessage = 'Erro interno ao criar pagamento'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    }
  }, [setLoading, setError, setSuccess])

const createPixPayment = useCallback(async (
    customerId: string, 
    value: number, 
    description?: string,
    itemId?: string,
    platform?: string,
    addressData?: { phone?: string; addressLine1?: string; addressLine2?: string; city?: string; state?: string; postalCode?: string }
  ): Promise<PaymentServiceResponse> => {
    setLoading(true)
    setError(null)

    try {
      // Construir dueDate e externalReference incluindo o itemId (para registrar em orders)
      const due = new Date()
      due.setDate(due.getDate() + 1)
      const extRef = itemId 
        ? `item_${itemId}_pix_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        : `pix_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      const result = await paymentApi.create({
        customerId,
        billingType: 'PIX',
        value,
        dueDate: due.toISOString().split('T')[0],
        description,
        externalReference: extRef,
        itemId,
        platform,
        // Dados de endereço para atualizar tabela users
        customerPhone: addressData?.phone,
        addressLine1: addressData?.addressLine1,
        addressLine2: addressData?.addressLine2,
        city: addressData?.city,
        state: addressData?.state,
        postalCode: addressData?.postalCode
      })
      
      if (result.success) {
        setSuccess(result.data, result.pixQrCode, result.pixCopyPaste, result.paymentLink)
      } else {
        // Trata erro de valor mínimo de forma amigável
        const errorMessage = result.error?.includes('MINIMUM_VALUE_ERROR') 
          ? 'Valor mínimo para pagamentos é R$ 5,00. Considere aumentar a quantidade ou escolher outro item.'
          : result.error || 'Erro ao criar pagamento PIX'
        setError(errorMessage)
      }

      return result
    } catch (error) {
      const errorMessage = 'Erro interno ao criar PIX'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    }
  }, [setLoading, setError, setSuccess])

  const createCardPayment = useCallback(async (
    customerId: string, 
    value: number, 
    description?: string
  ): Promise<PaymentServiceResponse> => {
    setLoading(true)
    setError(null)

    try {
      const result = await paymentApi.createCard(customerId, value, description)
      
      if (result.success) {
        setSuccess(result.data, result.pixQrCode, result.pixCopyPaste, result.paymentLink)
      } else {
        setError(result.error || 'Erro ao criar pagamento por cartão')
      }

      return result
    } catch (error) {
      const errorMessage = 'Erro interno ao criar pagamento por cartão'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    }
  }, [setLoading, setError, setSuccess])

const createCreditCardPayment = useCallback(async (
    customerId: string, 
    value: number, 
    description: string,
    cardData: CreditCardData,
    customerData?: { 
      name: string; 
      cpf: string; 
      phone?: string;
      addressLine1?: string;
      addressLine2?: string;
      city?: string;
      state?: string;
      postalCode?: string;
    },
    itemId?: string,
    platform?: string,
    installments: number = 1
  ): Promise<PaymentServiceResponse> => {
    setLoading(true)
    setError(null)

    try {
      // Create payment via edge function directly with proper dueDate
      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() + 30) // 30 days for credit card
      
      const externalReference = itemId
        ? `item_${itemId}_card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        : `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      const result = await paymentApi.create({
        customerId,
        value,
        billingType: 'CREDIT_CARD' as AsaasPaymentMethod,
        dueDate: dueDate.toISOString().split('T')[0], // Add required dueDate
        description,
        creditCard: cardData,
        customerName: customerData?.name,
        customerCpf: customerData?.cpf,
        customerPhone: customerData?.phone,
        // Dados de endereço
        postalCode: customerData?.postalCode,
        addressNumber: '123', // Número padrão
        addressComplement: customerData?.addressLine2,
        externalReference,
        itemId,
        platform,
        installmentCount: installments // Adicionar parcelas
      })
      
      if (result.success) {
        setSuccess(result.data, result.pixQrCode, result.pixCopyPaste, result.paymentLink)
      } else {
        setError(result.error || 'Erro ao criar pagamento por cartão')
      }

      return result
    } catch (error) {
      const errorMessage = 'Erro interno ao criar pagamento por cartão'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    }
  }, [setLoading, setError, setSuccess])

  const createBoletoPayment = useCallback(async (
    customerId: string, 
    value: number, 
    dueDate: string, 
    description?: string
  ): Promise<PaymentServiceResponse> => {
    setLoading(true)
    setError(null)

    try {
      const result = await paymentApi.createBoleto(customerId, value, dueDate, description)
      
      if (result.success) {
        setSuccess(result.data, result.pixQrCode, result.pixCopyPaste, result.paymentLink)
      } else {
        setError(result.error || 'Erro ao criar boleto')
      }

      return result
    } catch (error) {
      const errorMessage = 'Erro interno ao criar boleto'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    }
  }, [setLoading, setError, setSuccess])

  const getPayment = useCallback(async (paymentId: string): Promise<PaymentServiceResponse> => {
    setLoading(true)
    setError(null)

    try {
      // 1) Buscar dados gerais do pagamento
      let result = await paymentApi.getById(paymentId)
      
      if (result.success) {
        setSuccess(result.data, result.pixQrCode, result.pixCopyPaste, result.paymentLink)

        // 2) Se for PIX e ainda não temos QR Code, buscar no endpoint dedicado
        const needsPix = !result.pixQrCode || !result.pixCopyPaste
        if (needsPix) {
          const pix = await paymentApi.getPixQrCode(paymentId)
          if (pix.success && (pix.pixQrCode || pix.pixCopyPaste)) {
            // Atualiza estado com os dados do QR Code
            setSuccess(result.data, pix.pixQrCode || result.pixQrCode || undefined, pix.pixCopyPaste || result.pixCopyPaste || undefined, result.paymentLink)
            // Retorna o resultado mesclado
            result = {
              ...result,
              pixQrCode: pix.pixQrCode || result.pixQrCode,
              pixCopyPaste: pix.pixCopyPaste || result.pixCopyPaste
            }
          }
        }
      } else {
        setError(result.error || 'Pagamento não encontrado')
      }

      return result
    } catch (error) {
      const errorMessage = 'Erro ao buscar pagamento'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    }
  }, [setLoading, setError, setSuccess])

  const cancelPayment = useCallback(async (paymentId: string): Promise<PaymentServiceResponse> => {
    setLoading(true)
    setError(null)

    try {
      const result = await paymentApi.cancel(paymentId)
      
      if (result.success) {
        setSuccess(result.data)
      } else {
        setError(result.error || 'Erro ao cancelar pagamento')
      }

      return result
    } catch (error) {
      const errorMessage = 'Erro interno ao cancelar pagamento'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    }
  }, [setLoading, setError, setSuccess])

  const clearState = useCallback(() => {
    setState({
      loading: false,
      error: null,
      success: false,
      paymentData: null,
      pixQrCode: null,
      pixCopyPaste: null,
      paymentLink: null
    })
  }, [])

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  const loadPersistedPix = useCallback((itemId?: string): boolean => {
    const persistedData = getPixData()
    
    if (!persistedData) {
      return false
    }
    
    // Se itemId foi fornecido, verificar se é o mesmo item
    if (itemId && persistedData.itemId && persistedData.itemId !== itemId) {
      console.log('Item diferente do PIX persistido, limpando dados antigos')
      clearPixData()
      return false
    }
    
    // Carregar dados persistidos no estado
    setState(prev => ({
      ...prev,
      pixQrCode: persistedData.pixQrCode,
      pixCopyPaste: persistedData.pixCopyPaste,
      paymentLink: persistedData.paymentLink || null,
      success: true,
      // Simular paymentData básico para compatibilidade
      paymentData: {
        paymentId: persistedData.paymentId,
        status: 'PENDING',
        value: persistedData.value,
        description: persistedData.description
      } as PaymentServiceResponse['data']
    }))
    
    const timeRemaining = Math.max(0, Math.floor((persistedData.expiresAt - Date.now()) / 1000))
    console.log('PIX persistido carregado:', {
      paymentId: persistedData.paymentId,
      itemId: persistedData.itemId,
      timeRemaining: `${Math.floor(timeRemaining / 60)}:${String(timeRemaining % 60).padStart(2, '0')}`
    })
    
    return true
  }, [])

  const clearPersistedPix = useCallback(() => {
    clearPixData()
    console.log('Dados do PIX removidos do localStorage')
  }, [])

  return {
    ...state,
    createPayment,
    createPixPayment,
    createCardPayment,
    createCreditCardPayment,
    createBoletoPayment,
    getPayment,
    cancelPayment,
    loadPersistedPix,
    clearPersistedPix,
    clearState,
    clearError
  }
}
