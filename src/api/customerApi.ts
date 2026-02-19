// ============================================
// CUSTOMER API CLIENT
// Interface simplificada para operações de clientes
// ============================================

import { AsaasCustomerService } from '@/services/AsaasCustomerService'
import type { 
  CreateCustomerRequest, 
  CustomerServiceResponse,
  DbAsaasCustomer 
} from '@/types/asaas'

// ============================================
// CUSTOMER CREATION
// ============================================

/**
 * Criar novo cliente
 */
export const createCustomer = async (customerData: CreateCustomerRequest): Promise<CustomerServiceResponse> => {
  try {
    // Formatar CPF/CNPJ (apenas números)
    const formattedData = {
      ...customerData,
      cpfCnpj: AsaasCustomerService.formatCpfCnpj(customerData.cpfCnpj)
    }

    // Verificar se CPF/CNPJ já existe
    const existingCustomer = await AsaasCustomerService.findCustomerByCpfCnpj(formattedData.cpfCnpj)
    
    if (existingCustomer) {
      return { 
        success: false, 
        error: 'Cliente com este CPF/CNPJ já existe' 
      }
    }

    // Validar CPF/CNPJ
    if (!AsaasCustomerService.validateCpfCnpj(formattedData.cpfCnpj)) {
      return { 
        success: false, 
        error: 'CPF/CNPJ inválido' 
      }
    }

    // Criar cliente via service
    const result = await AsaasCustomerService.createCustomer(formattedData)
    
    return result
  } catch (error) {
    console.error('Erro ao criar cliente:', error)
    return { success: false, error: 'Erro interno' }
  }
}

/**
 * Criar cliente simplificado (apenas dados essenciais)
 */
export const createSimpleCustomer = async (
  name: string, 
  email: string, 
  cpfCnpj: string,
  phone?: string
): Promise<CustomerServiceResponse> => {
  return createCustomer({
    name,
    email,
    cpfCnpj,
    phone,
    externalReference: `customer_${Date.now()}`
  })
}

// ============================================
// CUSTOMER QUERIES
// ============================================

/**
 * Buscar todos os clientes do usuário
 */
export const getMyCustomers = async (): Promise<DbAsaasCustomer[]> => {
  try {
    return await AsaasCustomerService.getCustomersFromSupabase()
  } catch (error) {
    console.error('Erro ao buscar clientes:', error)
    return []
  }
}

/**
 * Buscar cliente por ID do Asaas
 */
export const getCustomer = async (customerId: string): Promise<CustomerServiceResponse> => {
  try {
    return await AsaasCustomerService.getCustomer(customerId)
  } catch (error) {
    console.error('Erro ao buscar cliente:', error)
    return { success: false, error: 'Erro ao buscar cliente' }
  }
}

/**
 * Buscar cliente por CPF/CNPJ
 */
export const findCustomerByCpfCnpj = async (cpfCnpj: string): Promise<DbAsaasCustomer | null> => {
  try {
    const formatted = AsaasCustomerService.formatCpfCnpj(cpfCnpj)
    return await AsaasCustomerService.findCustomerByCpfCnpj(formatted)
  } catch (error) {
    console.error('Erro ao buscar por CPF/CNPJ:', error)
    return null
  }
}

// ============================================
// CUSTOMER UPDATES
// ============================================

/**
 * Atualizar dados do cliente
 */
export const updateCustomer = async (
  customerId: string, 
  updateData: Partial<CreateCustomerRequest>
): Promise<CustomerServiceResponse> => {
  try {
    // Formatar CPF/CNPJ se fornecido
    if (updateData.cpfCnpj) {
      updateData.cpfCnpj = AsaasCustomerService.formatCpfCnpj(updateData.cpfCnpj)
      
      if (!AsaasCustomerService.validateCpfCnpj(updateData.cpfCnpj)) {
        return { 
          success: false, 
          error: 'CPF/CNPJ inválido' 
        }
      }
    }

    return await AsaasCustomerService.updateCustomer(customerId, updateData)
  } catch (error) {
    console.error('Erro ao atualizar cliente:', error)
    return { success: false, error: 'Erro ao atualizar cliente' }
  }
}

/**
 * Sincronizar cliente do Asaas com Supabase
 */
export const syncCustomer = async (asaasCustomerId: string): Promise<CustomerServiceResponse> => {
  try {
    return await AsaasCustomerService.syncCustomer(asaasCustomerId)
  } catch (error) {
    console.error('Erro na sincronização:', error)
    return { success: false, error: 'Erro na sincronização' }
  }
}

// ============================================
// CUSTOMER UTILITIES
// ============================================

/**
 * Validar dados do cliente antes de enviar
 */
export const validateCustomerData = (customerData: CreateCustomerRequest): string[] => {
  const errors: string[] = []

  if (!customerData.name?.trim()) {
    errors.push('Nome é obrigatório')
  }

  if (!customerData.email?.trim()) {
    errors.push('E-mail é obrigatório')
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerData.email)) {
    errors.push('E-mail inválido')
  }

  if (!customerData.cpfCnpj?.trim()) {
    errors.push('CPF/CNPJ é obrigatório')
  } else if (!AsaasCustomerService.validateCpfCnpj(customerData.cpfCnpj)) {
    errors.push('CPF/CNPJ inválido')
  }

  return errors
}

/**
 * Formatar dados do cliente para exibição
 */
export const formatCustomerForDisplay = (customer: DbAsaasCustomer) => {
  return {
    id: customer.asaas_customer_id,
    name: customer.name,
    email: customer.email,
    document: formatCpfCnpjForDisplay(customer.cpf_cnpj),
    phone: customer.phone || 'Não informado',
    personType: AsaasCustomerService.getPersonType(customer.cpf_cnpj),
    createdAt: new Date(customer.created_at).toLocaleDateString('pt-BR'),
    address: formatAddressForDisplay(customer.address_data)
  }
}

/**
 * Formatar CPF/CNPJ para exibição
 */
export const formatCpfCnpjForDisplay = (cpfCnpj: string): string => {
  const cleaned = cpfCnpj.replace(/\D/g, '')
  
  if (cleaned.length === 11) {
    // CPF: 000.000.000-00
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  } else if (cleaned.length === 14) {
    // CNPJ: 00.000.000/0000-00
    return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
  }
  
  return cpfCnpj
}

/**
 * Formatar endereço para exibição
 */
export const formatAddressForDisplay = (addressData: Record<string, any>): string => {
  if (!addressData || typeof addressData !== 'object') {
    return 'Não informado'
  }

  const parts = [
    addressData.address,
    addressData.addressNumber,
    addressData.complement,
    addressData.city,
    addressData.state
  ].filter(Boolean)

  return parts.length > 0 ? parts.join(', ') : 'Não informado'
}

// ============================================
// EXPORT DEFAULT
// ============================================

export const customerApi = {
  create: createCustomer,
  createSimple: createSimpleCustomer,
  getAll: getMyCustomers,
  getById: getCustomer,
  findByCpfCnpj: findCustomerByCpfCnpj,
  update: updateCustomer,
  sync: syncCustomer,
  validate: validateCustomerData,
  format: formatCustomerForDisplay,
  formatDocument: formatCpfCnpjForDisplay,
  formatAddress: formatAddressForDisplay
}
