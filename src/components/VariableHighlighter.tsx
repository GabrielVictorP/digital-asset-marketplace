import React from 'react';
import { Badge } from '@/components/ui/badge';
import VariableTooltip from '@/components/VariableTooltip';

interface VariableHighlighterProps {
  text: string;
  className?: string;
  showTooltips?: boolean;
}

// Definir descrições para cada variável
const variableDescriptions: Record<string, string> = {
  // Produto & Pagamento
  itemName: 'Nome do produto/item adquirido pelo cliente',
  paymentMethod: 'Método de pagamento utilizado (PIX, Cartão de Crédito, etc.)',
  paymentAmount: 'Valor pago pelo produto formatado em reais (ex: R$ 25,00)',
  
  // Credenciais da Conta
  accountEmail: 'Email da conta do jogo que será entregue ao cliente',
  accountPassword: 'Senha da conta do jogo que será entregue ao cliente',
  accountToken: 'Token de autenticação da conta (quando aplicável)',
  
  // Suporte & Loja
  supportEmail: 'Email de suporte da loja (support@example.com)',
  supportPhone: 'Telefone WhatsApp para suporte ao cliente',
  storeName: 'Nome da loja (Digital Marketplace)',
  
  // Comprador & IDs
  buyerName: 'Nome do comprador/cliente',
  orderId: 'ID único do pedido gerado pelo sistema',
  paymentId: 'ID único do pagamento fornecido pela operadora',
  date: 'Data e hora atual da transação',
  
  // Imagem
  itemImage: 'URL da imagem do produto/item'
};

const VariableHighlighter: React.FC<VariableHighlighterProps> = ({ text, className = "", showTooltips = true }) => {
  // Regex para encontrar variáveis no formato {variableName}
  const variableRegex = /\{([^}]+)\}/g;
  
  // Dividir o texto em partes, mantendo as variáveis
  const parts = text.split(variableRegex);
  
  return (
    <span className={className}>
      {parts.map((part, index) => {
        // Se o índice for ímpar, é uma variável (devido ao split com grupos de captura)
        if (index % 2 === 1) {
          const variableName = part;
          const description = variableDescriptions[variableName];
          
          if (showTooltips && description) {
            return (
              <VariableTooltip
                key={index}
                variableName={`{${part}}`}
                description={description}
              />
            );
          }
          
          return (
            <Badge 
              key={index} 
              variant="secondary" 
              className="mx-0.5 bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200 font-mono text-xs"
            >
              {`{${part}}`}
            </Badge>
          );
        }
        return part;
      })}
    </span>
  );
};

export default VariableHighlighter;
