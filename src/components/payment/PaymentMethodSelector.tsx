// ============================================
// PaymentMethodSelector Component
// Seletor de método de pagamento (PIX, Cartão, Boleto)
// ============================================

import React from 'react'
import { usePaymentMethod } from '@/contexts/PaymentContext'
import type { AsaasPaymentMethod } from '@/types/asaas'

interface PaymentMethodOption {
  id: AsaasPaymentMethod
  name: string
  description: string
  icon: string
  recommended?: boolean
  processingTime: string
}

const paymentMethods: PaymentMethodOption[] = [
  {
    id: 'PIX',
    name: 'PIX',
    description: 'Pagamento instantâneo via PIX',
    icon: '🔲',
    recommended: true,
    processingTime: 'Imediato'
  },
  // Cartão de crédito oculto temporariamente
  // {
  //   id: 'CREDIT_CARD',
  //   name: 'Cartão de Crédito',
  //   description: 'Pagamento via cartão de crédito',
  //   icon: '💳',
  //   processingTime: 'Até 2 dias úteis'
  // },
  {
    id: 'BOLETO',
    name: 'Boleto Bancário',
    description: 'Boleto bancário para pagamento',
    icon: '📄',
    processingTime: 'Até 3 dias úteis'
  }
]

interface PaymentMethodSelectorProps {
  className?: string
  onMethodSelect?: (method: AsaasPaymentMethod) => void
}

export const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({
  className = '',
  onMethodSelect
}) => {
  const { method, setMethod } = usePaymentMethod()

  const handleMethodSelect = (selectedMethod: AsaasPaymentMethod) => {
    setMethod(selectedMethod)
    onMethodSelect?.(selectedMethod)
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Escolha a forma de pagamento
        </h2>
        <p className="text-gray-600">
          Selecione o método que preferir para realizar o pagamento
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-1 max-w-md mx-auto">
        {paymentMethods.map((option) => (
          <PaymentMethodCard
            key={option.id}
            option={option}
            selected={method === option.id}
            onSelect={() => handleMethodSelect(option.id)}
          />
        ))}
      </div>

      {method && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center space-x-2 text-blue-800">
            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
            <span className="font-medium">
              {paymentMethods.find(m => m.id === method)?.name} selecionado
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================
// PaymentMethodCard Component
// ============================================

interface PaymentMethodCardProps {
  option: PaymentMethodOption
  selected: boolean
  onSelect: () => void
}

const PaymentMethodCard: React.FC<PaymentMethodCardProps> = ({
  option,
  selected,
  onSelect
}) => {
  return (
    <button
      onClick={onSelect}
      className={`
        relative w-full p-4 border-2 rounded-xl text-left transition-all duration-200
        hover:border-blue-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        ${selected 
          ? 'border-blue-500 bg-blue-50 shadow-md' 
          : 'border-gray-200 bg-white hover:bg-gray-50'
        }
      `}
    >
      {/* Badge recomendado */}
      {option.recommended && (
        <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">
          Recomendado
        </div>
      )}

      <div className="flex items-start space-x-4">
        {/* Ícone */}
        <div className={`
          flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-lg text-2xl
          ${selected ? 'bg-blue-100' : 'bg-gray-100'}
        `}>
          {option.icon}
        </div>

        {/* Conteúdo */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <h3 className={`
              font-semibold text-lg
              ${selected ? 'text-blue-900' : 'text-gray-900'}
            `}>
              {option.name}
            </h3>
            
            {/* Indicador de seleção */}
            {selected && (
              <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
            )}
          </div>

          <p className={`
            text-sm mb-2
            ${selected ? 'text-blue-700' : 'text-gray-600'}
          `}>
            {option.description}
          </p>

          <div className={`
            text-xs font-medium
            ${selected ? 'text-blue-600' : 'text-gray-500'}
          `}>
            ⏱️ {option.processingTime}
          </div>
        </div>

        {/* Radio button */}
        <div className={`
          flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center
          ${selected 
            ? 'border-blue-500 bg-blue-500' 
            : 'border-gray-300 bg-white'
          }
        `}>
          {selected && (
            <div className="w-2 h-2 bg-white rounded-full"></div>
          )}
        </div>
      </div>
    </button>
  )
}
