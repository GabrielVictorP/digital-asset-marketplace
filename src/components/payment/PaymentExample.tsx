// ============================================
// PaymentExample Component
// Exemplo completo de integração dos componentes
// ============================================

import React from 'react'
import { PaymentProvider, usePaymentStep } from '@/contexts/PaymentContext'
import { PaymentMethodSelector } from './PaymentMethodSelector'
import { PixPayment } from './PixPayment'
import { useAsaasPayment } from '@/hooks/useAsaasPayment'
import { useCustomerData } from '@/hooks/useCustomerData'

// Componente principal que usa o PaymentProvider
export const PaymentExample: React.FC = () => {
  return (
    <PaymentProvider>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <PaymentFlow />
        </div>
      </div>
    </PaymentProvider>
  )
}

// Componente interno que usa os hooks do contexto
const PaymentFlow: React.FC = () => {
  const currentStep = usePaymentStep()

  const renderStep = () => {
    switch (currentStep) {
      case 'customer':
        return <CustomerStep />
      
      case 'method':
        return <MethodStep />
      
      case 'details':
        return <DetailsStep />
      
      case 'processing':
        return <ProcessingStep />
      
      case 'complete':
        return <CompleteStep />
      
      case 'error':
        return <ErrorStep />
      
      default:
        return <CustomerStep />
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Exemplo de Pagamento Asaas
        </h1>
        <p className="text-gray-600">
          Demonstração da integração completa
        </p>
      </div>

      {/* Progress Indicator */}
      <PaymentProgress currentStep={currentStep} />

      {/* Step Content */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        {renderStep()}
      </div>
    </div>
  )
}

// ============================================
// STEP COMPONENTS
// ============================================

const CustomerStep: React.FC = () => {
  const { customers, loading, createCustomer } = useCustomerData()

  const handleQuickCustomer = async () => {
    // Exemplo: criar um cliente de teste
    const result = await createCustomer({
      name: 'Cliente Teste',
      email: 'teste@email.com',
      cpfCnpj: '12345678901',
      phone: '11999999999' // Telefone padrão para testes
    })

    console.log('Cliente criado:', result)
  }

  return (
    <div className="text-center space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">
        Selecionar Cliente
      </h2>
      
      <div className="max-w-md mx-auto space-y-4">
        <p className="text-gray-600">
          Para este exemplo, vamos criar um cliente de teste
        </p>
        
        <button
          onClick={handleQuickCustomer}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Criando Cliente...' : 'Criar Cliente Teste'}
        </button>

        {customers.length > 0 && (
          <div className="mt-6">
            <p className="text-sm text-gray-500 mb-3">Clientes existentes:</p>
            <div className="space-y-2">
              {customers.slice(0, 3).map((customer) => (
                <div
                  key={customer.id}
                  className="text-left p-3 border border-gray-200 rounded-lg text-sm"
                >
                  <div className="font-medium">{customer.name}</div>
                  <div className="text-gray-500">{customer.email}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const MethodStep: React.FC = () => {
  return (
    <div>
      <PaymentMethodSelector />
    </div>
  )
}

const DetailsStep: React.FC = () => {
  const { createPixPayment, loading } = useAsaasPayment()

  const handleCreatePayment = async () => {
    // Exemplo: criar um pagamento PIX
    const result = await createPixPayment(
      'cus_teste123', // ID do cliente
      50.00, // Valor
      'Pagamento de teste' // Descrição
    )

    console.log('Pagamento criado:', result)
  }

  return (
    <div className="text-center space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">
        Detalhes do Pagamento
      </h2>
      
      <div className="max-w-md mx-auto space-y-4">
        <div className="text-left space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Valor do Pagamento
            </label>
            <div className="text-2xl font-bold text-green-600">
              R$ 50,00
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descrição
            </label>
            <p className="text-gray-600">Pagamento de teste</p>
          </div>
        </div>
        
        <button
          onClick={handleCreatePayment}
          disabled={loading}
          className="w-full bg-green-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? 'Criando Pagamento...' : 'Criar Pagamento PIX'}
        </button>
      </div>
    </div>
  )
}

const ProcessingStep: React.FC = () => {
  return (
    <div>
      <PixPayment 
        onPaymentComplete={(status) => {
          console.log('Pagamento completo:', status)
        }}
        onPaymentError={(error) => {
          console.error('Erro no pagamento:', error)
        }}
      />
    </div>
  )
}

const CompleteStep: React.FC = () => {
  return (
    <div className="text-center space-y-6">
      <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto text-2xl">
        ✓
      </div>
      <h2 className="text-2xl font-bold text-green-900">
        Pagamento Confirmado!
      </h2>
      <p className="text-gray-600 max-w-md mx-auto">
        Seu pagamento foi processado com sucesso. Você receberá uma confirmação por e-mail.
      </p>
    </div>
  )
}

const ErrorStep: React.FC = () => {
  return (
    <div className="text-center space-y-6">
      <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto text-2xl">
        ✗
      </div>
      <h2 className="text-2xl font-bold text-red-900">
        Erro no Pagamento
      </h2>
      <p className="text-gray-600 max-w-md mx-auto">
        Ocorreu um erro ao processar seu pagamento. Tente novamente.
      </p>
    </div>
  )
}

// ============================================
// PaymentProgress Component
// ============================================

interface PaymentProgressProps {
  currentStep: string
}

const PaymentProgress: React.FC<PaymentProgressProps> = ({ currentStep }) => {
  const steps = [
    { id: 'customer', name: 'Cliente', completed: false },
    { id: 'method', name: 'Método', completed: false },
    { id: 'details', name: 'Detalhes', completed: false },
    { id: 'processing', name: 'Pagamento', completed: false },
    { id: 'complete', name: 'Concluído', completed: false }
  ]

  // Marcar steps como concluídos baseado no step atual
  const currentIndex = steps.findIndex(step => step.id === currentStep)
  steps.forEach((step, index) => {
    step.completed = index < currentIndex || currentStep === 'complete'
  })

  return (
    <div className="flex items-center justify-center space-x-4">
      {steps.map((step, index) => (
        <React.Fragment key={step.id}>
          <div className="flex flex-col items-center space-y-2">
            <div className={`
              w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
              ${step.completed || step.id === currentStep
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-600'
              }
            `}>
              {step.completed ? '✓' : index + 1}
            </div>
            <span className={`
              text-xs font-medium
              ${step.id === currentStep ? 'text-blue-600' : 'text-gray-500'}
            `}>
              {step.name}
            </span>
          </div>
          
          {index < steps.length - 1 && (
            <div className={`
              w-8 h-0.5
              ${step.completed ? 'bg-blue-600' : 'bg-gray-200'}
            `} />
          )}
        </React.Fragment>
      ))}
    </div>
  )
}
