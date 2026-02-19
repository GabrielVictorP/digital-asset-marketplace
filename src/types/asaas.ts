// ============================================
// ASAAS API - Interfaces TypeScript
// Tipagem completa para integração com API Asaas v3
// ============================================

// Base Types
export type AsaasPaymentMethod = 'PIX' | 'CREDIT_CARD' | 'BOLETO'
export type AsaasPaymentStatus = 'PENDING' | 'CONFIRMED' | 'RECEIVED' | 'OVERDUE' | 'CANCELLED'

export type AsaasRawStatus = 
  | 'PENDING' 
  | 'AWAITING_PAYMENT' 
  | 'RECEIVED' 
  | 'CONFIRMED' 
  | 'OVERDUE' 
  | 'DELETED' 
  | 'CANCELLED'
  | 'REFUNDED'
  | 'CHARGEBACK_REQUESTED'
  | 'CHARGEBACK_DISPUTE'
  | 'AWAITING_CHARGEBACK_REVERSAL'

// ============================================
// CUSTOMER INTERFACES
// ============================================
export interface IAsaasCustomer {
  id?: string
  name: string
  email: string
  cpfCnpj: string
  phone?: string
  mobilePhone?: string
  address?: string
  addressNumber?: string
  complement?: string
  province?: string
  city?: string
  state?: string
  postalCode?: string
  externalReference?: string
  notificationDisabled?: boolean
  additionalEmails?: string
  municipalInscription?: string
  stateInscription?: string
  observations?: string
}

export interface AsaasCustomerResponse extends IAsaasCustomer {
  id: string
  dateCreated: string
  personType: 'FISICA' | 'JURIDICA'
  deleted: boolean
  canDelete: boolean
  cannotBeDeletedReason?: string
  canEdit: boolean
  cannotEditReason?: string
}

// ============================================
// PAYMENT INTERFACES  
// ============================================
export interface IAsaasPayment {
  customer: string // Customer ID
  billingType: AsaasPaymentMethod
  value: number
  dueDate: string // YYYY-MM-DD
  description?: string
  externalReference?: string
  installmentCount?: number
  installmentValue?: number
  discount?: {
    value: number
    dueDateLimitDays?: number
    type?: 'FIXED' | 'PERCENTAGE'
  }
  interest?: {
    value: number
  }
  fine?: {
    value: number
  }
  postalService?: boolean
  split?: Array<{
    walletId: string
    fixedValue?: number
    percentualValue?: number
  }>
}

export interface AsaasPaymentResponse {
  id: string
  customer: string
  billingType: AsaasPaymentMethod
  value: number
  netValue: number
  originalValue?: number
  interestValue?: number
  description?: string
  status: AsaasRawStatus
  dueDate: string
  originalDueDate: string
  paymentDate?: string
  clientPaymentDate?: string
  installmentNumber?: number
  invoiceUrl: string
  invoiceNumber?: string
  externalReference?: string
  deleted: boolean
  anticipated: boolean
  anticipable: boolean
  dateCreated: string
  lastUpdated: string
  
  // PIX specific
  pixTransaction?: {
    uuid: string
    qrCode: string
    copyAndPaste: string
    expirationDate?: string
  }
  
  // Credit Card specific
  creditCard?: {
    creditCardNumber: string
    creditCardBrand: string
    creditCardToken: string
  }
  
  // Boleto specific
  bankSlipUrl?: string
  
  // Discount/Interest/Fine
  discount?: {
    value: number
    limitDate?: string
    dueDateLimitDays: number
    type: 'FIXED' | 'PERCENTAGE'
  }
  interest?: {
    value: number
  }
  fine?: {
    value: number
  }
}

// ============================================
// WEBHOOK INTERFACES
// ============================================
export interface AsaasWebhookPayload {
  event: string
  payment?: AsaasPaymentResponse
  invoice?: any
  transfer?: any
  [key: string]: any
}

