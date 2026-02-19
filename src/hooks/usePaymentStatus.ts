// ============================================
// usePaymentStatus Hook
// Hook para polling de status de pagamento
// ============================================

import { useState, useEffect, useCallback, useRef } from 'react'
import { paymentApi } from '@/api/paymentApi'
import type { AsaasPaymentStatus, PaymentServiceResponse } from '@/types/asaas'

interface UsePaymentStatusOptions {
  paymentId: string
  pollingInterval?: number // em milissegundos
  maxAttempts?: number
  stopOnStatus?: AsaasPaymentStatus[]
  onStatusChange?: (status: AsaasPaymentStatus, paymentData: any) => void
  onComplete?: (finalStatus: AsaasPaymentStatus, paymentData: any) => void
  onError?: (error: string) => void
}

interface UsePaymentStatusReturn {
  status: AsaasPaymentStatus | null
  paymentData: PaymentServiceResponse['data'] | null
  loading: boolean
  error: string | null
  isPolling: boolean
  attempts: number
  startPolling: () => void
  stopPolling: () => void
  checkOnce: () => Promise<void>
  clearError: () => void
}

export const usePaymentStatus = ({
  paymentId,
  pollingInterval = 5000, // 5 segundos
  maxAttempts = 60, // 5 minutos total
  stopOnStatus = ['RECEIVED', 'CONFIRMED', 'CANCELLED'],
  onStatusChange,
  onComplete,
  onError
}: UsePaymentStatusOptions): UsePaymentStatusReturn => {
  
  const [status, setStatus] = useState<AsaasPaymentStatus | null>(null)
  const [paymentData, setPaymentData] = useState<PaymentServiceResponse['data'] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPolling, setIsPolling] = useState(false)
  const [attempts, setAttempts] = useState(0)
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const attemptsRef = useRef(0)

  const checkPaymentStatus = useCallback(async (): Promise<void> => {
    if (!paymentId) return

    try {
      setLoading(true)
      setError(null)
      
      const result = await paymentApi.getById(paymentId)
      
      if (result.success && result.data) {
        const currentStatus = mapAsaasStatusToLocal(result.data.status)
        const previousStatus = status
        
        setStatus(currentStatus)
        setPaymentData(result.data)
        
        // Callback quando status muda
        if (currentStatus !== previousStatus && previousStatus !== null) {
          onStatusChange?.(currentStatus, result.data)
        }
        
        // Verificar se deve parar o polling
        if (stopOnStatus.includes(currentStatus)) {
          stopPolling()
          onComplete?.(currentStatus, result.data)
        }
        
      } else {
        const errorMsg = result.error || 'Erro ao verificar status do pagamento'
        setError(errorMsg)
        onError?.(errorMsg)
      }
      
    } catch (err) {
      const errorMsg = 'Erro interno ao verificar status'
      setError(errorMsg)
      onError?.(errorMsg)
    } finally {
      setLoading(false)
    }
  }, [paymentId, status, stopOnStatus, onStatusChange, onComplete, onError])

  const startPolling = useCallback(() => {
    if (isPolling || !paymentId) return
    
    setIsPolling(true)
    setAttempts(0)
    attemptsRef.current = 0
    
    // Primeira verificação imediata
    checkPaymentStatus()
    
    // Iniciar polling
    intervalRef.current = setInterval(async () => {
      attemptsRef.current += 1
      setAttempts(attemptsRef.current)
      
      // Verificar limite de tentativas
      if (attemptsRef.current >= maxAttempts) {
        stopPolling()
        const errorMsg = 'Tempo limite de verificação atingido'
        setError(errorMsg)
        onError?.(errorMsg)
        return
      }
      
      await checkPaymentStatus()
    }, pollingInterval)
    
  }, [isPolling, paymentId, checkPaymentStatus, pollingInterval, maxAttempts, onError])

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setIsPolling(false)
  }, [])

  const checkOnce = useCallback(async (): Promise<void> => {
    await checkPaymentStatus()
  }, [checkPaymentStatus])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // Cleanup ao desmontar componente
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  // Auto-start polling quando receber paymentId
  useEffect(() => {
    if (paymentId && !isPolling) {
      startPolling()
    }
  }, [paymentId, isPolling, startPolling])

  return {
    status,
    paymentData,
    loading,
    error,
    isPolling,
    attempts,
    startPolling,
    stopPolling,
    checkOnce,
    clearError
  }
}

// Helper para mapear status do Asaas para status local
function mapAsaasStatusToLocal(asaasStatus: string): AsaasPaymentStatus {
  const statusMap: Record<string, AsaasPaymentStatus> = {
    'PENDING': 'PENDING',
    'AWAITING_PAYMENT': 'PENDING',
    'RECEIVED': 'RECEIVED',
    'CONFIRMED': 'CONFIRMED',
    'OVERDUE': 'OVERDUE',
    'DELETED': 'CANCELLED',
    'CANCELLED': 'CANCELLED',
    'REFUNDED': 'CANCELLED'
  }
  
  return statusMap[asaasStatus] || 'PENDING'
}

// Hook específico para PIX (polling mais frequente)
export const usePixPaymentStatus = (paymentId: string, onComplete?: (status: AsaasPaymentStatus) => void) => {
  return usePaymentStatus({
    paymentId,
    pollingInterval: 3000, // 3 segundos para PIX
    maxAttempts: 100, // 5 minutos
    stopOnStatus: ['RECEIVED', 'CONFIRMED', 'CANCELLED'],
    onComplete: (status, data) => onComplete?.(status)
  })
}

// Hook específico para cartão (polling menos frequente)
export const useCardPaymentStatus = (paymentId: string, onComplete?: (status: AsaasPaymentStatus) => void) => {
  return usePaymentStatus({
    paymentId,
    pollingInterval: 10000, // 10 segundos para cartão
    maxAttempts: 60, // 10 minutos
    stopOnStatus: ['CONFIRMED', 'CANCELLED'],
    onComplete: (status, data) => onComplete?.(status)
  })
}
