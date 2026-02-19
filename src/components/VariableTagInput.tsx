import React, { useRef, KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';

interface VariableTagInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  multiline?: boolean;
  rows?: number;
  id?: string;
}

const VariableTagInput: React.FC<VariableTagInputProps> = ({
  value,
  onChange,
  placeholder,
  className,
  disabled = false,
  multiline = false,
  rows = 1,
  id
}) => {
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  // Função para detectar se o cursor está dentro de uma variável
  const findVariableAtPosition = (text: string, position: number) => {
    const regex = /\{[^}]+\}/g;
    let match;
    
    while ((match = regex.exec(text)) !== null) {
      const start = match.index;
      const end = match.index + match[0].length;
      
      if (position > start && position < end) {
        return {
          start,
          end,
          variable: match[0]
        };
      }
    }
    return null;
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (disabled) return;

    const target = e.target as HTMLInputElement | HTMLTextAreaElement;
    const cursorPos = target.selectionStart || 0;

    // Handle backspace para deletar variável inteira se cursor estiver logo após ela
    if (e.key === 'Backspace') {
      const regex = /\{[^}]+\}/g;
      let match;
      
      while ((match = regex.exec(value)) !== null) {
        const start = match.index;
        const end = match.index + match[0].length;
        
        if (cursorPos === end) {
          e.preventDefault();
          const newValue = value.slice(0, start) + value.slice(end);
          onChange(newValue);
          
          setTimeout(() => {
            if (inputRef.current) {
              inputRef.current.setSelectionRange(start, start);
            }
          }, 0);
          return;
        }
      }
    }

    // Handle delete para deletar variável inteira se cursor estiver logo antes dela
    if (e.key === 'Delete') {
      const regex = /\{[^}]+\}/g;
      let match;
      
      while ((match = regex.exec(value)) !== null) {
        const start = match.index;
        const end = match.index + match[0].length;
        
        if (cursorPos === start) {
          e.preventDefault();
          const newValue = value.slice(0, start) + value.slice(end);
          onChange(newValue);
          return;
        }
      }
    }

    // Prevenir navegação para dentro de variáveis
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      const variable = findVariableAtPosition(value, cursorPos);
      if (variable) {
        e.preventDefault();
        const newPos = e.key === 'ArrowLeft' ? variable.start : variable.end;
        if (inputRef.current) {
          inputRef.current.setSelectionRange(newPos, newPos);
        }
        return;
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  const inputClassName = cn(
    "w-full px-3 py-2 border rounded-md shadow-sm transition-colors",
    "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
    disabled
      ? "bg-gray-50 text-gray-500 cursor-not-allowed border-gray-200"
      : "bg-white border-gray-300 hover:border-gray-400 text-gray-900",
    className
  );

  if (multiline) {
    return (
      <textarea
        ref={inputRef as React.RefObject<HTMLTextAreaElement>}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        rows={rows}
        id={id}
        placeholder={placeholder}
        className={cn(inputClassName, "resize-none")}
      />
    );
  }

  return (
    <input
      ref={inputRef as React.RefObject<HTMLInputElement>}
      type="text"
      value={value}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      disabled={disabled}
      id={id}
      placeholder={placeholder}
      className={inputClassName}
    />
  );
};

export default VariableTagInput;