export interface AsaasWebhookEvent {
  id: string
  event: string
  dateCreated: string
  payment?: AsaasPaymentResponse
}

// ============================================
// API RESPONSE INTERFACES
// ============================================
export interface AsaasApiResponse<T> {
  object: string
  hasMore: boolean
  totalCount?: number
  limit?: number
  offset?: number
  data: T[]
}

export interface AsaasApiError {
  errors: Array<{
    code: string
    description: string
  }>
}

// ============================================
// SUPABASE DATABASE INTERFACES
// ============================================
export interface DbAsaasCustomer {
  id: string
  asaas_customer_id: string
  user_id: string
  name: string
  email: string
  cpf_cnpj: string
  phone?: string
  address_data: Record<string, any>
  created_at: string
  updated_at: string
}

export interface DbAsaasPayment {
  id: string
  asaas_payment_id: string
  customer_id?: string
  user_id: string
  value: number
  net_value?: number
  description?: string
  payment_method: AsaasPaymentMethod
  status: AsaasPaymentStatus
  due_date?: string
  pix_qr_code?: string
  pix_copy_paste?: string
  payment_link?: string
  external_reference?: string
  created_at: string
  updated_at: string
}

export interface DbWebhookLog {
  id: string
  event_type: string
  payment_id?: string
  asaas_payment_id?: string
  payload: Record<string, any>
  payload_hash?: string
  processed: boolean
  processed_at?: string
  error_message?: string
  created_at: string
  updated_at: string
}

// ============================================
// SERVICE REQUEST/RESPONSE TYPES
// ============================================
export interface CreateCustomerRequest {
  name: string
  email: string
  cpfCnpj: string
  phone?: string
  address?: {
    address?: string
    addressNumber?: string
    complement?: string
    province?: string
    city?: string
    state?: string
    postalCode?: string
  }
  externalReference?: string
}

export interface CreatePaymentRequest {
  customerId: string
  billingType: AsaasPaymentMethod
  value: number
  dueDate?: string
  description?: string
  externalReference?: string
  itemId?: string
  installmentCount?: number // Número de parcelas
  // Credit Card specific fields
  creditCard?: {
    holderName: string
    number: string
    expiryMonth: string
    expiryYear: string
    ccv: string
  }
  // Customer data for credit card payments
  customerName?: string
  customerCpf?: string
  customerPhone?: string
  // Address data
  postalCode?: string
  addressNumber?: string
  addressComplement?: string
  platform?: string
}

export interface PaymentServiceResponse {
  success: boolean
  data?: AsaasPaymentResponse
  error?: string
  pixQrCode?: string
  pixCopyPaste?: string
  paymentLink?: string
}

export interface CustomerServiceResponse {
  success: boolean
  data?: AsaasCustomerResponse
  error?: string
}

// ============================================
// UTILITY TYPES
// ============================================
export type AsaasEnvironment = 'sandbox' | 'production'

export interface AsaasConfig {
  apiKey: string
  environment: AsaasEnvironment
  baseUrl?: string
}

// Status mapping utilities
export const ASAAS_STATUS_MAP: Record<AsaasRawStatus, AsaasPaymentStatus> = {
  'PENDING': 'PENDING',
  'AWAITING_PAYMENT': 'PENDING',
  'RECEIVED': 'RECEIVED', 
  'CONFIRMED': 'CONFIRMED',
  'OVERDUE': 'OVERDUE',
  'DELETED': 'CANCELLED',
  'CANCELLED': 'CANCELLED',
  'REFUNDED': 'CANCELLED',
  'CHARGEBACK_REQUESTED': 'CANCELLED',
  'CHARGEBACK_DISPUTE': 'CANCELLED',
  'AWAITING_CHARGEBACK_REVERSAL': 'CANCELLED'
}

export const BILLING_TYPE_MAP: Record<string, AsaasPaymentMethod> = {
  'PIX': 'PIX',
  'CREDIT_CARD': 'CREDIT_CARD',
  'BOLETO': 'BOLETO'
}
