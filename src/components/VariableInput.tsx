import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

interface VariableInputProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  multiline?: boolean;
  rows?: number;
}

const availableVariables = [
  { name: 'itemName', description: 'Nome do item' },
  { name: 'paymentMethod', description: 'Método de pagamento' },
  { name: 'date', description: 'Data atual' },
  { name: 'supportEmail', description: 'Email de suporte (support@example.com)' },
  { name: 'supportPhone', description: 'Número do WhatsApp para suporte' },
  { name: 'storeName', description: 'Nome da loja (Digital Marketplace)' },
  { name: 'buyerName', description: 'Nome do comprador' },
  { name: 'paymentAmount', description: 'Valor do pagamento' },
  { name: 'paymentId', description: 'ID do pagamento' },
  { name: 'orderId', description: 'ID do pedido' }
];

const VariableInput: React.FC<VariableInputProps> = ({
  id,
  value,
  onChange,
  disabled = false,
  placeholder,
  className = '',
  multiline = false,
  rows = 3
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [currentQuery, setCurrentQuery] = useState('');
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  // Detectar quando o usuário está digitando uma variável
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart || 0;
    
    onChange(newValue);
    setCursorPosition(cursorPos);

    // Verificar se o usuário está digitando uma variável
    const textBeforeCursor = newValue.substring(0, cursorPos);
    const lastBraceIndex = textBeforeCursor.lastIndexOf('{');
    
    if (lastBraceIndex !== -1 && !textBeforeCursor.substring(lastBraceIndex).includes('}')) {
      const query = textBeforeCursor.substring(lastBraceIndex + 1);
      setCurrentQuery(query);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
      setCurrentQuery('');
    }
  };

  // Inserir variável sugerida
  const insertVariable = (variableName: string) => {
    const textBeforeCursor = value.substring(0, cursorPosition);
    const textAfterCursor = value.substring(cursorPosition);
    const lastBraceIndex = textBeforeCursor.lastIndexOf('{');
    
    if (lastBraceIndex !== -1) {
      const beforeBrace = value.substring(0, lastBraceIndex);
      const newValue = `${beforeBrace}{${variableName}}${textAfterCursor}`;
      onChange(newValue);
      setShowSuggestions(false);
      
      // Focar o input após inserir
      setTimeout(() => {
        if (inputRef.current) {
          const newCursorPos = lastBraceIndex + variableName.length + 2;
          inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
          inputRef.current.focus();
        }
      }, 0);
    }
  };

  // Renderizar texto com variáveis destacadas
  const renderHighlightedText = (text: string) => {
    if (!text) return null;
    
    const variableRegex = /\{([^}]+)\}/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = variableRegex.exec(text)) !== null) {
      // Adicionar texto antes da variável
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      
      // Adicionar a variável destacada
      parts.push(
        <span
          key={match.index}
          className="inline-flex items-center mx-0.5 bg-gradient-to-r from-blue-100 to-blue-200 text-blue-900 border border-blue-300 font-mono text-sm px-2 py-1 rounded-md shadow-sm font-semibold"
          style={{
            textShadow: '0 1px 2px rgba(0,0,0,0.1)'
          }}
        >
          {match[0]}
        </span>
      );
      
      lastIndex = match.index + match[0].length;
    }

    // Adicionar texto restante
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts;
  };

  // Filtrar sugestões baseadas na query
  const filteredSuggestions = availableVariables.filter(variable =>
    variable.name.toLowerCase().includes(currentQuery.toLowerCase())
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
    
    // Detectar tentativa de deletar variável completa
    if (e.key === 'Backspace') {
      const cursorPos = (e.target as HTMLInputElement | HTMLTextAreaElement).selectionStart || 0;
      const charBeforeCursor = value.charAt(cursorPos - 1);
      
      if (charBeforeCursor === '}') {
        // Encontrar o início da variável
        const textBeforeCursor = value.substring(0, cursorPos - 1);
        const lastBraceIndex = textBeforeCursor.lastIndexOf('{');
        
        if (lastBraceIndex !== -1) {
          e.preventDefault();
          const beforeVariable = value.substring(0, lastBraceIndex);
          const afterVariable = value.substring(cursorPos);
          const newValue = beforeVariable + afterVariable;
          onChange(newValue);
          
          // Reposicionar cursor
          setTimeout(() => {
            if (inputRef.current) {
              inputRef.current.setSelectionRange(lastBraceIndex, lastBraceIndex);
            }
          }, 0);
        }
      }
    }
  };

  const InputComponent = multiline ? Textarea : Input;

  return (
    <div className="relative">
      {/* Input overlay para mostrar texto destacado */}
      <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
        <div 
          className={`w-full h-full p-3 text-slate-900 whitespace-pre-wrap break-words ${
            multiline ? 'min-h-[80px]' : 'truncate'
          }`}
          style={{ 
            fontSize: '14px', 
            lineHeight: '1.4',
            fontFamily: 'inherit',
            pointerEvents: 'none'
          }}
        >
          {!disabled && renderHighlightedText(value)}
        </div>
      </div>

      {/* Input real */}
      <InputComponent
        ref={inputRef as any}
        id={id}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={placeholder}
        rows={multiline ? rows : undefined}
        className={`relative z-20 bg-transparent ${className}`}
        style={{ caretColor: '#1e293b' }} // Cursor visível
      />

      {/* Sugestões de variáveis */}
      {showSuggestions && !disabled && filteredSuggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-30 mt-1 bg-white border border-slate-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {filteredSuggestions.map((variable) => (
            <div
              key={variable.name}
              className="px-3 py-2 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-b-0"
              onClick={() => insertVariable(variable.name)}
            >
              <div className="flex items-center justify-between">
                <Badge
                  variant="secondary"
                  className="bg-blue-100 text-blue-800 border-blue-200 font-mono text-xs"
                >
                  {`{${variable.name}}`}
                </Badge>
                <span className="text-xs text-slate-600">{variable.description}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default VariableInput;
