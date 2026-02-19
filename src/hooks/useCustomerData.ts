// ============================================
// useCustomerData Hook
// Hook para gerenciar dados de clientes
// ============================================

import { useState, useCallback, useEffect } from 'react'
import { customerApi } from '@/api/customerApi'
import type { 
  CreateCustomerRequest, 
  CustomerServiceResponse,
  DbAsaasCustomer 
} from '@/types/asaas'

interface UseCustomerDataState {
  customers: DbAsaasCustomer[]
  loading: boolean
  creating: boolean
  error: string | null
  selectedCustomer: DbAsaasCustomer | null
}

interface UseCustomerDataActions {
  createCustomer: (data: CreateCustomerRequest) => Promise<CustomerServiceResponse>
  loadCustomers: () => Promise<void>
  findByCpfCnpj: (cpfCnpj: string) => Promise<DbAsaasCustomer | null>
  selectCustomer: (customer: DbAsaasCustomer) => void
  clearSelection: () => void
  clearError: () => void
  refreshCustomer: (customerId: string) => Promise<void>
}

type UseCustomerDataReturn = UseCustomerDataState & UseCustomerDataActions

export const useCustomerData = (): UseCustomerDataReturn => {
  const [state, setState] = useState<UseCustomerDataState>({
    customers: [],
    loading: false,
    creating: false,
    error: null,
    selectedCustomer: null
  })
  
  // Versão temporariamente simplificada para evitar erros

  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({ ...prev, loading }))
  }, [])

  const setCreating = useCallback((creating: boolean) => {
    setState(prev => ({ ...prev, creating }))
  }, [])

  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error }))
  }, [])

  const setCustomers = useCallback((customers: DbAsaasCustomer[]) => {
    setState(prev => ({ ...prev, customers }))
  }, [])

  const loadCustomers = useCallback(async (): Promise<void> => {
    setLoading(true)
    setError(null)

    try {
      const customers = await customerApi.getAll()
      setCustomers(customers)
    } catch (error) {
      console.error('Erro ao carregar clientes:', error)
      setError('Erro ao carregar clientes')
      setCustomers([])
    } finally {
      setLoading(false)
    }
  }, [setLoading, setError, setCustomers])

  const createCustomer = useCallback(async (data: CreateCustomerRequest): Promise<CustomerServiceResponse> => {
    setCreating(true)
    setError(null)

    try {
      // Validar dados antes de enviar
      const validationErrors = customerApi.validate(data)
      if (validationErrors.length > 0) {
        setError(validationErrors.join(', '))
        setCreating(false)
        return { success: false, error: validationErrors.join(', ') }
      }

      const result = await customerApi.create(data)
      
      if (result.success) {
        // Atualizar lista diretamente em caso de sucesso
        try {
          const customers = await customerApi.getAll()
          setCustomers(customers)
        } catch (loadError) {
          console.error('Erro ao recarregar clientes:', loadError)
        }
      } else {
        setError(result.error || 'Erro ao criar cliente')
      }

      setCreating(false)
      return result
    } catch (error) {
      const errorMessage = 'Erro interno ao criar cliente'
      console.error('Erro ao criar cliente:', error)
      setError(errorMessage)
      setCreating(false)
      return { success: false, error: errorMessage }
    }
  }, [setCreating, setError, setCustomers])

  const findByCpfCnpj = useCallback(async (cpfCnpj: string): Promise<DbAsaasCustomer | null> => {
    try {
      return await customerApi.findByCpfCnpj(cpfCnpj)
    } catch (error) {
      console.error('Erro ao buscar por CPF/CNPJ:', error)
      return null
    }
  }, [])

  const selectCustomer = useCallback((customer: DbAsaasCustomer) => {
    setState(prev => ({ ...prev, selectedCustomer: customer }))
  }, [])

  const clearSelection = useCallback(() => {
    setState(prev => ({ ...prev, selectedCustomer: null }))
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [setError])

  const refreshCustomer = useCallback(async (customerId: string): Promise<void> => {
    try {
      const result = await customerApi.sync(customerId)
      if (result.success) {
        // Recarregar diretamente
        try {
          const customers = await customerApi.getAll()
          setCustomers(customers)
        } catch (loadError) {
          console.error('Erro ao recarregar após sync:', loadError)
        }
      }
    } catch (error) {
      console.error('Erro ao atualizar cliente:', error)
    }
  }, [setCustomers])

  // Carregar clientes na inicialização - temporariamente desabilitado
  // useEffect(() => {
  //   loadCustomers()
  // }, [loadCustomers])

  return {
    ...state,
    createCustomer,
    loadCustomers,
    findByCpfCnpj,
    selectCustomer,
    clearSelection,
    clearError,
    refreshCustomer
  }
}

// Hook específico para criação rápida de cliente
export const useQuickCustomer = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createQuickCustomer = useCallback(async (
    name: string,
    email: string,
    cpfCnpj: string,
    phone?: string
  ): Promise<CustomerServiceResponse> => {
    setLoading(true)
    setError(null)

    try {
      const result = await customerApi.createSimple(name, email, cpfCnpj, phone)
      
      if (!result.success) {
        setError(result.error || 'Erro ao criar cliente')
      }

      return result
    } catch (error) {
      const errorMessage = 'Erro interno'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    loading,
    error,
    createQuickCustomer,
    clearError
  }
}

// Hook para validação em tempo real
export const useCustomerValidation = () => {
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  const validateField = useCallback((field: keyof CreateCustomerRequest, value: string) => {
    const newErrors = { ...errors }
    
    switch (field) {
      case 'name':
        if (!value.trim()) {
          newErrors.name = 'Nome é obrigatório'
        } else if (value.length < 2) {
          newErrors.name = 'Nome deve ter pelo menos 2 caracteres'
        } else {
          delete newErrors.name
        }
        break
        
      case 'email':
        if (!value.trim()) {
          newErrors.email = 'E-mail é obrigatório'
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          newErrors.email = 'E-mail inválido'
        } else {
          delete newErrors.email
        }
        break
        
      case 'cpfCnpj':
        if (!value.trim()) {
          newErrors.cpfCnpj = 'CPF/CNPJ é obrigatório'
        } else {
          const cleaned = value.replace(/\D/g, '')
          if (cleaned.length !== 11 && cleaned.length !== 14) {
            newErrors.cpfCnpj = 'CPF deve ter 11 dígitos ou CNPJ 14 dígitos'
          } else {
            delete newErrors.cpfCnpj
          }
        }
        break
        
      case 'phone':
        if (value && value.length > 0) {
          const cleaned = value.replace(/\D/g, '')
          if (cleaned.length < 10) {
            newErrors.phone = 'Telefone deve ter pelo menos 10 dígitos'
          } else {
            delete newErrors.phone
          }
        } else {
          delete newErrors.phone
        }
        break
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [errors])

  const validateAll = useCallback((data: CreateCustomerRequest) => {
    validateField('name', data.name)
    validateField('email', data.email)
    validateField('cpfCnpj', data.cpfCnpj)
    if (data.phone) validateField('phone', data.phone)
    
    return Object.keys(errors).length === 0
  }, [errors, validateField])

  const clearErrors = useCallback(() => {
    setErrors({})
  }, [])

  return {
    errors,
    validateField,
    validateAll,
    clearErrors,
    hasErrors: Object.keys(errors).length > 0
  }
}
