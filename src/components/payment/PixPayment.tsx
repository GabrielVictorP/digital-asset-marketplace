// ============================================
// PixPayment Component  
// Interface completa para pagamento PIX
// ============================================

import React, { useState, useCallback, useEffect } from 'react'
import { usePaymentStatus, usePaymentUI, usePaymentDetails } from '@/contexts/PaymentContext'
import { usePixPaymentStatus } from '@/hooks/usePaymentStatus'
import { Copy, CheckCircle, Clock, AlertCircle, RefreshCw } from 'lucide-react'
// Ícones do Iconify para melhor visual profissional
import { Icon } from '@iconify/react'
import { Button } from '@/components/ui/button'

interface PixPaymentProps {
  className?: string
  onPaymentComplete?: (status: string) => void
  onPaymentError?: (error: string) => void
  onReloadPayment?: () => Promise<void>
}

export const PixPayment: React.FC<PixPaymentProps> = ({
  className = '',
  onPaymentComplete,
  onPaymentError,
  onReloadPayment
}) => {
  const { paymentId, pixQrCode, pixCopyPaste } = usePaymentStatus()
  const { amount, description } = usePaymentDetails()
  const { loading: contextLoading, error: contextError } = usePaymentUI()
  
  // Polling do status
  const {
    status: pollingStatus,
    loading: pollingLoading,
    error: pollingError,
    isPolling,
    attempts
  } = usePixPaymentStatus(
    paymentId || '',
    (status) => {
      if (['RECEIVED', 'CONFIRMED'].includes(status)) {
        onPaymentComplete?.(status)
      }
    }
  )

  const [copied, setCopied] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(300) // 5 minutos
  const [isExpired, setIsExpired] = useState(false)
  const [isReloading, setIsReloading] = useState(false)

  // Countdown timer
  useEffect(() => {
    if (timeRemaining <= 0) {
      setIsExpired(true)
      return
    }

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        const newTime = Math.max(0, prev - 1)
        if (newTime === 0) {
          setIsExpired(true)
        }
        return newTime
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [timeRemaining])

  const handleCopyPaste = useCallback(async () => {
    if (!pixCopyPaste) return

    try {
      await navigator.clipboard.writeText(pixCopyPaste)
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    } catch (error) {
      console.error('Erro ao copiar:', error)
      onPaymentError?.('Erro ao copiar código PIX')
    }
  }, [pixCopyPaste, onPaymentError])

  const handleReload = useCallback(async () => {
    if (!onReloadPayment) return
    
    setIsReloading(true)
    setIsExpired(false)
    
    try {
      await onReloadPayment()
      setTimeRemaining(300) // Reset timer
      setCopied(false) // Reset copy state
    } catch (error) {
      console.error('Erro ao recarregar pagamento:', error)
      onPaymentError?.('Erro ao recarregar pagamento PIX')
    } finally {
      setIsReloading(false)
    }
  }, [onReloadPayment, onPaymentError])

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (contextLoading) {
    return <PixLoadingSkeleton />
  }

  if (contextError || pollingError) {
    return (
      <PixErrorState 
        error={contextError || pollingError} 
        className={className}
      />
    )
  }

  if (!paymentId || !pixQrCode || !pixCopyPaste) {
    return (
      <PixErrorState 
        error="Dados do PIX não encontrados"
        className={className}
      />
    )
  }

  return (
    <div className={`max-w-lg mx-auto space-y-6 ${className}`}>
      {/* Status do pagamento */}
      <PaymentStatusIndicator 
        status={pollingStatus} 
        isPolling={isPolling}
        attempts={attempts}
      />

      {/* Informações do pagamento */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Icon icon="simple-icons:pix" className="h-8 w-8 text-green-600" fallback={<Icon icon="mdi:qrcode" className="h-8 w-8 text-green-600" />} />
            <h2 className="text-2xl font-bold text-gray-900">
              Pagamento PIX
            </h2>
          </div>
          <div className="text-3xl font-bold text-green-600">
            {formatCurrency(amount)}
          </div>
          {description && (
            <p className="text-gray-600 mt-2">{description}</p>
          )}
        </div>

        {/* Timer */}
        <div className="flex items-center justify-center space-x-2 text-orange-600">
          <Clock size={20} />
          <span className="font-medium">
            Tempo restante: {formatTime(timeRemaining)}
          </span>
        </div>
      </div>

      {/* QR Code */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="text-center space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {isExpired ? 'QR Code Expirado' : 'Escaneie o QR Code'}
          </h3>
          
          {isExpired ? (
            <div className="space-y-4">
              <div className="w-64 h-64 mx-auto bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                <div className="text-center space-y-2">
                  <AlertCircle className="w-12 h-12 text-orange-500 mx-auto" />
                  <p className="text-sm text-gray-600">QR Code expirado</p>
                </div>
              </div>
              <Button
                onClick={handleReload}
                disabled={isReloading}
                className="bg-blue-600 text-white hover:bg-blue-700"
              >
                {isReloading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Gerando novo QR Code...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Gerar novo QR Code
                  </>
                )}
              </Button>
            </div>
          ) : (
            <>
              <QRCodeDisplay qrCode={pixQrCode} />
              <p className="text-sm text-gray-600">
                Abra o app do seu banco e escaneie o código
              </p>
            </>
          )}
        </div>
      </div>

      {/* Código Copia e Cola */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 text-center">
            Ou copie o código PIX
          </h3>
          
          <div className="relative">
            <textarea
              readOnly
              value={pixCopyPaste}
              className="w-full h-24 p-3 border border-gray-300 rounded-lg text-xs font-mono resize-none bg-gray-50"
            />
            
            <button
              onClick={handleCopyPaste}
              className={`
                absolute top-2 right-2 p-2 rounded-lg transition-all duration-200
                ${copied 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                }
              `}
              title={copied ? 'Copiado!' : 'Copiar código'}
            >
              {copied ? <CheckCircle size={20} /> : <Copy size={20} />}
            </button>
          </div>
          
          <button
            onClick={handleCopyPaste}
            className={`
              w-full py-3 px-4 rounded-lg font-semibold transition-all duration-200
              ${copied
                ? 'bg-green-500 text-white'
                : 'bg-blue-600 text-white hover:bg-blue-700'
              }
            `}
          >
            {copied ? 'Código Copiado!' : 'Copiar Código PIX'}
          </button>
        </div>
      </div>

      {/* Instruções */}
      <div className="bg-blue-50 rounded-xl border border-blue-200 p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">
          Como pagar com PIX
        </h3>
        <ol className="space-y-2 text-sm text-blue-800">
          <li className="flex items-start space-x-2">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-200 text-blue-900 rounded-full flex items-center justify-center text-xs font-bold">1</span>
            <span>Abra o app do seu banco ou carteira digital</span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-200 text-blue-900 rounded-full flex items-center justify-center text-xs font-bold">2</span>
            <span>Escolha pagar via PIX</span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-200 text-blue-900 rounded-full flex items-center justify-center text-xs font-bold">3</span>
            <span>Escaneie o QR Code ou cole o código PIX</span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-200 text-blue-900 rounded-full flex items-center justify-center text-xs font-bold">4</span>
            <span>Confirme o pagamento</span>
          </li>
        </ol>
      </div>
    </div>
  )
}

// ============================================
// QRCodeDisplay Component
// ============================================

interface QRCodeDisplayProps {
  qrCode: string
}

const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({ qrCode }) => {
  return (
    <div className="flex justify-center">
      <div className="p-4 bg-white border border-gray-200 rounded-lg">
        <img
          src={`data:image/png;base64,${qrCode}`}
          alt="QR Code PIX"
          className="w-64 h-64 mx-auto"
        />
      </div>
    </div>
  )
}

// ============================================
// PaymentStatusIndicator Component  
// ============================================

interface PaymentStatusIndicatorProps {
  status: string | null
  isPolling: boolean
  attempts: number
}

const PaymentStatusIndicator: React.FC<PaymentStatusIndicatorProps> = ({
  status,
  isPolling,
  attempts
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'RECEIVED':
      case 'CONFIRMED':
        return {
          color: 'green',
          icon: <CheckCircle size={24} />,
          title: 'Pagamento Confirmado!',
          description: 'Seu pagamento foi processado com sucesso.'
        }
      case 'PENDING':
      default:
        return {
          color: 'blue',
          icon: <Clock size={24} />,
          title: 'Aguardando Pagamento',
          description: isPolling 
            ? `Verificando status... (tentativa ${attempts})`
            : 'Realize o pagamento via PIX'
        }
    }
  }

  const config = getStatusConfig()

  return (
    <div className={`bg-${config.color}-50 border border-${config.color}-200 rounded-xl p-6`}>
      <div className="flex items-center space-x-3">
        <div className={`text-${config.color}-600`}>
          {config.icon}
        </div>
        <div>
          <h3 className={`font-semibold text-${config.color}-900`}>
            {config.title}
          </h3>
          <p className={`text-sm text-${config.color}-700`}>
            {config.description}
          </p>
        </div>
      </div>
    </div>
  )
}

// ============================================
// Loading e Error States
// ============================================

const PixLoadingSkeleton: React.FC = () => {
  return (
    <div className="max-w-lg mx-auto space-y-6 animate-pulse">
      <div className="h-20 bg-gray-200 rounded-xl"></div>
      <div className="h-80 bg-gray-200 rounded-xl"></div>
      <div className="h-32 bg-gray-200 rounded-xl"></div>
    </div>
  )
}

interface PixErrorStateProps {
  error: string | null
  className?: string
}

const PixErrorState: React.FC<PixErrorStateProps> = ({ error, className = '' }) => {
  return (
    <div className={`max-w-lg mx-auto ${className}`}>
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-red-900 mb-2">
          Erro no Pagamento PIX
        </h3>
        <p className="text-red-700">
          {error || 'Ocorreu um erro inesperado'}
        </p>
      </div>
    </div>
  )
}

// ============================================
// Utility Functions
// ============================================

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}
