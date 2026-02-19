// ============================================
// PAYMENT API CLIENT  
// Interface simplificada para operações de pagamentos
// ============================================

import { AsaasPaymentService } from '@/services/AsaasPaymentService'
import type { 
  CreatePaymentRequest,
  PaymentServiceResponse,
  DbAsaasPayment,
  AsaasPaymentMethod,
  AsaasPaymentResponse
} from '@/types/asaas'

// ============================================
// PAYMENT CREATION
// ============================================

/**
 * Criar novo pagamento
 */
export const createPayment = async (paymentData: CreatePaymentRequest): Promise<PaymentServiceResponse> => {
  try {
    return await AsaasPaymentService.createPayment(paymentData)
  } catch (error) {
    console.error('Erro ao criar pagamento:', error)
    return { success: false, error: 'Erro interno' }
  }
}

/**
 * Criar pagamento PIX (vencimento em 1 dia)
 */
export const createPixPayment = async (
  customerId: string,
  value: number,
  description?: string
): Promise<PaymentServiceResponse> => {
  try {
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 1)
    
    return await createPayment({
      customerId,
      billingType: 'PIX',
      value,
      dueDate: dueDate.toISOString().split('T')[0],
      description,
      externalReference: AsaasPaymentService.generateExternalReference('pix')
    })
  } catch (error) {
    console.error('Erro ao criar PIX:', error)
    return { success: false, error: 'Erro ao criar pagamento PIX' }
  }
}

/**
 * Criar pagamento por cartão (vencimento em 30 dias)
 */
export const createCreditCardPayment = async (
  customerId: string,
  value: number,
  description?: string,
  installments: number = 1
): Promise<PaymentServiceResponse> => {
  try {
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 30)
    
    return await createPayment({
      customerId,
      billingType: 'CREDIT_CARD',
      value,
      dueDate: dueDate.toISOString().split('T')[0],
      description,
      externalReference: AsaasPaymentService.generateExternalReference('card')
    })
  } catch (error) {
    console.error('Erro ao criar pagamento cartão:', error)
    return { success: false, error: 'Erro ao criar pagamento por cartão' }
  }
}

/**
 * Criar boleto
 */
export const createBoletoPayment = async (
  customerId: string,
  value: number,
  dueDate: string,
  description?: string
): Promise<PaymentServiceResponse> => {
  try {
    const externalReference = AsaasPaymentService.generateExternalReference('boleto')
    return await AsaasPaymentService.createBoletoPayment(
      customerId, 
      value, 
      dueDate, 
      description, 
      externalReference
    )
  } catch (error) {
    console.error('Erro ao criar boleto:', error)
    return { success: false, error: 'Erro ao criar boleto' }
  }
}

// ============================================
// PAYMENT QUERIES
// ============================================

/**
 * Buscar todos os pagamentos do usuário
 */
export const getMyPayments = async (
  status?: string,
  limit: number = 20,
  offset: number = 0
): Promise<DbAsaasPayment[]> => {
  try {
    return await AsaasPaymentService.getPaymentsFromSupabase(status, limit, offset)
  } catch (error) {
    console.error('Erro ao buscar pagamentos:', error)
    return []
  }
}

/**
 * Buscar pagamento por ID do Asaas
 */
export const getPayment = async (paymentId: string): Promise<PaymentServiceResponse> => {
  try {
    return await AsaasPaymentService.getPayment(paymentId)
  } catch (error) {
    console.error('Erro ao buscar pagamento:', error)
    return { success: false, error: 'Erro ao buscar pagamento' }
  }
}

/**
 * Buscar QR Code PIX diretamente no endpoint dedicado
 */
export const getPixQrCode = async (paymentId: string): Promise<PaymentServiceResponse> => {
  try {
    return await AsaasPaymentService.fetchPixQrCode(paymentId)
  } catch (error) {
    console.error('Erro ao buscar QR Code PIX:', error)
    return { success: false, error: 'Erro ao buscar QR Code PIX' }
  }
}

/**
 * Buscar pagamento por referência externa
 */
