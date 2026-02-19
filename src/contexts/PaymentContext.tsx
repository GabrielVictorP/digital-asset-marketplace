// ============================================
// PaymentContext
// Context React para estado global de pagamentos
// ============================================

import React, { createContext, useContext, useReducer, useCallback, ReactNode } from 'react'
import type { 
  AsaasPaymentMethod, 
  AsaasPaymentStatus, 
  DbAsaasCustomer,
  PaymentServiceResponse 
} from '@/types/asaas'

// ============================================
// TYPES
// ============================================

interface PaymentState {
  // Current payment flow
  currentStep: 'customer' | 'method' | 'details' | 'processing' | 'complete' | 'error'
  
  // Customer data
  customer: DbAsaasCustomer | null
  isNewCustomer: boolean
  
  // Payment details
  paymentMethod: AsaasPaymentMethod | null
  amount: number
  description: string
  
  // Payment response
  paymentId: string | null
  paymentStatus: AsaasPaymentStatus | null
  pixQrCode: string | null
  pixCopyPaste: string | null
  paymentLink: string | null
  
  // UI state
  loading: boolean
  error: string | null
  success: boolean
}

type PaymentAction = 
  | { type: 'SET_STEP'; payload: PaymentState['currentStep'] }
  | { type: 'SET_CUSTOMER'; payload: { customer: DbAsaasCustomer; isNew: boolean } }
  | { type: 'SET_PAYMENT_METHOD'; payload: AsaasPaymentMethod }
  | { type: 'SET_AMOUNT'; payload: number }
  | { type: 'SET_DESCRIPTION'; payload: string }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_PAYMENT_SUCCESS'; payload: {
      paymentId: string
      status: AsaasPaymentStatus
      pixQrCode?: string
      pixCopyPaste?: string
      paymentLink?: string
    }}
  | { type: 'UPDATE_PAYMENT_STATUS'; payload: AsaasPaymentStatus }
  | { type: 'RESET_PAYMENT' }
  | { type: 'CLEAR_ERROR' }

interface PaymentContextValue {
  state: PaymentState
  actions: {
    setStep: (step: PaymentState['currentStep']) => void
    setCustomer: (customer: DbAsaasCustomer, isNew?: boolean) => void
    setPaymentMethod: (method: AsaasPaymentMethod) => void
    setAmount: (amount: number) => void
    setDescription: (description: string) => void
    setLoading: (loading: boolean) => void
    setError: (error: string | null) => void
    setPaymentSuccess: (data: PaymentServiceResponse) => void
    updatePaymentStatus: (status: AsaasPaymentStatus) => void
    resetPayment: () => void
    clearError: () => void
  }
}

// ============================================
// INITIAL STATE
// ============================================

const initialState: PaymentState = {
  currentStep: 'customer',
  customer: null,
  isNewCustomer: false,
  paymentMethod: null,
  amount: 0,
  description: '',
  paymentId: null,
  paymentStatus: null,
  pixQrCode: null,
  pixCopyPaste: null,
  paymentLink: null,
  loading: false,
  error: null,
  success: false
}

// ============================================
// REDUCER
// ============================================

function paymentReducer(state: PaymentState, action: PaymentAction): PaymentState {
  switch (action.type) {
    case 'SET_STEP':
      return {
        ...state,
        currentStep: action.payload,
        error: null
      }

    case 'SET_CUSTOMER':
      return {
        ...state,
        customer: action.payload.customer,
        isNewCustomer: action.payload.isNew,
        currentStep: 'method'
      }

    case 'SET_PAYMENT_METHOD':
      return {
        ...state,
        paymentMethod: action.payload,
        currentStep: 'details'
      }

    case 'SET_AMOUNT':
      return {
        ...state,
        amount: action.payload
      }

    case 'SET_DESCRIPTION':
      return {
        ...state,
        description: action.payload
      }

    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload,
        error: action.payload ? null : state.error
      }

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        loading: false,
        currentStep: action.payload ? 'error' : state.currentStep
      }

    case 'SET_PAYMENT_SUCCESS':
      return {
        ...state,
        paymentId: action.payload.paymentId,
        paymentStatus: action.payload.status,
        pixQrCode: action.payload.pixQrCode || null,
        pixCopyPaste: action.payload.pixCopyPaste || null,
        paymentLink: action.payload.paymentLink || null,
        loading: false,
        error: null,
        success: true,
        currentStep: 'complete'
      }

    case 'UPDATE_PAYMENT_STATUS':
      return {
        ...state,
        paymentStatus: action.payload
      }

    case 'RESET_PAYMENT':
      return {
        ...initialState
      }

    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
        currentStep: state.currentStep === 'error' ? 'customer' : state.currentStep
      }

    default:
      return state
  }
}

// ============================================
// CONTEXT
// ============================================

const PaymentContext = createContext<PaymentContextValue | null>(null)

// ============================================
// PROVIDER
// ============================================

interface PaymentProviderProps {
  children: ReactNode
}

