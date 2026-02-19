import { useState } from 'react';
import { X, Phone } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import logger from '@/lib/logger';

interface PhoneNumberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPhoneNumberSaved: (phoneNumber: string) => void;
  userEmail?: string;
}

const PhoneNumberModal = ({ isOpen, onClose, onPhoneNumberSaved, userEmail }: PhoneNumberModalProps) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);

  const formatPhoneNumber = (value: string) => {
    // Remove all non-numeric characters
    const numbers = value.replace(/\D/g, '');
    
    // Format as (XX) XXXXX-XXXX for Brazilian numbers
    if (numbers.length <= 2) {
      return `(${numbers}`;
    } else if (numbers.length <= 7) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    } else if (numbers.length <= 11) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
    } else {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
    }
  };

  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhoneNumber(formatted);
  };

  const validatePhoneNumber = (phone: string) => {
    // Remove formatting and check if it's a valid Brazilian phone number
    const numbers = phone.replace(/\D/g, '');
    return numbers.length === 10 || numbers.length === 11; // 10 for landline, 11 for mobile
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!phoneNumber.trim()) {
      toast.error('Por favor, digite um número de telefone');
      return;
    }

    if (!validatePhoneNumber(phoneNumber)) {
      toast.error('Por favor, digite um número de telefone válido (10 ou 11 dígitos)');
      return;
    }

    setLoading(true);

    try {
      // Save phone number to database using universal function
      const { data, error } = await supabase
        .rpc('update_user_phone_universal', { 
          new_phone_number: phoneNumber.replace(/\D/g, '') // Store only numbers
        });

      if (error) {
        logger.error('Error saving phone number:', error);
        toast.error('Erro ao salvar número de telefone. Tente novamente.');
        return;
      }

      if (data) {
        toast.success('Número de telefone salvo com sucesso!');
        onPhoneNumberSaved(phoneNumber.replace(/\D/g, ''));
        onClose();
        setPhoneNumber(''); // Reset form
      } else {
        toast.error('Erro ao salvar número de telefone. Tente novamente.');
      }
    } catch (error) {
      logger.error('Error saving phone number:', error);
      toast.error('Erro ao salvar número de telefone. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    onClose();
    setPhoneNumber(''); // Reset form
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card border border-border p-6 rounded-lg shadow-lg w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gaming-primary">Número do WhatsApp</h2>
          <button
            onClick={handleSkip}
            className="p-1 hover:bg-muted rounded-full transition-colors"
            disabled={loading}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4 text-sm text-muted-foreground">
          <p>
            Para melhorar sua experiência de vendas, por favor informe seu número do WhatsApp.
            {userEmail && ` Este será usado como contato para itens da conta ${userEmail}.`}
          </p>
          <p className="mt-2 text-xs">
            Você pode pular esta etapa e configurar depois no seu perfil.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="phoneNumber" className="block text-sm font-medium mb-2">
              Número do WhatsApp
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="tel"
                id="phoneNumber"
                value={phoneNumber}
                onChange={handlePhoneNumberChange}
                placeholder="(11) 99999-9999"
                className="w-full pl-10 pr-3 py-2 bg-muted border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-gaming-primary focus:border-transparent"
                disabled={loading}
                maxLength={15}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Digite apenas números, a formatação será aplicada automaticamente
            </p>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading || !phoneNumber.trim()}
              className="flex-1 bg-gaming-primary hover:bg-gaming-primary/90 text-white px-4 py-2 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Salvando...' : 'Salvar Número'}
            </button>
            
            <button
              type="button"
              onClick={handleSkip}
              disabled={loading}
              className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              Pular
            </button>
          </div>
        </form>

        <div className="mt-4 p-3 bg-gaming-accent/10 border border-gaming-accent/20 rounded-md">
          <p className="text-xs text-gaming-accent">
            <strong>💡 Dica:</strong> Com seu número cadastrado, os clientes poderão entrar em contato diretamente com você quando interessados em seus itens.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PhoneNumberModal;