export const findPaymentByReference = async (externalReference: string): Promise<DbAsaasPayment | null> => {
  try {
    return await AsaasPaymentService.findPaymentByExternalReference(externalReference)
  } catch (error) {
    console.error('Erro ao buscar por referência:', error)
    return null
  }
}

/**
 * Listar pagamentos do Asaas (com sincronização)
 */
export const listAsaasPayments = async (
  customerId?: string,
  status?: string,
  limit: number = 20,
  offset: number = 0
): Promise<AsaasPaymentResponse[]> => {
  try {
    return await AsaasPaymentService.listPayments(customerId, status, limit, offset)
  } catch (error) {
    console.error('Erro ao listar pagamentos Asaas:', error)
    return []
  }
}

// ============================================
// PAYMENT OPERATIONS
// ============================================

/**
 * Cancelar pagamento
 */
export const cancelPayment = async (paymentId: string): Promise<PaymentServiceResponse> => {
  try {
    return await AsaasPaymentService.cancelPayment(paymentId)
  } catch (error) {
    console.error('Erro ao cancelar pagamento:', error)
    return { success: false, error: 'Erro ao cancelar pagamento' }
  }
}

/**
 * Sincronizar pagamento do Asaas
 */
export const syncPayment = async (asaasPaymentId: string): Promise<PaymentServiceResponse> => {
  try {
    return await AsaasPaymentService.syncPayment(asaasPaymentId)
  } catch (error) {
    console.error('Erro na sincronização:', error)
    return { success: false, error: 'Erro na sincronização' }
  }
}

// ============================================
// PAYMENT FILTERS
// ============================================

/**
 * Buscar pagamentos pendentes
 */
export const getPendingPayments = async (): Promise<DbAsaasPayment[]> => {
  return getMyPayments('PENDING')
}

/**
 * Buscar pagamentos confirmados
 */
export const getConfirmedPayments = async (): Promise<DbAsaasPayment[]> => {
  return getMyPayments('CONFIRMED')
}

/**
 * Buscar pagamentos recebidos
 */
export const getReceivedPayments = async (): Promise<DbAsaasPayment[]> => {
  return getMyPayments('RECEIVED')
}

/**
 * Buscar pagamentos vencidos
 */
export const getOverduePayments = async (): Promise<DbAsaasPayment[]> => {
  return getMyPayments('OVERDUE')
}

// ============================================
// PAYMENT UTILITIES
// ============================================

/**
 * Validar dados do pagamento
 */