export const PaymentProvider: React.FC<PaymentProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(paymentReducer, initialState)

  const actions = {
    setStep: useCallback((step: PaymentState['currentStep']) => {
      dispatch({ type: 'SET_STEP', payload: step })
    }, []),

    setCustomer: useCallback((customer: DbAsaasCustomer, isNew: boolean = false) => {
      dispatch({ type: 'SET_CUSTOMER', payload: { customer, isNew } })
    }, []),

    setPaymentMethod: useCallback((method: AsaasPaymentMethod) => {
      dispatch({ type: 'SET_PAYMENT_METHOD', payload: method })
    }, []),

    setAmount: useCallback((amount: number) => {
      dispatch({ type: 'SET_AMOUNT', payload: amount })
    }, []),

    setDescription: useCallback((description: string) => {
      dispatch({ type: 'SET_DESCRIPTION', payload: description })
    }, []),

    setLoading: useCallback((loading: boolean) => {
      dispatch({ type: 'SET_LOADING', payload: loading })
    }, []),

    setError: useCallback((error: string | null) => {
      dispatch({ type: 'SET_ERROR', payload: error })
    }, []),

    setPaymentSuccess: useCallback((data: PaymentServiceResponse) => {
      if (data.success && data.data) {
        dispatch({ 
          type: 'SET_PAYMENT_SUCCESS', 
          payload: {
            paymentId: data.data.id,
            status: mapAsaasStatusToLocal(data.data.status),
            pixQrCode: data.pixQrCode,
            pixCopyPaste: data.pixCopyPaste,
            paymentLink: data.paymentLink
          }
        })
      }
    }, []),

    updatePaymentStatus: useCallback((status: AsaasPaymentStatus) => {
      dispatch({ type: 'UPDATE_PAYMENT_STATUS', payload: status })
    }, []),

    resetPayment: useCallback(() => {
      dispatch({ type: 'RESET_PAYMENT' })
    }, []),

    clearError: useCallback(() => {
      dispatch({ type: 'CLEAR_ERROR' })
    }, [])
  }

  const contextValue: PaymentContextValue = {
    state,
    actions
  }

  return (
    <PaymentContext.Provider value={contextValue}>
      {children}
    </PaymentContext.Provider>
  )
}

// ============================================
// HOOK
// ============================================

export const usePaymentContext = (): PaymentContextValue => {
  const context = useContext(PaymentContext)
  
  if (!context) {
    throw new Error('usePaymentContext must be used within a PaymentProvider')
  }
  
  return context
}

// ============================================
// SELECTORS (hooks derivados)
// ============================================

export const usePaymentStep = () => {
  const { state } = usePaymentContext()
  return state.currentStep
}

export const usePaymentCustomer = () => {
  const { state, actions } = usePaymentContext()
  return {
    customer: state.customer,
    isNewCustomer: state.isNewCustomer,
    setCustomer: actions.setCustomer
  }
}

export const usePaymentMethod = () => {
  const { state, actions } = usePaymentContext()
  return {
    method: state.paymentMethod,
    setMethod: actions.setPaymentMethod
  }
}

export const usePaymentDetails = () => {
  const { state, actions } = usePaymentContext()
  return {
    amount: state.amount,
    description: state.description,
    setAmount: actions.setAmount,
    setDescription: actions.setDescription
  }
}

export const usePaymentStatus = () => {
  const { state, actions } = usePaymentContext()
  return {
    paymentId: state.paymentId,
    status: state.paymentStatus,
    pixQrCode: state.pixQrCode,
    pixCopyPaste: state.pixCopyPaste,
    paymentLink: state.paymentLink,
    updateStatus: actions.updatePaymentStatus
  }
}

export const usePaymentUI = () => {
  const { state, actions } = usePaymentContext()
  return {
    loading: state.loading,
    error: state.error,
    success: state.success,
    setLoading: actions.setLoading,
    setError: actions.setError,
    clearError: actions.clearError
  }
}

// ============================================
// UTILITIES
// ============================================

function mapAsaasStatusToLocal(asaasStatus: string): AsaasPaymentStatus {
  const statusMap: Record<string, AsaasPaymentStatus> = {
    'PENDING': 'PENDING',
    'AWAITING_PAYMENT': 'PENDING',
    'RECEIVED': 'RECEIVED',
    'CONFIRMED': 'CONFIRMED',
    'OVERDUE': 'OVERDUE',
    'DELETED': 'CANCELLED',
    'CANCELLED': 'CANCELLED'
  }
  
  return statusMap[asaasStatus] || 'PENDING'
}

// ============================================
// STEP VALIDATION
// ============================================

export const usePaymentValidation = () => {
  const { state } = usePaymentContext()
  
  const canProceedToMethod = useCallback(() => {
    return !!state.customer
  }, [state.customer])
  
  const canProceedToDetails = useCallback(() => {
    return !!(state.customer && state.paymentMethod)
  }, [state.customer, state.paymentMethod])
  
  const canCreatePayment = useCallback(() => {
    return !!(
      state.customer && 
      state.paymentMethod && 
      state.amount > 0
    )
  }, [state.customer, state.paymentMethod, state.amount])
  
  return {
    canProceedToMethod,
    canProceedToDetails,
    canCreatePayment
  }
}