export const validatePaymentData = (paymentData: CreatePaymentRequest): string[] => {
  const errors: string[] = []

  if (!paymentData.customerId?.trim()) {
    errors.push('Cliente é obrigatório')
  }

  if (!paymentData.value || paymentData.value <= 0) {
    errors.push('Valor deve ser maior que zero')
  }

  if (!paymentData.billingType) {
    errors.push('Método de pagamento é obrigatório')
  }

  if (!paymentData.dueDate) {
    errors.push('Data de vencimento é obrigatória')
  } else {
    const dueDate = new Date(paymentData.dueDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    if (dueDate < today) {
      errors.push('Data de vencimento deve ser hoje ou no futuro')
    }
  }

  return errors
}

/**
 * Formatar pagamento para exibição
 */
export const formatPaymentForDisplay = (payment: DbAsaasPayment) => {
  return {
    id: payment.asaas_payment_id,
    value: AsaasPaymentService.formatCurrency(payment.value),
    netValue: payment.net_value ? AsaasPaymentService.formatCurrency(payment.net_value) : null,
    description: payment.description || 'Sem descrição',
    status: getStatusLabel(payment.status),
    statusColor: getStatusColor(payment.status),
    method: getMethodLabel(payment.payment_method),
    methodIcon: getMethodIcon(payment.payment_method),
    dueDate: payment.due_date ? new Date(payment.due_date).toLocaleDateString('pt-BR') : 'Não definido',
    createdAt: new Date(payment.created_at).toLocaleDateString('pt-BR'),
    isOverdue: payment.due_date ? AsaasPaymentService.isPaymentOverdue(payment) : false,
    daysUntilDue: payment.due_date ? AsaasPaymentService.getDaysUntilDue(payment) : 0,
    pixQrCode: payment.pix_qr_code,
    pixCopyPaste: payment.pix_copy_paste,
    paymentLink: payment.payment_link,
    externalReference: payment.external_reference
  }
}

/**
 * Obter label do status
 */
export const getStatusLabel = (status: string): string => {
  const statusLabels: Record<string, string> = {
    'PENDING': 'Pendente',
    'CONFIRMED': 'Confirmado',
    'RECEIVED': 'Recebido',
    'OVERDUE': 'Vencido',
    'CANCELLED': 'Cancelado'
  }
  
  return statusLabels[status] || status
}

/**
 * Obter cor do status
 */
export const getStatusColor = (status: string): string => {
  const statusColors: Record<string, string> = {
    'PENDING': 'bg-yellow-500',
    'CONFIRMED': 'bg-green-500', 
    'RECEIVED': 'bg-green-600',
    'OVERDUE': 'bg-red-500',
    'CANCELLED': 'bg-gray-500'
  }
  
  return statusColors[status] || 'bg-gray-400'
}

/**
 * Obter label do método de pagamento
 */
export const getMethodLabel = (method: AsaasPaymentMethod): string => {
  const methodLabels: Record<AsaasPaymentMethod, string> = {
    'PIX': 'PIX',
    'CREDIT_CARD': 'Cartão de Crédito',
    'BOLETO': 'Boleto'
  }
  
  return methodLabels[method] || method
}

/**
 * Obter ícone do método de pagamento
 */
export const getMethodIcon = (method: AsaasPaymentMethod): string => {
  const methodIcons: Record<AsaasPaymentMethod, string> = {
    'PIX': '🔲', // ou use lucide icons
    'CREDIT_CARD': '💳',
    'BOLETO': '📄'
  }
  
  return methodIcons[method] || '💰'
}

/**
 * Gerar resumo de pagamentos
 */
export const generatePaymentSummary = (payments: DbAsaasPayment[]) => {
  const summary = {
    total: payments.length,
    pending: payments.filter(p => p.status === 'PENDING').length,
    confirmed: payments.filter(p => p.status === 'CONFIRMED').length,
    received: payments.filter(p => p.status === 'RECEIVED').length,
    overdue: payments.filter(p => p.status === 'OVERDUE').length,
    cancelled: payments.filter(p => p.status === 'CANCELLED').length,
    totalValue: payments.reduce((sum, p) => sum + p.value, 0),
    receivedValue: payments
      .filter(p => ['CONFIRMED', 'RECEIVED'].includes(p.status))
      .reduce((sum, p) => sum + p.value, 0)
  }

  return {
    ...summary,
    totalValueFormatted: AsaasPaymentService.formatCurrency(summary.totalValue),
    receivedValueFormatted: AsaasPaymentService.formatCurrency(summary.receivedValue)
  }
}

// ============================================
// EXPORT DEFAULT
// ============================================

export const paymentApi = {
  // Creation
  create: createPayment,
  createPix: createPixPayment,
  createCard: createCreditCardPayment,
  createBoleto: createBoletoPayment,
  
  // Queries  
  getAll: getMyPayments,
  getById: getPayment,
  getPixQrCode: getPixQrCode,
  findByReference: findPaymentByReference,
  listAsaas: listAsaasPayments,
  
  // Filters
  getPending: getPendingPayments,
  getConfirmed: getConfirmedPayments,
  getReceived: getReceivedPayments,
  getOverdue: getOverduePayments,
  
  // Operations
  cancel: cancelPayment,
  sync: syncPayment,
  
  // Utilities
  validate: validatePaymentData,
  format: formatPaymentForDisplay,
  getStatusLabel,
  getStatusColor,
  getMethodLabel,
  getMethodIcon,
  generateSummary: generatePaymentSummary
}
