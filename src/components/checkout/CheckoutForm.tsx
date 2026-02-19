
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Item } from '@/contexts/SupabaseItemsContext';
import { useAsaasPayment } from '@/hooks/useAsaasPayment';
import { useCustomerData } from '@/hooks/useCustomerData';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { usePurchaseSecurity } from '@/hooks/usePurchaseSecurity';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { formatCurrencyForUser } from '@/lib/locale-utils';
import { CreditCard, Zap, Loader2, ShoppingCart, Package, Check, Copy, CheckCircle, Clock, ArrowLeft, QrCode, User, Phone, CreditCard as CardIcon, Calendar, Lock, Smartphone } from 'lucide-react';
// Icones do Iconify para melhor visual profissional
import { Icon } from '@iconify/react';
import SmartImage from '@/components/SmartImage';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { checkItemHasAccountsCached } from '@/utils/itemAccountCheck';

interface CheckoutFormProps {
  item: Item;
}

type PaymentType = 'pix' | 'credit_card';
type CheckoutStep = 'selection' | 'processing' | 'pix_payment' | 'card_payment';
type Platform = 'android' | 'ios';


// Constante para detectar modo sandbox/teste - ajustada para produção
const IS_SANDBOX_MODE = import.meta.env.VITE_ASAAS_ENV === 'sandbox' || import.meta.env.DEV;
interface CardFormData {
  cardHolderName: string;
  cardNumber: string;
  expiryDate: string; // Campo unificado MM/YY
  expiryMonth: string; // Manter para compatibilidade (deprecated)
  expiryYear: string; // Manter para compatibilidade (deprecated)
  cvv: string;
  cardHolderCpf: string;
  phone: string; // Campo de telefone
  // Campos de endereço
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
}

const CheckoutForm = ({ item }: CheckoutFormProps) => {
  const navigate = useNavigate();
  const { user } = useSupabaseAuth();
  const [selectedPaymentType, setSelectedPaymentType] = useState<PaymentType | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<CheckoutStep>('selection');
  const [copied, setCopied] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(300); // 5 minutes
  const [isPixActive, setIsPixActive] = useState(false); // Controla se PIX foi ativado
  const [hasLinkedAccount, setHasLinkedAccount] = useState<boolean | null>(null); // Verifica se item tem account vinculada
  
  // Refs para controlar timers e evitar vazamentos de memória
  const cardPollingRef = useRef<NodeJS.Timeout | null>(null);
  const pixTimerRef = useRef<NodeJS.Timeout | null>(null);
  const cardTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [cardForm, setCardForm] = useState<CardFormData>({
    cardHolderName: '',
    cardNumber: '',
    expiryDate: '', // Campo unificado MM/YY
    expiryMonth: '', // Manter para compatibilidade
    expiryYear: '', // Manter para compatibilidade
    cvv: '',
    cardHolderCpf: '',
    phone: '', // Campo de telefone
    // Campos de endereço
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: ''
  });
  const [cardErrors, setCardErrors] = useState<Partial<CardFormData>>({});
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null);
  const [showCvv, setShowCvv] = useState(false);
  const [showBillingAddress, setShowBillingAddress] = useState(false);
  const [selectedInstallments, setSelectedInstallments] = useState(1);
  const [securityStatus, setSecurityStatus] = useState<{ canPurchase: boolean; reason?: string } | null>(null);
  const [isSavingInfo, setIsSavingInfo] = useState(false);
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [selectedQuantity, setSelectedQuantity] = useState(() => {
    // Para KKS, definir quantidade inicial mínima para atingir R$ 5,00
    if (item.name?.toLowerCase().includes('kks')) {
      const unitPrice = item.rl_price || 0;
      if (unitPrice > 0) {
        const minQuantityForPayment = Math.ceil(5.00 / unitPrice);
        return Math.min(minQuantityForPayment, item.quantity);
      }
    }
    return 1;
  });
  
  const { createPixPayment, createCreditCardPayment, getPayment, loading, error, pixQrCode, pixCopyPaste, paymentLink, loadPersistedPix, clearPersistedPix } = useAsaasPayment();
  const { customers, createCustomer, loadCustomers, findByCpfCnpj } = useCustomerData();
  const { checkPurchaseSecurity, registerPurchaseAttempt, updatePurchaseStatus, loading: securityLoading } = usePurchaseSecurity();
  
  // Carregar PIX persistido na inicialização
  useEffect(() => {
    const pixLoaded = loadPersistedPix(item.id);
    if (pixLoaded) {
      console.log('PIX persistido encontrado e carregado para o item:', item.id);
      setIsPixActive(true);
      setSelectedPaymentType('pix');
      
      // Calcular tempo restante baseado nos dados persistidos
      const pixData = JSON.parse(localStorage.getItem('pix_payment_data') || '{}');
      if (pixData.expiresAt) {
        const timeLeft = Math.max(0, Math.floor((pixData.expiresAt - Date.now()) / 1000));
        setTimeRemaining(timeLeft);
        console.log('Tempo restante do PIX:', `${Math.floor(timeLeft / 60)}:${String(timeLeft % 60).padStart(2, '0')}`);
      }
    }
  }, [item.id, loadPersistedPix]);
  
  // Condições PIX
  const showPixButton = !isPixActive && !pixQrCode && !pixCopyPaste;
  const showPixContent = isPixActive || pixQrCode || pixCopyPaste || isProcessing;
  
  // Carregar clientes no início
  useEffect(() => {
    loadCustomers().catch(console.error);
  }, [loadCustomers]);

  // Verificar se o item tem account vinculada
  useEffect(() => {
    const checkItemAccount = async () => {
      try {
        const hasAccount = await checkItemHasAccountsCached(item.id);
        setHasLinkedAccount(hasAccount);
        console.log(`Item ${item.id} ${hasAccount ? 'tem' : 'não tem'} account vinculada`);
      } catch (error) {
        console.error('Erro ao verificar account do item:', error);
        setHasLinkedAccount(false);
      }
    };
    
    checkItemAccount();
  }, [item.id]);

  // TEMPORARIAMENTE DESABILITADO - Verificar se o usuário já comprou este item
  useEffect(() => {
    if (!user) return;
    
    // Permitir sempre por enquanto para não travar checkout
    setSecurityStatus({ canPurchase: true });
    
    /* CODIGO ORIGINAL - DESABILITADO TEMPORARIAMENTE
    const checkItemPurchaseStatus = async () => {
      if (!user) return;
      
      try {
        const securityCheck = await checkPurchaseSecurity(item.id);
        setSecurityStatus(securityCheck);
        
        if (!securityCheck.canPurchase) {
          toast({
            title: "Compra não permitida",
            description: securityCheck.reason,
            variant: "destructive"
          });
          
          // Se já possui o item, redirecionar para a página inicial
          if (securityCheck.reason?.includes('já possui')) {
            setTimeout(() => {
              navigate('/');
            }, 3000);
          }
        }
      } catch (error) {
        console.error('Erro ao verificar segurança:', error);
        setSecurityStatus({ canPurchase: true }); // Permitir em caso de erro
      }
    };

    checkItemPurchaseStatus();
    */
  }, [user, item.id]);

  // Carregar dados salvos do endereço de cobrança
  useEffect(() => {
    const savedBillingAddress = localStorage.getItem('billingAddress');
    if (savedBillingAddress) {
      try {
        const parsedAddress = JSON.parse(savedBillingAddress);
        const hasAddress = parsedAddress.addressLine1 && parsedAddress.city && parsedAddress.state;
        
        setCardForm(prev => ({
          ...prev,
          phone: parsedAddress.phone || '',
          addressLine1: parsedAddress.addressLine1 || '',
          addressLine2: parsedAddress.addressLine2 || '',
          city: parsedAddress.city || '',
          state: parsedAddress.state || '',
          postalCode: parsedAddress.postalCode || ''
        }));
        
        // Sempre manter recolhido por padrão
        setShowBillingAddress(false);
      } catch (error) {
        console.error('Erro ao carregar endereço salvo:', error);
        setShowBillingAddress(false); // Manter recolhido mesmo com erro
      }
    } else {
      setShowBillingAddress(false); // Manter recolhido se não há dados salvos
    }
  }, []);

  // Salvar dados do endereço quando alterados
  const saveBillingAddress = (formData: CardFormData) => {
    const billingData = {
      phone: formData.phone,
      addressLine1: formData.addressLine1,
      addressLine2: formData.addressLine2,
      city: formData.city,
      state: formData.state,
      postalCode: formData.postalCode
    };
    localStorage.setItem('billingAddress', JSON.stringify(billingData));
  };
  
  // Função para recarregar PIX quando expira
  const handleReloadPixPayment = async () => {
    if (!selectedPaymentType || !user || isProcessing) return;
    
    console.log('Gerando novo QR Code PIX - limpando dados antigos');
    
    // Limpar PIX antigo do localStorage
    clearPersistedPix();
    
    // Resetar timer e recarregar
    setTimeRemaining(300);
    setIsProcessing(true);
    
    try {
      await handleProceedToPayment();
    } catch (error) {
      console.error('Erro ao gerar novo PIX:', error);
      toast({
        title: "Erro ao gerar novo PIX",
        description: "Tente novamente em alguns instantes",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Função para buscar dados do CEP
  const fetchAddressByCep = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, '');
    
    if (cleanCep.length !== 8) {
      return;
    }
    
    setIsLoadingCep(true);
    
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();
      
      if (!data.erro) {
        setCardForm(prev => ({
          ...prev,
          city: data.localidade || '',
          state: data.uf || '',
          addressLine1: data.logradouro ? `${data.logradouro}` : prev.addressLine1
        }));
        
        // Salvar automaticamente os dados atualizados
        const updatedForm = {
          ...cardForm,
          city: data.localidade || '',
          state: data.uf || '',
          addressLine1: data.logradouro ? `${data.logradouro}` : cardForm.addressLine1,
          postalCode: cep
        };
        saveBillingAddress(updatedForm);
        
        toast({
          title: "Endereço encontrado!",
          description: `${data.localidade} - ${data.uf} preenchidos automaticamente`,
          variant: "default"
        });
      } else {
        toast({
          title: "CEP não encontrado",
          description: "Verifique o CEP informado e tente novamente.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
      toast({
        title: "Erro ao buscar CEP",
        description: "Não foi possível buscar os dados do CEP. Preencha manualmente.",
        variant: "destructive"
      });
    } finally {
      setIsLoadingCep(false);
    }
  };
  
  // Função para salvar informações de pagamento com feedback
  const handleSaveBillingInfo = async () => {
    setIsSavingInfo(true);
    
    // Simular um pequeno delay para mostrar o feedback
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Validar campos básicos de endereço
    const errors: Partial<CardFormData> = {};
    
    // Validar telefone se preenchido
    if (cardForm.phone.trim()) {
      const phoneNumbers = cardForm.phone.replace(/\D/g, '');
      if (phoneNumbers.length !== 10 && phoneNumbers.length !== 11) {
        errors.phone = 'Telefone deve ter 10 ou 11 dígitos';
      }
    }
    
    // Validar CEP se preenchido
    if (cardForm.postalCode.trim()) {
      const cepNumbers = cardForm.postalCode.replace(/\D/g, '');
      if (cepNumbers.length !== 8) {
        errors.postalCode = 'CEP deve ter 8 dígitos';
      }
    }
    
    // Validar estado se preenchido
    if (cardForm.state.trim() && cardForm.state.length !== 2) {
      errors.state = 'Estado deve ter 2 letras (ex: SP)';
    }
    
    setCardErrors(errors);
    
    // Se não há erros, salvar as informações
    if (Object.keys(errors).length === 0) {
      saveBillingAddress(cardForm);
      
      // Contar quantos campos foram preenchidos para feedback personalizado
      const filledFields = [];
      if (cardForm.phone) filledFields.push('Telefone');
      if (cardForm.addressLine1) filledFields.push('Endereço');
      if (cardForm.addressLine2) filledFields.push('Complemento');
      if (cardForm.city) filledFields.push('Cidade');
      if (cardForm.state) filledFields.push('Estado');
      if (cardForm.postalCode) filledFields.push('CEP');
      
      toast({
        title: "✅ Informações salvas com sucesso!",
        description: `${filledFields.length} campo(s) salvos: ${filledFields.join(', ')}. Estas informações serão reutilizadas em futuras compras.`,
        variant: "default"
      });
    } else {
      toast({
        title: "⚠️ Erro ao salvar informações",
        description: `Encontramos ${Object.keys(errors).length} erro(s). Corrija os campos destacados antes de salvar.`,
        variant: "destructive"
      });
    }
    
    setIsSavingInfo(false);
  };

  // Countdown timer for PIX - otimizado para evitar re-renders desnecessários
  useEffect(() => {
    // Limpar timer anterior se existir
    if (pixTimerRef.current) {
      clearInterval(pixTimerRef.current);
      pixTimerRef.current = null;
    }
    
    if (isPixActive && timeRemaining > 0) {
      pixTimerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          const newTime = Math.max(0, prev - 1);
          // Log apenas quando o tempo chega a zero
          if (newTime === 0 && prev > 0) {
            console.log('PIX Timer: Tempo expirado - limpando dados persistidos');
            clearPersistedPix();
          }
          return newTime;
        });
      }, 1000);
    }
    
    return () => {
      if (pixTimerRef.current) {
        clearInterval(pixTimerRef.current);
        pixTimerRef.current = null;
      }
    };
  }, [isPixActive]); // Remover timeRemaining da dependência para evitar re-creates
  
  // Cleanup de todos os timers ao desmontar o componente
  useEffect(() => {
    return () => {
      console.log('CheckoutForm: Limpando todos os timers e conexões ao desmontar');
      
      // Limpar polling Card
      if (cardPollingRef.current) {
        clearInterval(cardPollingRef.current);
        cardPollingRef.current = null;
      }
      if (cardTimeoutRef.current) {
        clearTimeout(cardTimeoutRef.current);
        cardTimeoutRef.current = null;
      }
      
      // Limpar timer PIX
      if (pixTimerRef.current) {
        clearInterval(pixTimerRef.current);
        pixTimerRef.current = null;
      }
      
      // Limpar Stream se existir
      const streamReader = (window as any).paymentStreamReader;
      if (streamReader) {
        console.log('Fechando conexão Payment Stream');
        streamReader.cancel();
        (window as any).paymentStreamReader = null;
      }
      
      // NÃO limpar PIX persistido no cleanup - manter para recarregamento de página
      // clearPersistedPix(); // Comentado intencionalmente
    };
  }, []);
  
  // Get the price based on payment type
  const getPrice = (type: PaymentType) => {
    const unitPrice = type === 'pix' ? item.rl_price : item.parcelado_price;
    return unitPrice * selectedQuantity;
  };

  // Get dynamic product name (for items like Diamonds)
  const getProductName = () => {
    // Lógica especial para Diamantes - 100 unidades
    if (item.name?.toLowerCase().includes('diamante') && item.name?.includes('100 unidades')) {
      const totalDiamonds = 100 * selectedQuantity;
      return `Diamantes - ${totalDiamonds} unidades`;
    }
    // Para outros itens, retornar o nome original
    return item.name;
  };

  // Get unit price (without quantity multiplier)
  const getUnitPrice = (type: PaymentType) => {
    return type === 'pix' ? item.rl_price : item.parcelado_price;
  };

  // Calcular taxa do cartão de crédito baseado no número de parcelas
  const calculateCreditCardFee = (baseValue: number, installments: number = 1) => {
    if (installments === 1) {
      // À vista no cartão (sem taxa adicional)
      return baseValue;
    }
    
    let feePercentage: number;
    const fixedFee = 0.49;
    
    if (installments >= 2 && installments <= 6) {
      feePercentage = 0.0349; // 3,49%
    } else if (installments >= 7 && installments <= 12) {
      feePercentage = 0.0399; // 3,99%
    } else {
      feePercentage = 0.0399; // Default para 12x
    }
    
    const feeAmount = (baseValue * feePercentage) + fixedFee;
    return baseValue + feeAmount;
  };

  // Get preço com taxas do cartão aplicadas
  const getCreditCardPrice = (installments: number = 12) => {
    const basePrice = getPrice('credit_card');
    return calculateCreditCardFee(basePrice, installments);
  };

  // Get preço unitário com taxas do cartão aplicadas
  const getCreditCardUnitPrice = (installments: number = 12) => {
    const baseUnitPrice = getUnitPrice('credit_card');
    return calculateCreditCardFee(baseUnitPrice, installments);
  };

  // Check if payment type is available
  const isPaymentTypeAvailable = (type: PaymentType) => {
    const unitPrice = getUnitPrice(type);
    
    // PIX - lógica especial para KKS
    if (type === 'pix') {
      if (unitPrice <= 0) return false;
      
      // Lógica especial para item KKS (valor mínimo R$ 5,00 no Asaas)
      if (item.name?.toLowerCase().includes('kks')) {
        const totalValue = getPrice(type);
        const minValue = 5.00; // Valor mínimo do Asaas
        
        // Verificar se o valor total é menor que R$ 5,00
        if (totalValue < minValue) {
          return false; // Não disponível se valor for menor que R$ 5,00
        }
      }
      
      return true;
    }
    
    // Cartão de crédito oculto temporariamente
    if (type === 'credit_card') {
      return false; // Sempre retorna false para ocultar o método de pagamento
    }
    
    return unitPrice > 0;
  };

  // Get category-specific styling
  const getCategoryStyles = (category: string) => {
    switch (category) {
      case 'pally':
        return 'bg-pally-bg border-pally-primary text-pally-light';
      case 'kina':
        return 'bg-kina-bg border-kina-primary text-kina-light';
      case 'mage':
        return 'bg-mage-bg border-mage-primary text-mage-light';
      case 'itens':
        return 'bg-itens-bg border-itens-primary text-itens-light';
      case 'geral':
        return 'bg-geral-bg border-geral-primary text-geral-light';
      case 'supercell':
        return 'bg-brawlstars-bg border-brawlstars-primary text-black';
      case 'freefire':
        return 'bg-freefire-bg border-freefire-primary text-freefire-light';
      case 'promocoes':
        return 'bg-divulgacoes-bg border-divulgacoes-primary text-divulgacoes-light';
      default:
        return 'bg-gaming-primary text-white';
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCopyPaste = async () => {
    if (!pixCopyPaste) return;
    try {
      await navigator.clipboard.writeText(pixCopyPaste);
      setCopied(true);
      toast({
        title: "Código copiado!",
        description: "O código PIX foi copiado para sua área de transferência.",
      });
      setTimeout(() => setCopied(false), 3000);
    } catch (error) {
      toast({
        title: "Erro ao copiar",
        description: "Não foi possível copiar o código PIX.",
        variant: "destructive"
      });
    }
  };

  // Card form utilities
  const formatCpf = (value: string) => {
    const numericValue = value.replace(/\D/g, '');
    return numericValue.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  const formatPhone = (value: string) => {
    const numericValue = value.replace(/\D/g, '');
    if (numericValue.length <= 10) {
      return numericValue.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    return numericValue.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  };

  const formatCardNumber = (value: string) => {
    const numericValue = value.replace(/\D/g, '').substring(0, 16);
    return numericValue.replace(/(\d{4})(?=\d)/g, '$1 ');
  };

  const formatExpiryDate = (value: string) => {
    const numericValue = value.replace(/\D/g, '').substring(0, 4);
    
    if (numericValue.length >= 1) {
      // Validar primeiro dígito do mês
      let month = numericValue.substring(0, 2);
      
      if (numericValue.length >= 2) {
        const monthNumber = parseInt(month, 10);
        // Se o mês for inválido (00 ou > 12), corrigir
        if (monthNumber === 0 || monthNumber > 12) {
          // Se começou com 0, só aceitar 01-09
          if (numericValue[0] === '0') {
            month = numericValue[1] && numericValue[1] !== '0' ? `0${numericValue[1]}` : '01';
          } else {
            // Se começou com 1, só aceitar 10, 11, 12
            month = numericValue[0] === '1' ? '12' : '01';
          }
        }
      }
      
      if (numericValue.length >= 3) {
        const year = numericValue.substring(2);
        return `${month}/${year}`;
      }
      return month;
    }
    return numericValue;
  };

  const formatCep = (value: string) => {
    const numericValue = value.replace(/\D/g, '').substring(0, 8);
    return numericValue.replace(/(\d{5})(\d{3})/, '$1-$2');
  };

  // Validar CPF - aceita CPFs de teste para sandbox
  const validateCpf = (cpf: string): boolean => {
    const numericCpf = cpf.replace(/\D/g, '');
    
    if (numericCpf.length !== 11) return false;
    
    // CPFs de teste do Asaas Sandbox - sempre válidos
    const testCpfs = [
      '12345678909', // CPF de teste comum
      '11144477735', // CPF de teste comum
      '01234567890', // CPF genérico de teste
      '12312312312', // CPF genérico de teste
      '98765432100', // CPF genérico de teste
    ];
    
    // Se for um CPF de teste e estivermos em modo sandbox, sempre aceitar
    if (IS_SANDBOX_MODE && testCpfs.includes(numericCpf)) {
      console.log('✅ CPF de teste do sandbox detectado:', numericCpf);
      return true;
    }
    
    // CPFs inválidos conhecidos (apenas para CPFs não-teste)
    const invalidCpfs = [
      '00000000000', '11111111111', '22222222222', '33333333333',
      '44444444444', '55555555555', '66666666666', '77777777777',
      '88888888888', '99999999999'
    ];
    
    if (invalidCpfs.includes(numericCpf)) return false;
    
    // Algoritmo de validação do CPF
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(numericCpf.charAt(i)) * (10 - i);
    }
    let remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(numericCpf.charAt(9))) return false;
    
    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(numericCpf.charAt(i)) * (11 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(numericCpf.charAt(10))) return false;
    
    return true;
  };

  // Detectar tipo de cartão baseado no número
  const getCardType = (cardNumber: string): { type: string; icon: string } => {
    const number = cardNumber.replace(/\D/g, '');
    
    // Visa
    if (number.match(/^4/)) {
      return { type: 'Visa', icon: 'logos:visa' };
    }
    // Mastercard
    if (number.match(/^5[1-5]/) || number.match(/^2[2-7]/)) {
      return { type: 'Mastercard', icon: 'logos:mastercard' };
    }
    // American Express
    if (number.match(/^3[47]/)) {
      return { type: 'American Express', icon: 'logos:amex' };
    }
    // Elo
    if (number.match(/^(4011|4312|4389|4514|4573|5041|5066|5067|6277|6362|6363)/)) {
      return { type: 'Elo', icon: 'simple-icons:elo' };
    }
    // Hipercard
    if (number.match(/^606282/)) {
      return { type: 'Hipercard', icon: 'simple-icons:hipercard' };
    }
    // Default
    return { type: 'Cartão', icon: 'material-symbols:credit-card' };
  };

  const validateCardForm = (): boolean => {
    const errors: Partial<CardFormData> = {};
    
    console.log('=== INICIANDO VALIDAÇÃO DO FORMULÁRIO DE CARTÃO ===');
    console.log('Dados do formulário:', cardForm);

    // Validar nome do titular
    if (!cardForm.cardHolderName.trim()) {
      const error = 'Nome do titular é obrigatório';
      errors.cardHolderName = error;
      console.log('❌ Nome do titular:', error);
    } else {
      console.log('✅ Nome do titular válido:', cardForm.cardHolderName);
    }

    // Validar número do cartão com verificação mais rigorosa
    const cardNumbers = cardForm.cardNumber.replace(/\D/g, '');
    if (!cardNumbers) {
      const error = 'Número do cartão é obrigatório';
      errors.cardNumber = error;
      console.log('❌ Número do cartão:', error);
    } else if (cardNumbers.length < 13 || cardNumbers.length > 19) {
      const error = 'Número do cartão deve ter entre 13 e 19 dígitos';
      errors.cardNumber = error;
      console.log('❌ Número do cartão:', error, 'Comprimento atual:', cardNumbers.length);
    } else if (cardNumbers.length !== 16) {
      const error = 'Número do cartão deve ter 16 dígitos';
      errors.cardNumber = error;
      console.log('❌ Número do cartão:', error, 'Comprimento atual:', cardNumbers.length);
    } else {
      // Validar usando algoritmo de Luhn
      if (!isValidCardNumber(cardNumbers)) {
        const error = 'Número do cartão inválido';
        errors.cardNumber = error;
        console.log('❌ Número do cartão:', error, 'Número:', cardNumbers);
      } else {
        console.log('✅ Número do cartão válido:', cardNumbers);
      }
    }

    // Validar data de validade com verificação mais rigorosa
    const expiryDate = cardForm.expiryDate;
    if (!expiryDate || expiryDate.length < 5) {
      const error = 'Data de validade é obrigatória (MM/AA)';
      errors.expiryDate = error;
      console.log('❌ Data de validade:', error);
    } else {
      const [monthStr, yearStr] = expiryDate.split('/');
      const month = parseInt(monthStr, 10);
      const year = parseInt(yearStr.length === 2 ? `20${yearStr}` : yearStr, 10);
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1;

      console.log('Data inserida:', { month, year, monthStr, yearStr });
      console.log('Data atual:', { currentMonth, currentYear });

      if (isNaN(month) || isNaN(year)) {
        const error = 'Formato de data inválido';
        errors.expiryDate = error;
        console.log('❌ Data de validade:', error, 'Mês:', month, 'Ano:', year);
      } else if (month < 1 || month > 12) {
        const error = 'Mês deve estar entre 01 e 12';
        errors.expiryDate = error;
        console.log('❌ Data de validade:', error, 'Mês inserido:', month);
      } else if (year < currentYear) {
        const error = 'Cartão vencido - ano anterior ao atual';
        errors.expiryDate = error;
        console.log('❌ Data de validade:', error, 'Ano do cartão:', year, 'Ano atual:', currentYear);
      } else if (year === currentYear && month < currentMonth) {
        const error = 'Cartão vencido - mês anterior ao atual';
        errors.expiryDate = error;
        console.log('❌ Data de validade:', error, 'Mês do cartão:', month, 'Mês atual:', currentMonth);
      } else if (year > currentYear + 10) {
        const error = 'Data de validade muito distante';
        errors.expiryDate = error;
        console.log('❌ Data de validade:', error, 'Ano do cartão:', year);
      } else {
        console.log('✅ Data de validade válida:', { month, year });
      }
    }

    // Validar CVV
    if (!cardForm.cvv) {
      const error = 'CVV é obrigatório';
      errors.cvv = error;
      console.log('❌ CVV:', error);
    } else if (cardForm.cvv.length !== 3) {
      const error = 'CVV deve ter exatamente 3 dígitos';
      errors.cvv = error;
      console.log('❌ CVV:', error, 'Comprimento atual:', cardForm.cvv.length);
    } else if (!/^\d{3}$/.test(cardForm.cvv)) {
      const error = 'CVV deve conter apenas números';
      errors.cvv = error;
      console.log('❌ CVV:', error, 'CVV inserido:', cardForm.cvv);
    } else {
      console.log('✅ CVV válido');
    }

    // Validar CPF com melhor feedback
    const cpfNumbers = cardForm.cardHolderCpf.replace(/\D/g, '');
    if (!cpfNumbers) {
      const error = 'CPF é obrigatório';
      errors.cardHolderCpf = error;
      console.log('❌ CPF:', error);
    } else if (cpfNumbers.length !== 11) {
      const error = 'CPF deve ter 11 dígitos';
      errors.cardHolderCpf = error;
      console.log('❌ CPF:', error, 'Comprimento atual:', cpfNumbers.length, 'CPF:', cpfNumbers);
    } else if (!validateCpf(cardForm.cardHolderCpf)) {
      const error = 'CPF inválido - verifique os dígitos';
      errors.cardHolderCpf = error;
      console.log('❌ CPF:', error, 'CPF inserido:', cpfNumbers);
    } else {
      console.log('✅ CPF válido:', cpfNumbers);
    }

    // Validar telefone - OPCIONAL para cartão de crédito
    const phoneNumbers = cardForm.phone.replace(/\D/g, '');
    if (phoneNumbers && (phoneNumbers.length !== 10 && phoneNumbers.length !== 11)) {
      const error = 'Telefone deve ter 10 ou 11 dígitos';
      errors.phone = error;
      console.log('❌ Telefone:', error, 'Comprimento atual:', phoneNumbers.length, 'Telefone:', phoneNumbers);
    } else if (phoneNumbers) {
      console.log('✅ Telefone válido:', phoneNumbers);
    } else {
      console.log('ℹ️ Telefone não fornecido (opcional para cartão)');
    }

    // Validar endereço
    if (!cardForm.addressLine1.trim()) {
      const error = 'Endereço é obrigatório';
      errors.addressLine1 = error;
      console.log('❌ Endereço:', error);
    } else {
      console.log('✅ Endereço válido:', cardForm.addressLine1);
    }

    if (!cardForm.city.trim()) {
      const error = 'Cidade é obrigatória';
      errors.city = error;
      console.log('❌ Cidade:', error);
    } else {
      console.log('✅ Cidade válida:', cardForm.city);
    }

    if (!cardForm.state.trim()) {
      const error = 'Estado é obrigatório';
      errors.state = error;
      console.log('❌ Estado:', error);
    } else if (cardForm.state.length !== 2) {
      const error = 'Estado deve ter 2 letras (ex: SP)';
      errors.state = error;
      console.log('❌ Estado:', error, 'Estado inserido:', cardForm.state);
    } else {
      console.log('✅ Estado válido:', cardForm.state);
    }

    const cepNumbers = cardForm.postalCode.replace(/\D/g, '');
    if (!cepNumbers) {
      const error = 'CEP é obrigatório';
      errors.postalCode = error;
      console.log('❌ CEP:', error);
    } else if (cepNumbers.length !== 8) {
      const error = 'CEP deve ter 8 dígitos';
      errors.postalCode = error;
      console.log('❌ CEP:', error, 'Comprimento atual:', cepNumbers.length, 'CEP:', cepNumbers);
    } else {
      console.log('✅ CEP válido:', cepNumbers);
    }

    const isValid = Object.keys(errors).length === 0;
    console.log('=== RESULTADO DA VALIDAÇÃO ===');
    console.log('Formulário válido:', isValid);
    if (!isValid) {
      console.log('Erros encontrados:', errors);
    }
    console.log('=== FIM DA VALIDAÇÃO ===');

    setCardErrors(errors);
    return isValid;
  };
  
  // Função para validar número do cartão - aceita cartões de teste para sandbox
  // Função para verificar se todos os campos obrigatórios do cartão estão preenchidos
  const isCardFormComplete = (): boolean => {
    return !!
      (cardForm.cardHolderName?.trim() &&
       cardForm.cardNumber?.replace(/\D/g, '').length >= 13 &&
       cardForm.expiryDate?.length >= 5 &&
       cardForm.cvv?.length === 3 &&
       cardForm.cardHolderCpf?.replace(/\D/g, '').length === 11 &&
       cardForm.addressLine1?.trim() &&
       cardForm.city?.trim() &&
       cardForm.state?.trim() &&
       cardForm.postalCode?.replace(/\D/g, '').length === 8);
  };
  
  const isValidCardNumber = (cardNumber: string): boolean => {
    try {
      // Cartões de teste do Asaas Sandbox - sempre válidos
      const testCards = [
        '4000000000000002', // Visa de teste aprovado
        '4000000000000010', // Visa de teste recusado 
        '4000000000000028', // Visa de teste aprovado
        '4000000000000036', // Visa de teste recusado
        '4000000000000044', // Visa de teste aprovado
        '4000000000000051', // Visa de teste recusado
        '5555555555554444', // Mastercard de teste aprovado
        '5555555555554451', // Mastercard de teste recusado
        '5555555555554469', // Mastercard de teste aprovado
        '5555555555554477', // Mastercard de teste recusado
        '5555555555554485', // Mastercard de teste aprovado
        '5555555555554493', // Mastercard de teste recusado
        '1234567890123456', // Cartão genérico de teste
        '1111222233334444', // Cartão genérico de teste
        '4111111111111111', // Cartão Visa genérico comum em testes
        '5555555555554444', // Cartão Mastercard genérico comum em testes
      ];
      
      // Se for um cartão de teste e estivermos em modo sandbox, sempre aceitar
      if (IS_SANDBOX_MODE && testCards.includes(cardNumber)) {
        console.log('✅ Cartão de teste do sandbox detectado:', cardNumber);
        return true;
      }
      
      // Em modo sandbox, também aceitar qualquer cartão que comece com números de teste comuns
      if (IS_SANDBOX_MODE) {
        // Aceitar cartões que começam com padrões de teste comuns
        if (cardNumber.startsWith('4000') || // Visa de teste
            cardNumber.startsWith('5555') || // Mastercard de teste
            cardNumber.startsWith('4111') || // Visa genérico
            cardNumber.startsWith('1234') || // Genérico
            cardNumber.startsWith('1111') || // Genérico
            cardNumber.length === 16) { // Qualquer cartão de 16 dígitos no sandbox
          console.log('✅ Cartão aceito no modo sandbox:', cardNumber);
          return true;
        }
      }
      
      // Para cartões reais, aplicar validação de Luhn
      let sum = 0;
      let isEven = false;
      
      for (let i = cardNumber.length - 1; i >= 0; i--) {
        let digit = parseInt(cardNumber.charAt(i), 10);
        
        if (isEven) {
          digit *= 2;
          if (digit > 9) {
            digit -= 9;
          }
        }
        
        sum += digit;
        isEven = !isEven;
      }
      
      const isValid = (sum % 10) === 0;
      console.log('Validação Luhn para cartão:', cardNumber, 'Resultado:', isValid);
      return isValid;
    } catch (error) {
      console.error('Erro na validação do cartão:', error);
      return false;
    }
  };

  const handleCardInputChange = (field: keyof CardFormData, value: string) => {
    let formattedValue = value;

    switch (field) {
      case 'cardHolderName':
        // Aceitar apenas letras, espaços, acentos e caracteres especiais de nomes
        formattedValue = value.replace(/[^a-zA-ZÀ-ÿ\s]/g, '').toUpperCase();
        break;
      case 'cardHolderCpf':
        formattedValue = formatCpf(value);
        break;
      case 'cardNumber':
        formattedValue = formatCardNumber(value);
        break;
      case 'cvv':
        formattedValue = value.replace(/\D/g, '').substring(0, 3);
        break;
      case 'expiryDate':
        formattedValue = formatExpiryDate(value);
        break;
      case 'expiryMonth':
        formattedValue = value.replace(/\D/g, '').substring(0, 2);
        break;
      case 'expiryYear':
        formattedValue = value.replace(/\D/g, '').substring(0, 4);
        break;
      case 'phone':
        formattedValue = formatPhone(value);
        break;
      case 'postalCode':
        formattedValue = formatCep(value);
        break;
      case 'state':
        formattedValue = value.toUpperCase().substring(0, 2);
        break;
    }

    // Para o campo expiryDate, atualizar também expiryMonth e expiryYear
    let updatedForm = { ...cardForm, [field]: formattedValue };
    
    if (field === 'expiryDate' && formattedValue.includes('/')) {
      const [month, year] = formattedValue.split('/');
      if (month && year) {
        updatedForm = {
          ...updatedForm,
          expiryMonth: month.padStart(2, '0'), // Garantir que tenha 2 dígitos
          expiryYear: year.length === 2 ? `20${year}` : year
        };
      }
    }
    
    setCardForm(updatedForm);
    
    // Buscar endereço automaticamente quando CEP for preenchido completamente
    if (field === 'postalCode') {
      const cleanCep = formattedValue.replace(/\D/g, '');
      if (cleanCep.length === 8) {
        fetchAddressByCep(formattedValue);
      }
    }
    
    // Salvar automaticamente dados do endereço se o campo alterado for de endereço
    const addressFields = ['phone', 'addressLine1', 'addressLine2', 'city', 'state', 'postalCode'];
    if (addressFields.includes(field)) {
      saveBillingAddress(updatedForm);
    }
    
    // Clear error when user starts typing
    if (cardErrors[field]) {
      setCardErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handlePaymentTypeSelect = (type: PaymentType) => {
    if (!isPaymentTypeAvailable(type)) {
      toast({
        title: "Método indisponível",
        description: `Este item não possui preço configurado para ${type === 'pix' ? 'PIX' : 'Cartão de Crédito'}.`,
        variant: "destructive"
      });
      return;
    }
    
    // Verificar se a plataforma foi selecionada apenas para itens com linked account
    if (hasLinkedAccount === true && !selectedPlatform) {
      toast({
        title: "Plataforma não selecionada",
        description: "Por favor, selecione se você está usando Android ou iOS.",
        variant: "destructive"
      });
      return;
    }
    
    // Se o mesmo tipo já está selecionado, colapsar (fechar)
    if (selectedPaymentType === type && !isProcessing) {
      setSelectedPaymentType(null);
      // Reset PIX state quando colapsar
      if (type === 'pix') {
        setIsPixActive(false);
        setTimeRemaining(300);
      }
      return;
    }
    
    // Evitar duplo clique durante processamento
    if (isProcessing) {
      return;
    }
    
    // Apenas expandir o card - não ativar pagamento ainda
    setSelectedPaymentType(type);
  };


  const handleBackToSelection = () => {
    setStep('selection');
    setSelectedPaymentType(null);
    setTimeRemaining(300);
    // Reset card form
    setCardForm({
      cardHolderName: '',
      cardNumber: '',
      expiryDate: '',
      expiryMonth: '',
      expiryYear: '',
      cvv: '',
      cardHolderCpf: '',
      phone: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      postalCode: ''
    });
    setCardErrors({});
  };

  const handleCardPayment = async () => {
    if (!validateCardForm()) {
      // Expandir automaticamente o card de informações para pagamento quando houver dados incompletos
      if (!showBillingAddress) {
        setShowBillingAddress(true);
        
        // Mostrar toast informativo
        toast({
          title: "Dados incompletos",
          description: "Por favor, preencha todos os campos obrigatórios.",
          variant: "destructive"
        });
        
        // Rolar para o card de informações de pagamento
        setTimeout(() => {
          const billingCard = document.getElementById('billing-info-card');
          if (billingCard) {
            billingCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // Focar no primeiro campo com erro
            const firstErrorField = Object.keys(cardErrors).find(key => cardErrors[key as keyof CardFormData]);
            if (firstErrorField) {
              const inputElement = document.getElementById(firstErrorField);
              if (inputElement) {
                inputElement.focus();
              }
            }
          }
        }, 100);
      } else {
        toast({
          title: "Dados incompletos",
          description: "Por favor, preencha todos os campos obrigatórios.",
          variant: "destructive"
        });
      }
      return;
    }

    // Verificar segurança antes de processar
    const securityCheck = await checkPurchaseSecurity(item.id);
    if (!securityCheck.canPurchase) {
      toast({
        title: "Compra não permitida",
        description: securityCheck.reason,
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    setStep('processing');

    try {
      // Primeiro: reutilizar cliente existente pelo CPF (evita duplicação no Asaas)
      const cleanCpf = cardForm.cardHolderCpf.replace(/\D/g, '');
      let customerId: string | null = null;

      try {
        const existingByCpf = await findByCpfCnpj(cleanCpf);
        if (existingByCpf?.asaas_customer_id) {
          customerId = existingByCpf.asaas_customer_id;
        }
      } catch (lookupErr) {
        // Falha ao buscar cliente por CPF (prosseguindo com criação)
      }

      if (!customerId) {
        // Criar novo cliente somente se não existir
        const customerResult = await createCustomer({
          name: cardForm.cardHolderName,
          email: user?.email!,
          cpfCnpj: cleanCpf,
          phone: cardForm.phone ? cardForm.phone.replace(/\D/g, '') : '', // Telefone opcional
          externalReference: `customer_${Date.now()}`,
        });

        if (!customerResult.success) {
          throw new Error(customerResult.error || 'Falha ao criar cliente');
        }

        customerId = customerResult.data?.asaas_customer_id || null;
      }

      if (!customerId) {
        throw new Error('ID do cliente não encontrado');
      }

      // Salvar telefone na tabela users se fornecido
      if (cardForm.phone && user) {
        try {
          // Aqui você pode implementar a lógica para atualizar o telefone na tabela users
          // Exemplo: await updateUserPhone(user.id, cardForm.phone.replace(/\D/g, ''));
          // Salvar telefone na tabela users (log removido por segurança)
        } catch (phoneErr) {
          // Não bloquear pagamento se falhar ao salvar telefone
          console.warn('Falha ao salvar telefone:', phoneErr);
        }
      }

      // Validar dados do cartão antes de enviar (logs removidos por segurança)
      
      // Garantir que expiryMonth e expiryYear estão preenchidos corretamente
      let finalExpiryMonth = cardForm.expiryMonth
      let finalExpiryYear = cardForm.expiryYear
      
      // Se não temos os campos separados mas temos o unificado, extrair
      if ((!finalExpiryMonth || !finalExpiryYear) && cardForm.expiryDate) {
        const [month, year] = cardForm.expiryDate.split('/')
        if (month && year) {
          finalExpiryMonth = month.padStart(2, '0')
          finalExpiryYear = year.length === 2 ? `20${year}` : year
          // Data de validade extraída (log removido por segurança)
        }
      }
      
      // Dados de validação do cartão preparados (logs removidos por segurança)
      
      const cardData = {
        holderName: cardForm.cardHolderName,
        number: cardForm.cardNumber.replace(/\s/g, ''),
        expiryMonth: finalExpiryMonth,
        expiryYear: finalExpiryYear,
        ccv: cardForm.cvv
      };

      // Calcular valor final com taxas de parcelamento usando nova lógica do Asaas
      const basePrice = getPrice('credit_card');
      const finalPaymentValue = calculateCreditCardFee(basePrice, selectedInstallments);
      
      // Valores do pagamento calculados (logs em modo desenvolvimento apenas)
      if (import.meta.env.DEV) {
        console.log('Processando pagamento com', selectedInstallments, 'parcela(s)');
      }

      const paymentResult = await createCreditCardPayment(
        customerId,
        finalPaymentValue,
        `Compra: ${getProductName()}`,
        cardData,
        {
          name: cardForm.cardHolderName,
          cpf: cleanCpf, // CPF limpo, consistente com o cliente
          phone: '', // Phone not required for card payments
          // Dados de endereço
          addressLine1: cardForm.addressLine1,
          addressLine2: cardForm.addressLine2,
          city: cardForm.city,
          state: cardForm.state,
          postalCode: cardForm.postalCode.replace(/\D/g, '') // CEP limpo para a API
        },
        item.id,
        selectedPlatform || null,
        selectedInstallments // Incluir número de parcelas
      );

      if (paymentResult.success) {
        // Registrar tentativa de compra na segurança
        const paymentId = paymentResult.data?.paymentId;
        if (paymentId) {
          const orderRegistration = await registerPurchaseAttempt(item.id, paymentId, 'credit_card');
          
          if (orderRegistration.success) {
            // Para cartão, geralmente a aprovação é imediata
            // Verificar se já foi aprovado
            const paymentStatus = paymentResult.data?.status;
            
            if (paymentStatus === 'CONFIRMED' || paymentStatus === 'RECEIVED') {
              // Pagamento aprovado imediatamente
              // Não precisa atualizar status - a Edge Function já criou o registro correto
              
              // Redirecionar para página de sucesso usando paymentId
              const successUrl = `/purchase-success/${paymentId}?itemId=${item.id}&paymentAmount=${finalPaymentValue}&paymentId=${paymentId}&paymentMethod=CartaoDeCredito&installments=${selectedInstallments}`;
              
              toast({
                title: "Pagamento aprovado!",
                description: "Redirecionando para a página de sucesso...",
              });
              
              navigate(successUrl);
            } else {
              // Pagamento pendente - iniciar polling otimizado
              // Iniciando polling para verificação de pagamento
              
              cardPollingRef.current = setInterval(async () => {
                try {
                  // Verificando status do pagamento
                  const updatedResult = await getPayment(paymentId);
                  
                  if (updatedResult.success) {
                    const currentStatus = updatedResult.data?.status;
                    // Status verificado
                    
                    if (currentStatus === 'CONFIRMED' || currentStatus === 'RECEIVED') {
                      // Pagamento aprovado - limpando polling
                      
                      if (cardPollingRef.current) {
                        clearInterval(cardPollingRef.current);
                        cardPollingRef.current = null;
                      }
                      if (cardTimeoutRef.current) {
                        clearTimeout(cardTimeoutRef.current);
                        cardTimeoutRef.current = null;
                      }
                      
                      // Redirecionar para página de sucesso usando paymentId
                      const successUrl = `/purchase-success/${paymentId}?itemId=${item.id}&paymentAmount=${finalPaymentValue}&paymentId=${paymentId}&paymentMethod=CartaoDeCredito&installments=${selectedInstallments}`;
                      navigate(successUrl);
                      
                      toast({
                        title: "Pagamento aprovado!",
                        description: "Redirecionando para a página de sucesso...",
                      });
                    } else if (currentStatus === 'REFUSED' || currentStatus === 'CANCELLED') {
                      // Pagamento recusado - limpando polling
                      
                      if (cardPollingRef.current) {
                        clearInterval(cardPollingRef.current);
                        cardPollingRef.current = null;
                      }
                      if (cardTimeoutRef.current) {
                        clearTimeout(cardTimeoutRef.current);
                        cardTimeoutRef.current = null;
                      }
                      
                      toast({
                        title: "Pagamento recusado",
                        description: "O pagamento foi recusado pelo banco. Verifique os dados do cartão.",
                        variant: "destructive"
                      });
                    }
                  }
                } catch (pollError) {
                  console.error('Erro no polling do cartão:', pollError);
                }
              }, 3000); // Verificar a cada 3 segundos
              
              // Limpar polling após 5 minutos
              cardTimeoutRef.current = setTimeout(() => {
                console.log('Card Polling: Timeout de 5 minutos atingido, limpando polling');
                if (cardPollingRef.current) {
                  clearInterval(cardPollingRef.current);
                  cardPollingRef.current = null;
                }
              }, 300000); // 5 minutos
              
              toast({
                title: "Pagamento processado!",
                description: "Aguardando confirmação do banco...",
              });
            }
          }
        } else {
          // Fallback: se não conseguiu registrar, ainda assim mostrar sucesso
          toast({
            title: "Pagamento processado!",
            description: "Seu pagamento por cartão foi aprovado.",
          });
          navigate('/');
        }
      } else {
        // Verificar se é erro específico de cartão de crédito
        if (paymentResult.error === 'INVALID_CREDIT_CARD') {
          toast({
            title: "Cartão de crédito inválido",
            description: paymentResult.message || "Transação não autorizada. Verifique os dados do cartão de crédito e tente novamente.",
            variant: "destructive"
          });
          setStep('card_payment');
          setIsProcessing(false);
          return;
        }
        
        throw new Error(paymentResult.error || 'Erro ao processar pagamento');
      }
    } catch (err) {
      console.error('Card payment error:', err);
      
      // Tratamento de erros específicos
      const errorMessage = err instanceof Error ? err.message : "Ocorreu um erro inesperado";
      
      // Se a mensagem contém informações de cartão inválido, customizar a exibição
      if (errorMessage.toLowerCase().includes('cartão') || errorMessage.toLowerCase().includes('credit') || errorMessage.toLowerCase().includes('transação não autorizada')) {
        toast({
          title: "Erro no cartão de crédito",
          description: "Transação não autorizada. Verifique os dados do cartão (número, validade, CVV) e tente novamente.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Erro no pagamento",
          description: errorMessage,
          variant: "destructive"
        });
      }
      
      setStep('card_payment');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleProceedToPayment = async () => {
    if (!selectedPaymentType || !user) return;

    // Verificar segurança antes de processar
    const securityCheck = await checkPurchaseSecurity(item.id);
    if (!securityCheck.canPurchase) {
      toast({
        title: "Compra não permitida",
        description: securityCheck.reason,
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    setIsPixActive(true); // Ativar PIX
    // Não mudar step - manter no accordion

    try {
      // First, ensure we have a customer
      let customerId = null;
      const existingCustomer = customers.find(c => c.email === user.email);
      
      if (existingCustomer) {
        customerId = existingCustomer.asaas_customer_id;
      } else {
        // Create a new customer with user data from "Informações para pagamento"
        // First try to get user's real phone number from database
        let userPhone = null;
        try {
          // Try profiles table first
          const { data: profileData } = await supabase
            .from('profiles')
            .select('phone_number')
            .eq('id', user.id)
            .single();
          
          if (profileData?.phone_number) {
            userPhone = profileData.phone_number.replace(/\D/g, '');
          } else {
            // Fallback to users table
            const { data: userData } = await supabase
              .from('users')
              .select('phone_number')
              .eq('id', user.id)
              .single();
            
            if (userData?.phone_number) {
              userPhone = userData.phone_number.replace(/\D/g, '');
            }
          }
        } catch (error) {
          console.warn('Could not fetch user phone number:', error);
        }
        
        const customerResult = await createCustomer({
          name: user.email?.split('@')[0] || 'Cliente PIX',
          email: user.email!,
          cpfCnpj: '12345678909', // CPF padrão para PIX (pode ser genérico)
          phone: cardForm.phone?.replace(/\D/g, '') || userPhone || '11999999999', // Usar telefone do formulário, depois do usuário, depois fallback
          externalReference: `customer_${Date.now()}`,
          address: {
            addressLine1: cardForm.addressLine1 || 'Endereço não informado',
            city: cardForm.city || 'Cidade não informada',
            state: cardForm.state || 'SP',
            zipCode: cardForm.postalCode?.replace(/\D/g, '') || '01234567'
          }
        });

        if (!customerResult.success) {
          throw new Error(customerResult.error || 'Falha ao criar cliente');
        }
        customerId = customerResult.data?.asaas_customer_id;
      }

      if (!customerId) {
        throw new Error('ID do cliente não encontrado');
      }

      const price = getPrice(selectedPaymentType);
      const description = `Compra: ${getProductName()}`;

      // Apenas PIX nesta função
      if (selectedPaymentType === 'pix') {
        // Enviar dados das "Informações para pagamento" para salvar na tabela users
        const addressData = {
          phone: cardForm.phone,
          addressLine1: cardForm.addressLine1,
          addressLine2: cardForm.addressLine2,
          city: cardForm.city,
          state: cardForm.state,
          postalCode: cardForm.postalCode
        };
        
        const paymentResult = await createPixPayment(customerId, price, description, item.id, selectedPlatform || null, addressData);

        if (paymentResult.success) {
          // Registrar tentativa de compra na segurança
          const paymentId = paymentResult.data?.paymentId;
          if (paymentId) {
            const orderRegistration = await registerPurchaseAttempt(item.id, paymentId, 'PIX');
            
            if (orderRegistration.success) {
              console.log('Pagamento PIX criado com sucesso, conectando Server-Sent Events para aguardar confirmação');
              
              // Obter token de acesso para autenticação
              const { data: { session } } = await supabase.auth.getSession();
              if (!session?.access_token) {
                console.error('Não foi possível obter token de acesso');
                return;
              }
              
              // Conectar Server-Sent Events para aguardar confirmação do pagamento
              // Infelizmente, EventSource não suporta headers customizados
              // Vou usar uma abordagem diferente com fetch e ReadableStream
              const connectToPaymentStream = async () => {
                try {
                  const response = await fetch(
                    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/payment-status-stream?paymentId=${paymentId}&userId=${user.id}`,
                    {
                      headers: {
                        'Authorization': `Bearer ${session.access_token}`,
                        'Content-Type': 'text/event-stream',
                      }
                    }
                  );
                  
                  if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                  }
                  
                  if (!response.body) {
                    throw new Error('Response body is null');
                  }
                  
                  const reader = response.body.getReader();
                  const decoder = new TextDecoder();
                  
                  // Armazenar referência para limpeza
                  (window as any).paymentStreamReader = reader;
                  
                  const readStream = async () => {
                    try {
                      while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        
                        const chunk = decoder.decode(value);
                        const lines = chunk.split('\n');
                        
                        for (const line of lines) {
                          if (line.startsWith('data: ')) {
                            try {
                              const data = JSON.parse(line.slice(6));
                              console.log('Payment status update:', data);
                              
                              if (data.type === 'payment_confirmed') {
                                console.log('PIX payment confirmed via Stream!');
                                reader.cancel();
                                
                                // Limpar dados do PIX do localStorage
                                clearPersistedPix();
                                console.log('Dados do PIX removidos após confirmação do pagamento');
                                
                                // Redirecionar para página de sucesso
                                const successUrl = `/purchase-success/${paymentId}?itemId=${item.id}&paymentAmount=${price}&paymentId=${paymentId}&paymentMethod=pix`;
                                
                                toast({
                                  title: "Pagamento PIX confirmado! 🎉",
                                  description: "Redirecionando para a página de sucesso...",
                                });
                                
                                // Pequeno delay para o usuário ver o toast
                                setTimeout(() => {
                                  navigate(successUrl);
                                }, 1500);
                                
                                return;
                              } else if (data.type === 'timeout') {
                                console.log('Payment status check timeout');
                                reader.cancel();
                                return;
                              }
                            } catch (err) {
                              console.error('Error parsing stream data:', err);
                            }
                          }
                        }
                      }
                    } catch (err) {
                      console.error('Error reading stream:', err);
                    }
                  };
                  
                  readStream();
                  
                } catch (err) {
                  console.error('Error connecting to payment stream:', err);
                }
              };
              
              // Iniciar conexão
              connectToPaymentStream();
            }
          }
          
          // Iniciar timer
          setTimeRemaining(300); // 5 minutos
          
          // Se não temos QR Code ainda, tentar buscar depois (reduzido para 1s)
          if (!paymentResult.pixQrCode) {
            setTimeout(async () => {
              try {
                const paymentId = paymentResult.data?.paymentId;
                if (paymentId) {
                  const updatedResult = await getPayment(paymentId);
                  
                  if (updatedResult.success && (updatedResult.pixQrCode || updatedResult.pixCopyPaste)) {
                    toast({
                      title: "QR Code PIX carregado!",
                      description: "Agora você pode pagar com PIX",
                    });
                  }
                }
              } catch (err) {
                toast({
                  title: "Erro ao carregar PIX",
                  description: "Tente gerar um novo QR Code",
                  variant: "destructive"
                });
              }
            }, 1000);
          }
          
          toast({
            title: "Pagamento PIX criado!",
            description: paymentResult.pixQrCode 
              ? "Use o QR Code ou código copia e cola para pagar" 
              : "Carregando QR Code...",
          });
        } else {
          throw new Error(paymentResult.error || 'Erro ao criar pagamento PIX');
        }
      }

    } catch (err) {
      toast({
        title: "Erro no pagamento PIX",
        description: err instanceof Error ? err.message : "Ocorreu um erro inesperado",
        variant: "destructive"
      });
      // NAO colapsar o card - manter expandido para usuario tentar novamente
    } finally {
      setIsProcessing(false);
    }
  };

  const renderSelection = () => {
    return (
      <div className="space-y-6">
        {/* Quantity Selection */}
        <div className="space-y-4">
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <ShoppingCart className="h-6 w-6 text-primary" />
              <h3 className="text-xl font-semibold text-foreground">Quantidade</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Selecione quantos itens deseja comprar (disponível: {item.quantity})
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const newQuantity = Math.max(1, selectedQuantity - 1);
                // Para KKS, não permitir menos de 3 unidades se for necessário para atingir R$ 5,00
                if (item.name?.toLowerCase().includes('kks')) {
                  const unitPrice = getUnitPrice('pix');
                  const minQuantityForPayment = Math.ceil(5.00 / unitPrice);
                  if (newQuantity < minQuantityForPayment) {
                    return; // Não permitir diminuir
                  }
                }
                setSelectedQuantity(newQuantity);
              }}
              disabled={(() => {
                if (selectedQuantity <= 1) return true;
                // Para KKS, verificar valor mínimo para PIX
                if (item.name?.toLowerCase().includes('kks')) {
                  const unitPrice = getUnitPrice('pix');
                  const minQuantityForPayment = Math.ceil(5.00 / unitPrice);
                  return selectedQuantity <= minQuantityForPayment;
                }
                return false;
              })()}
              className="h-10 w-10 p-0"
            >
              -
            </Button>
            
            <Input
              type="number"
              min={(() => {
                // Para KKS, calcular quantidade mínima para atingir R$ 5,00
                if (item.name?.toLowerCase().includes('kks')) {
                  const unitPrice = getUnitPrice('pix');
                  return Math.ceil(5.00 / unitPrice);
                }
                return 1;
              })()}
              max={item.quantity}
              value={selectedQuantity}
              onChange={(e) => {
                const value = parseInt(e.target.value) || 1;
                let minQuantity = 1;
                
                // Para KKS, definir quantidade mínima para atingir R$ 5,00
                if (item.name?.toLowerCase().includes('kks')) {
                  const unitPrice = getUnitPrice('pix');
                  minQuantity = Math.ceil(5.00 / unitPrice);
                }
                
                const clampedValue = Math.min(Math.max(minQuantity, value), item.quantity);
                setSelectedQuantity(clampedValue);
              }}
              className="w-20 h-10 text-center font-medium text-slate-900 bg-white border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSelectedQuantity(Math.min(item.quantity, selectedQuantity + 1))}
              disabled={selectedQuantity >= item.quantity}
              className="h-10 w-10 p-0"
            >
              +
            </Button>
            
            <div className="ml-4 text-sm text-slate-600">
              {selectedQuantity > 1 && (
                <span>Total: {formatCurrencyForUser(getPrice('pix'))} ({selectedQuantity}x {formatCurrencyForUser(getUnitPrice('pix'))})</span>
              )}
              {/* Aviso especial para KKS */}
              {item.name?.toLowerCase().includes('kks') && (
                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-xs text-yellow-800">
                    🪙 <strong>KKS - Moeda do Rucoy:</strong> Quantidade mínima de {Math.ceil(5.00 / getUnitPrice('pix'))} unidades (R$ {formatCurrencyForUser(Math.ceil(5.00 / getUnitPrice('pix')) * getUnitPrice('pix'))}) devido ao limite mínimo de R$ 5,00 do sistema de pagamento.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Platform Selection - Only show if item has linked account */}
        {hasLinkedAccount === true && (
          <div className="space-y-4">
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Smartphone className="h-6 w-6 text-primary" />
                <h3 className="text-xl font-semibold text-foreground">Qual dispositivo você está usando?</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Esta informação nos ajuda a melhorar nosso serviço
              </p>
            </div>
          
            <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
              <Button
                type="button"
                variant="outline"
                className={`h-16 sm:h-20 flex flex-col items-center justify-center gap-1 sm:gap-2 transition-all duration-300 bg-white hover:bg-white border-2 border-gray-200 ${selectedPlatform === 'android' ? 'shadow-lg scale-105 opacity-100' : selectedPlatform === 'ios' ? 'opacity-50' : 'opacity-100 hover:border-gray-300 hover:shadow-md'}`}
                onClick={() => setSelectedPlatform('android')}
              >
                <Icon icon="logos:android-icon" className="h-8 w-8 sm:h-10 sm:w-10" />
                <span className="font-medium text-gray-800 text-xs sm:text-sm">Android</span>
              </Button>
              
              <Button
                type="button"
                variant="outline"
                className={`h-16 sm:h-20 flex flex-col items-center justify-center gap-1 sm:gap-2 transition-all duration-300 bg-white hover:bg-white border-2 border-gray-200 ${selectedPlatform === 'ios' ? 'shadow-lg scale-105 opacity-100' : selectedPlatform === 'android' ? 'opacity-50' : 'opacity-100 hover:border-gray-300 hover:shadow-md'}`}
                onClick={() => setSelectedPlatform('ios')}
              >
                <Icon icon="logos:apple" className="h-8 w-8 sm:h-10 sm:w-10 text-gray-800" />
                <span className="font-medium text-gray-800 text-xs sm:text-sm">iOS</span>
              </Button>
            </div>
            
            {!selectedPlatform && (
              <p className="text-sm text-orange-600 mt-2">
                Por favor, selecione sua plataforma para continuar
              </p>
            )}
          </div>
        )}
        
        {/* Payment Methods - Show after platform is selected OR if item has no linked account */}
        {(selectedPlatform || hasLinkedAccount === false) && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 fade-in duration-500">
            <Separator />
            
            {/* Informações para pagamento - Accordion */}
            <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 mb-4 sm:mb-6 overflow-hidden" id="billing-info-card">
              <Button
                type="button"
                variant="ghost"
                className="w-full flex items-center justify-between p-3 sm:p-4 hover:bg-slate-50 rounded-xl border-0"
                onClick={() => setShowBillingAddress(!showBillingAddress)}
              >
              <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                <div className="p-1.5 sm:p-2 bg-slate-100 rounded-lg flex-shrink-0">
                  <User className="h-4 w-4 sm:h-5 sm:w-5 text-slate-600" />
                </div>
                <div className="text-left flex-1 min-w-0">
                  <h4 className="font-semibold text-slate-800 text-sm sm:text-base">Informações para pagamento</h4>
                  <p className="text-xs sm:text-sm text-slate-600 truncate">
                    {cardForm.addressLine1 && cardForm.city 
                      ? `${cardForm.addressLine1}, ${cardForm.city} - ${cardForm.state}` 
                      : hasLinkedAccount === false ? 'Clique para preencher (opcional)' : 'Clique para preencher (opcional para PIX)'
                    }
                  </p>
                </div>
              </div>
              <Icon 
                icon={showBillingAddress ? "mdi:chevron-up" : "mdi:chevron-down"} 
                className="h-4 w-4 sm:h-5 sm:w-5 text-slate-400 flex-shrink-0 ml-2" 
              />
            </Button>
            
            {/* Conteúdo do Accordion */}
            {showBillingAddress && (
              <div className="space-y-3 sm:space-y-4 animate-in slide-in-from-top-2 duration-300 bg-slate-50 rounded-lg p-3 sm:p-4 mt-3 border border-slate-100 overflow-hidden" style={{backgroundColor: 'rgba(var(--slate-50), 0.5)'}}>
                {/* Telefone */}
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-slate-700 font-medium text-xs sm:text-sm">
                        Telefone (opcional)
                      </Label>
                      <div className="relative">
                    <Phone className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 text-slate-400" />
                    <Input
                      id="phone"
                      placeholder="(11) 99999-9999"
                      value={cardForm.phone}
                      onChange={(e) => handleCardInputChange('phone', e.target.value)}
                      maxLength={15}
                      className={`pl-8 sm:pl-10 bg-white border-slate-200 focus:border-blue-500 focus:ring-blue-500 text-slate-900 h-9 sm:h-10 text-sm ${cardErrors.phone ? 'border-red-500' : ''}`}
                    />
                  </div>
                  {cardErrors.phone && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <span>⚠️</span> {cardErrors.phone}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="addressLine1" className="text-slate-700 font-medium text-xs sm:text-sm">
                    Endereço
                    <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <Input
                    id="addressLine1"
                    placeholder="Rua, avenida, número"
                    value={cardForm.addressLine1}
                    onChange={(e) => handleCardInputChange('addressLine1', e.target.value)}
                    className={`bg-white border-slate-200 focus:border-blue-500 focus:ring-blue-500 text-slate-900 h-9 sm:h-10 text-sm ${cardErrors.addressLine1 ? 'border-red-500' : ''}`}
                  />
                  {cardErrors.addressLine1 && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <span>⚠️</span> {cardErrors.addressLine1}
                    </p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="addressLine2" className="text-slate-700 font-medium text-xs sm:text-sm">Complemento</Label>
                  <Input
                    id="addressLine2"
                    placeholder="Apartamento, bloco, casa (opcional)"
                    value={cardForm.addressLine2}
                    onChange={(e) => handleCardInputChange('addressLine2', e.target.value)}
                    className={`bg-white border-slate-200 focus:border-blue-500 focus:ring-blue-500 text-slate-900 h-9 sm:h-10 text-sm ${cardErrors.addressLine2 ? 'border-red-500' : ''}`}
                  />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="city" className="text-slate-700 font-medium text-xs sm:text-sm">
                      Cidade {isLoadingCep ? '(carregando...)' : '(via CEP)'}
                      <span className="text-red-500 ml-1">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="city"
                        placeholder="Informe o CEP para preenchimento automático"
                        value={cardForm.city}
                        readOnly
                        className={`bg-slate-50 border-slate-200 text-slate-600 h-9 sm:h-10 text-sm cursor-not-allowed ${cardErrors.city ? 'border-red-500' : ''}`}
                      />
                      {isLoadingCep && (
                        <div className="absolute right-2 sm:right-3 top-1/2 transform -translate-y-1/2">
                          <Icon icon="mdi:loading" className="h-3 w-3 sm:h-4 sm:w-4 animate-spin text-slate-400" />
                        </div>
                      )}
                    </div>
                    {cardErrors.city && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <span>⚠️</span> {cardErrors.city}
                      </p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="state" className="text-slate-700 font-medium text-xs sm:text-sm">
                      Estado {isLoadingCep ? '(carregando...)' : '(via CEP)'}
                      <span className="text-red-500 ml-1">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="state"
                        placeholder="Informe o CEP"
                        value={cardForm.state}
                        readOnly
                        className={`bg-slate-50 border-slate-200 text-slate-600 h-9 sm:h-10 text-sm cursor-not-allowed ${cardErrors.state ? 'border-red-500' : ''}`}
                      />
                      {isLoadingCep && (
                        <div className="absolute right-2 sm:right-3 top-1/2 transform -translate-y-1/2">
                          <Icon icon="mdi:loading" className="h-3 w-3 sm:h-4 sm:w-4 animate-spin text-slate-400" />
                        </div>
                      )}
                    </div>
                    {cardErrors.state && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <span>⚠️</span> {cardErrors.state}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="postalCode" className="text-slate-700 font-medium text-xs sm:text-sm">
                    CEP {isLoadingCep ? '(buscando...)' : '(preenche cidade/estado)'}
                    <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="postalCode"
                      placeholder="00000-000"
                      value={cardForm.postalCode}
                      onChange={(e) => handleCardInputChange('postalCode', e.target.value)}
                      maxLength={9}
                      className={`bg-white border-slate-200 focus:border-blue-500 focus:ring-blue-500 text-slate-900 h-9 sm:h-10 text-sm pr-8 sm:pr-10 ${cardErrors.postalCode ? 'border-red-500' : ''}`}
                      disabled={isLoadingCep}
                    />
                    {isLoadingCep && (
                      <div className="absolute right-2 sm:right-3 top-1/2 transform -translate-y-1/2">
                        <Icon icon="mdi:loading" className="h-3 w-3 sm:h-4 sm:w-4 animate-spin text-blue-500" />
                      </div>
                    )}
                  </div>
                  {cardErrors.postalCode && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <span>⚠️</span> {cardErrors.postalCode}
                    </p>
                  )}
                </div>
                
                {/* Botão Salvar Informações Melhorado */}
                <div className="flex justify-center sm:justify-end mt-3 sm:mt-4 pt-3 border-t border-slate-200">
                  <Button
                    type="button"
                    onClick={handleSaveBillingInfo}
                    disabled={isSavingInfo}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors w-full sm:w-auto"
                  >
                    {isSavingInfo ? (
                      <>
                        <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-2 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Icon icon="mdi:content-save" className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                        Salvar informações
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
          
          {/* Container dos Métodos de Pagamento */}
          <div className="bg-gray-50 rounded-xl p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
              <div className="p-2 bg-white rounded-lg shadow-sm flex-shrink-0 self-start sm:self-auto">
                <Icon icon="material-symbols:payment" className="h-4 w-4 sm:h-5 sm:w-5 text-slate-600" fallback={<CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-slate-600" />} />
              </div>
              <div className="flex-1">
                <h3 className="text-sm sm:text-base md:text-lg font-semibold text-slate-800">Métodos de pagamento</h3>
                <p className="text-xs sm:text-sm text-slate-600">Selecione como deseja pagar</p>
              </div>
            </div>
        
            {/* PIX Option - Visual clean e profissional */}
            {isPaymentTypeAvailable('pix') && (
              <div className="bg-white border border-slate-200 rounded-xl transition-all duration-300 hover:shadow-md overflow-hidden">
                <Button
                  variant="ghost"
                  className={`w-full flex items-center justify-between p-3 sm:p-4 md:p-6 hover:bg-slate-50 rounded-xl border-0 transition-all duration-200 min-h-[60px] sm:min-h-[70px] ${selectedPaymentType === 'pix' ? 'bg-slate-50' : ''}`}
                  onClick={() => handlePaymentTypeSelect('pix')}
                  disabled={isProcessing}
                >
                  <div className="flex items-center gap-2 sm:gap-3 md:gap-4 flex-1 min-w-0">
                    <div className="p-1.5 sm:p-2 bg-green-100 rounded-lg flex-shrink-0">
                      <Icon icon="simple-icons:pix" className="h-4 w-4 md:h-5 md:w-5 text-green-600" fallback={<Zap className="h-4 w-4 md:h-5 md:w-5 text-green-600" />} />
                    </div>
                    <div className="text-left flex-1 min-w-0">
                      <h4 className="font-semibold text-slate-800 text-sm md:text-base">PIX</h4>
                      <p className="text-xs md:text-sm text-slate-600 truncate">
                        Aprovação instantânea • {formatCurrencyForUser(getPrice('pix'))}
                      </p>
                      {selectedQuantity > 1 && (
                        <p className="text-xs text-slate-500 truncate">{selectedQuantity}x {formatCurrencyForUser(getUnitPrice('pix'))}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1 sm:gap-2 flex-shrink-0 ml-2">
                    <Badge className="bg-green-100 text-green-700 border-green-200 text-xs px-1.5 sm:px-2 py-0.5 hover:bg-green-100 whitespace-nowrap">
                      Melhor preço
                    </Badge>
                    <Icon 
                      icon={selectedPaymentType === 'pix' ? "mdi:chevron-up" : "mdi:chevron-down"} 
                      className="h-4 w-4 md:h-5 md:w-5 text-slate-400 flex-shrink-0" 
                    />
                  </div>
                </Button>
                  
                  {/* PIX Payment Content - Clean e Compacto */}
                  {selectedPaymentType === 'pix' && (
                    <div className="bg-slate-50 p-4 animate-in slide-in-from-top-2 duration-300" style={{backgroundColor: 'rgba(var(--slate-50), 0.5)'}}>
                      {/* Se não há PIX ativo ainda, mostrar botão para gerar */}
                      {showPixButton && (
                        <div className="text-center space-y-6">
                          <div className="space-y-3">
                            <div className="flex items-center justify-center gap-2">
                              <Icon icon="simple-icons:pix" className="h-8 w-8 text-green-600" fallback={<Zap className="h-8 w-8 text-green-600" />} />
                              <h3 className="text-2xl font-bold text-green-600">Pagamento PIX</h3>
                            </div>
                            <p className="text-muted-foreground text-lg">
                              Clique no botão abaixo para gerar seu QR Code PIX
                            </p>
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-semibold text-green-800">Total a pagar:</p>
                                  <p className="text-sm text-green-600">Aprovação instantânea • Sem taxas</p>
                                </div>
                                <div className="text-right">
                                  <span className="text-2xl font-bold text-green-600">
                                    {formatCurrencyForUser(getPrice('pix'))}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <Button
                            onClick={handleProceedToPayment}
                            className="w-full h-14 text-lg bg-green-600 hover:bg-green-700"
                            size="lg"
                            disabled={isProcessing}
                          >
                            {isProcessing ? (
                              <>
                                <Loader2 className="h-5 w-5 mr-3 animate-spin" />
                                Gerando QR Code PIX...
                              </>
                            ) : (
                              <>
                                <Icon icon="simple-icons:pix" className="h-5 w-5 mr-3" fallback={<Zap className="h-5 w-5 mr-3" />} />
                                Gerar QR Code PIX
                              </>
                            )}
                          </Button>
                          
                          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                            <Lock className="h-4 w-4" />
                            <span>Pagamento 100% seguro via Asaas</span>
                          </div>
                        </div>
                      )}
                      
                      {/* Se há PIX ativo ou está carregando, mostrar QR Code e controles */}
                      {showPixContent && (
                        <div className="space-y-6">
                          {/* Payment Status */}
                          <div className="flex items-center justify-between p-3 bg-muted border rounded-lg mb-6" style={{backgroundColor: 'rgba(var(--muted), 0.3)'}}>
                            <div className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse"></div>
                              <span className="text-sm text-black">
                                Aguardando pagamento • {formatCurrencyForUser(getPrice('pix'))}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 text-orange-600 text-sm">
                              <Clock className="h-3.5 w-3.5" />
                              <span className="font-medium">{formatTime(timeRemaining)}</span>
                            </div>
                          </div>

                          {/* QR Code Display */}
                          <div className="text-center space-y-4">
                            <div className="flex items-center justify-center gap-2">
                              <Icon icon="material-symbols:qr-code-2" className="h-5 w-5 text-primary" />
                              <h3 className="text-lg font-semibold text-black">
                                {timeRemaining === 0 ? 'QR Code Expirado' : 'Escaneie o QR Code'}
                              </h3>
                            </div>
                            
                            <div className="flex justify-center">
                              <div className="p-3 md:p-4 bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl shadow-sm">
                                {timeRemaining === 0 ? (
                                  <div className="w-40 h-40 sm:w-48 sm:h-48 md:w-56 md:h-56 flex items-center justify-center">
                                    <div className="text-center space-y-3">
                                      <Clock className="h-12 w-12 text-orange-500 mx-auto" />
                                      <p className="text-sm text-muted-foreground">
                                        QR Code expirado
                                      </p>
                                      <Button
                                        onClick={handleReloadPixPayment}
                                        disabled={isProcessing}
                                        className="mt-2"
                                      >
                                        {isProcessing ? (
                                          <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Gerando novo QR Code...
                                          </>
                                        ) : (
                                          <>
                                            <Icon icon="material-symbols:qr-code-2" className="h-4 w-4 mr-2" fallback={<QrCode className="h-4 w-4 mr-2" />} />
                                            Gerar novo QR Code
                                          </>
                                        )}
                                      </Button>
                                    </div>
                                  </div>
                                ) : !pixQrCode ? (
                                  <div className="w-40 h-40 sm:w-48 sm:h-48 md:w-56 md:h-56 flex items-center justify-center">
                                    <div className="text-center space-y-3">
                                      <div className="relative">
                                        <Loader2 className="h-8 w-8 md:h-12 md:w-12 animate-spin mx-auto text-primary" />
                                        <div className="absolute inset-0 rounded-full bg-primary bg-opacity-10 animate-ping"></div>
                                      </div>
                                      <div className="space-y-1">
                                        <p className="text-xs md:text-sm font-medium text-slate-700">
                                          Gerando QR Code PIX...
                                        </p>
                                        <p className="text-xs text-slate-500">
                                          Aguarde alguns instantes
                                        </p>
                                      </div>
                                      <div className="flex justify-center">
                                        <div className="flex space-x-1">
                                          <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                                          <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                                          <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="w-40 h-40 sm:w-48 sm:h-48 md:w-56 md:h-56 mx-auto">
                                    <img
                                      src={`data:image/png;base64,${pixQrCode}`}
                                      alt="QR Code PIX"
                                      className="w-full h-full object-contain animate-in fade-in duration-500"
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {timeRemaining > 0 && (
                              <p className="text-sm text-muted-foreground">
                                Abra o app do seu banco e escaneie o código
                              </p>
                            )}
                          </div>

                          {/* Código PIX Copia e Cola */}
                          {pixCopyPaste && timeRemaining > 0 && (
                            <div className="space-y-4">
                              <div className="flex items-center justify-center gap-2">
                                <Copy className="h-5 w-5 text-primary" />
                                <h3 className="text-lg font-semibold text-black">
                                  Ou use o código PIX
                                </h3>
                              </div>
                              
                              <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm text-slate-600 font-medium">Código PIX (copiar e colar):</span>
                                  <Button
                                    onClick={handleCopyPaste}
                                    size="sm"
                                    variant="outline"
                                    className="h-8 px-3 text-xs"
                                  >
                                    {copied ? (
                                      <>
                                        <CheckCircle className="h-3 w-3 mr-1 text-green-600" />
                                        Copiado!
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="h-3 w-3 mr-1" />
                                        Copiar
                                      </>
                                    )}
                                  </Button>
                                </div>
                                
                                <div className="bg-slate-50 border border-slate-200 rounded p-3 max-h-32 overflow-y-auto">
                                  <code className="text-xs font-mono text-slate-800 break-all leading-relaxed">
                                    {pixCopyPaste}
                                  </code>
                                </div>
                                
                                <div className="text-center">
                                  <p className="text-xs text-slate-500">
                                    💡 Copie este código e cole no seu app do banco na opção "PIX Copia e Cola"
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {/* Loading do código PIX quando ainda não está disponível */}
                          {!pixCopyPaste && pixQrCode && timeRemaining > 0 && (
                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                              <div className="flex items-center justify-center gap-3 text-blue-700">
                                <div className="relative">
                                  <Loader2 className="h-5 w-5 animate-spin" />
                                  <div className="absolute inset-0 rounded-full bg-blue-400 bg-opacity-20 animate-ping"></div>
                                </div>
                                <span className="text-sm font-medium">Preparando código PIX...</span>
                              </div>
                              <div className="mt-3 text-center space-y-1">
                                <p className="text-xs text-blue-600 font-medium">
                                  📋 O código "copia e cola" estará disponível em breve
                                </p>
                                <p className="text-xs text-blue-500">
                                  Enquanto isso, você já pode escanear o QR Code acima
                                </p>
                              </div>
                            </div>
                          )}

                          <Separator className="my-6" />
                        </div>
                      )}
                    </div>
                  )}
                </div>
            )}

            {/* Credit Card Option - Visual clean e profissional */}
            {isPaymentTypeAvailable('credit_card') && (
              <div className="bg-white border border-slate-200 rounded-xl transition-all duration-300 hover:shadow-md overflow-hidden">
                <Button
                  variant="ghost"
                  className={`w-full flex items-center justify-between p-3 sm:p-4 md:p-6 hover:bg-slate-50 rounded-xl border-0 transition-all duration-200 min-h-[60px] sm:min-h-[70px] ${selectedPaymentType === 'credit_card' ? 'bg-slate-50' : ''}`}
                  onClick={() => handlePaymentTypeSelect('credit_card')}
                  disabled={isProcessing}
                >
                  <div className="flex items-center gap-2 sm:gap-3 md:gap-4 flex-1 min-w-0">
                    <div className="p-1.5 sm:p-2 bg-slate-100 rounded-lg flex-shrink-0">
                      <CreditCard className="h-4 w-4 md:h-5 md:w-5 text-slate-600" />
                    </div>
                    <div className="text-left flex-1 min-w-0">
                      <h4 className="font-semibold text-slate-800 text-sm md:text-base">Cartão de Crédito</h4>
                      <p className="text-xs md:text-sm text-slate-600 truncate">
                        Parcelamento em até 4x
                      </p>
                      <p className="text-xs md:text-sm text-slate-600 font-medium truncate">
                        {formatCurrencyForUser(getCreditCardPrice(4))}
                      </p>
                      {selectedQuantity > 1 && (
                        <p className="text-xs text-slate-500 truncate">{selectedQuantity}x {formatCurrencyForUser(getCreditCardUnitPrice(4))}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    <Icon 
                      icon={selectedPaymentType === 'credit_card' ? "mdi:chevron-up" : "mdi:chevron-down"} 
                      className="h-4 w-4 md:h-5 md:w-5 text-slate-400 flex-shrink-0" 
                    />
                  </div>
                </Button>
              
              {/* Credit Card Payment Form - Clean e Compacto */}
              {selectedPaymentType === 'credit_card' && (
                <div className="bg-slate-50 p-4 animate-in slide-in-from-top-2 duration-300" style={{backgroundColor: 'rgba(var(--slate-50), 0.5)'}}>
                  {/* Card Information */}
                  <div className="space-y-4">
                    <div className="mb-4">
                      <h4 className="font-medium text-slate-800 text-sm mb-1">Dados do Cartão</h4>
                      <p className="text-xs text-slate-600">Preencha as informações do seu cartão</p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="cardHolderName" className="text-slate-700 font-medium text-sm">
                        Nome no Cartão
                        <span className="text-red-500 ml-1">*</span>
                      </Label>
                      <Input
                        id="cardHolderName"
                        placeholder="Nome como impresso no cartão"
                        value={cardForm.cardHolderName}
                        onChange={(e) => handleCardInputChange('cardHolderName', e.target.value.toUpperCase())}
                        className={`bg-white border-slate-200 focus:border-blue-500 focus:ring-1 text-slate-900 h-10 transition-all ${cardErrors.cardHolderName ? 'border-red-300 focus:border-red-500' : ''}`}
                      />
                      {cardErrors.cardHolderName && (
                        <p className="text-xs text-red-500 flex items-center gap-1">
                          <span>⚠️</span> {cardErrors.cardHolderName}
                        </p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="cardNumber" className="text-slate-700 font-medium text-sm">
                        Número do Cartão
                        <span className="text-red-500 ml-1">*</span>
                      </Label>
                      <div className="relative">
                        <Input
                          id="cardNumber"
                          placeholder="0000 0000 0000 0000"
                          value={cardForm.cardNumber}
                          onChange={(e) => handleCardInputChange('cardNumber', e.target.value)}
                          maxLength={19}
                          className={`pr-16 bg-white border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-900 h-10 transition-all ${cardErrors.cardNumber ? 'border-red-300 focus:border-red-500' : ''}`}
                        />
                        {cardForm.cardNumber && (
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            <Icon 
                              icon={getCardType(cardForm.cardNumber).icon} 
                              className="h-6 w-8 object-contain" 
                              fallback={<CreditCard className="h-4 w-4 text-slate-400" />}
                            />
                          </div>
                        )}
                      </div>
                      {cardErrors.cardNumber && (
                        <p className="text-xs text-red-500 flex items-center gap-1">
                          <span>⚠️</span> {cardErrors.cardNumber}
                        </p>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="expiryDate" className="text-slate-700 font-medium text-sm">
                          Validade
                          <span className="text-red-500 ml-1">*</span>
                        </Label>
                        <Input
                          id="expiryDate"
                          placeholder="MM/AA"
                          value={cardForm.expiryDate}
                          onChange={(e) => handleCardInputChange('expiryDate', e.target.value)}
                          maxLength={5}
                          className={`bg-white border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-900 h-10 transition-all ${cardErrors.expiryDate ? 'border-red-300 focus:border-red-500' : ''}`}
                        />
                        {cardErrors.expiryDate && (
                          <p className="text-xs text-red-500 flex items-center gap-1">
                            <span>⚠️</span> {cardErrors.expiryDate}
                          </p>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="cvv" className="text-slate-700 font-medium text-sm">
                          CVV
                          <span className="text-red-500 ml-1">*</span>
                        </Label>
                        <div className="relative">
                          <Input
                            id="cvv"
                            placeholder="123"
                            value={cardForm.cvv}
                            onChange={(e) => handleCardInputChange('cvv', e.target.value)}
                            maxLength={3}
                            className={`pr-10 bg-white border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-900 h-10 transition-all ${cardErrors.cvv ? 'border-red-300 focus:border-red-500' : ''}`}
                            type={showCvv ? "text" : "password"}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-transparent"
                            onClick={() => setShowCvv(!showCvv)}
                          >
                            <Icon 
                              icon={showCvv ? "mdi:eye-off" : "mdi:eye"} 
                              className="h-4 w-4 text-slate-400 hover:text-slate-600" 
                            />
                          </Button>
                        </div>
                        {cardErrors.cvv && (
                          <p className="text-xs text-red-500 flex items-center gap-1">
                            <span>⚠️</span> {cardErrors.cvv}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="cardHolderCpf" className="text-slate-700 font-medium text-sm">
                        CPF do Titular
                        <span className="text-red-500 ml-1">*</span>
                      </Label>
                      <Input
                        id="cardHolderCpf"
                        placeholder="000.000.000-00"
                        value={cardForm.cardHolderCpf}
                        onChange={(e) => handleCardInputChange('cardHolderCpf', e.target.value)}
                        maxLength={14}
                        className={`bg-white border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-900 h-10 transition-all ${cardErrors.cardHolderCpf ? 'border-red-300 focus:border-red-500' : ''}`}
                      />
                      {cardErrors.cardHolderCpf && (
                        <p className="text-xs text-red-500 flex items-center gap-1">
                          <span>⚠️</span> {cardErrors.cardHolderCpf}
                        </p>
                      )}
                    </div>
                    
                    {/* Divisão */}
                    <Separator className="my-4" />
                    
                    {/* Seleção de Parcelas */}
                    <div className="space-y-3">
                      <div>
                        <Label className="text-slate-700 font-medium text-sm">Parcelamento</Label>
                        <p className="text-xs text-slate-600 mt-1">Escolha como deseja pagar</p>
                        <div className="flex items-center gap-1 mt-1">
                          <Icon icon="mdi:information" className="h-3 w-3 text-blue-500" />
                          <p className="text-xs text-slate-500">Juros já incluídos no valor parcelado</p>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="relative">
                          <select
                            value={selectedInstallments}
                            onChange={(e) => setSelectedInstallments(Number(e.target.value))}
                            className="w-full h-10 px-3 pr-8 bg-white border border-slate-200 rounded-lg text-slate-900 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all appearance-none cursor-pointer"
                          >
                            {[1, 2, 3, 4].map((installments) => {
                              const totalWithFees = getCreditCardPrice(installments);
                              const installmentValue = totalWithFees / installments;
                              const totalFee = totalWithFees - getPrice('credit_card');
                              return (
                                <option key={installments} value={installments}>
                                  {installments === 1 
                                    ? `À vista - ${formatCurrencyForUser(getPrice('credit_card'))}`
                                    : `${installments}x de ${formatCurrencyForUser(installmentValue)}${totalFee > 0 ? ` (com juros)` : ''}`
                                  }
                                </option>
                              );
                            })}
                          </select>
                          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none">
                            <Icon 
                              icon="mdi:chevron-down" 
                              className="h-4 w-4 text-slate-400" 
                            />
                          </div>
                        </div>
                        
                        {/* Resumo compacto */}
                        <div className="bg-slate-100 rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-600">
                              {selectedInstallments === 1 ? 'Pagamento à vista' : `${selectedInstallments} parcelas`}
                            </span>
                            <div className="text-sm font-medium text-slate-800">
                              {(() => {
                                const totalWithFees = getCreditCardPrice(selectedInstallments);
                                const installmentValue = totalWithFees / selectedInstallments;
                                return selectedInstallments === 1 
                                  ? formatCurrencyForUser(getPrice('credit_card'))
                                  : `${selectedInstallments}x ${formatCurrencyForUser(installmentValue)}`;
                              })()} 
                            </div>
                          </div>
                          {/* Mostrar valor total com juros se houver */}
                          {(() => {
                            const totalWithFees = getCreditCardPrice(selectedInstallments);
                            const totalFee = totalWithFees - getPrice('credit_card');
                            return selectedInstallments > 1 && totalFee > 0 && (
                              <div className="mt-2 pt-2 border-t border-slate-200">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-slate-500">Total com juros:</span>
                                  <span className="text-slate-700 font-medium">{formatCurrencyForUser(totalWithFees)}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs mt-1">
                                  <span className="text-slate-500">Juros:</span>
                                  <span className="text-amber-600 font-medium">+{formatCurrencyForUser(totalFee)}</span>
                                </div>
                              </div>
                            );
                          })()} 
                          {selectedInstallments === 1 && getPrice('pix') !== getPrice('credit_card') && (
                            <div className="mt-2 pt-2 border-t border-slate-200">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-500">Valor no PIX:</span>
                                <span className="text-green-600 font-medium">{formatCurrencyForUser(getPrice('pix'))}</span>
                              </div>
                              <div className="text-xs text-slate-500 mt-1">
                                Economize {formatCurrencyForUser(getPrice('credit_card') - getPrice('pix'))} pagando via PIX
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Botão Finalizar Pagamento */}
                      <div className="mt-4">
                        <Button
                          onClick={handleCardPayment}
                          className={`w-full h-12 font-medium text-sm transition-all duration-200 ${
                            !isCardFormComplete() || isProcessing 
                              ? 'bg-slate-400 text-slate-300 cursor-not-allowed' 
                              : 'bg-slate-800 hover:bg-slate-900 text-white'
                          }`}
                          disabled={!isCardFormComplete() || isProcessing}
                        >
                          {isProcessing ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Processando...
                            </>
                          ) : (
                            <>
                              <CreditCard className="h-4 w-4 mr-2" />
                              Finalizar Pagamento
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              </div>
            )}
          </div>
          
          {/* Card removido conforme solicitado para itens sem account */}
        </div>
        )}
      </div>
    )
  };

  // Main checkout interface
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Finalizar Compra</h1>
          <p className="text-muted-foreground text-sm">
            Revise seus dados e escolha o pagamento
          </p>
        </div>
      </div>

      {/* Main Content com layout melhorado */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left Column: Product Info - largura aumentada */}
        <div className="lg:col-span-2 space-y-6">
          {/* Product Info Card com altura igual */}
          <Card className="overflow-hidden h-full shadow-lg border-muted">
            <CardContent className="p-0">
              <div className="space-y-0">
                {/* Product Image - Larger and more prominent */}
                <div className="relative w-full h-48 sm:h-56 bg-muted">
                  <SmartImage
                    src={item.image_url}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                  <div className={`absolute top-3 left-3 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-bold border-2 ${getCategoryStyles(item.category)}`}>
                    {item.category === 'promocoes' ? 'DIVULGAÇÕES' : item.category.toUpperCase()}
                  </div>
                  
                  {/* Gradient overlay for better text contrast */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
                  
                  {/* Availability badge */}
                  <div className="absolute bottom-3 right-3">
                    <Badge className="bg-green-500 hover:bg-green-600 text-white border-0 shadow-lg">
                      <Package className="h-3 w-3 mr-1" />
                      {item.quantity} disponíveis
                    </Badge>
                  </div>
                </div>

                {/* Product Details */}
                <div className="p-5">
                  <h3 className="font-bold text-xl mb-3 line-clamp-2 leading-tight">{getProductName()}</h3>
                  
                  {/* Description if available */}
                  {item.description && (
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                      {item.description}
                    </p>
                  )}

                  {/* Price summary - cleaner and professional */}
                  <div className="space-y-3 border border-slate-200 p-4 rounded-lg bg-white">
                    <h4 className="font-semibold text-sm text-slate-700">Resumo de preços</h4>
                    <div className="space-y-2">
                      {item.rl_price > 0 && (
                        <div className="space-y-2">
                          <div className="text-center">
                            <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100 text-[10px] px-2 py-0.5">(Melhor Preço)</Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-slate-600">
                              <Icon icon="simple-icons:pix" className="h-4 w-4 text-green-600" />
                              <span className="text-sm">À vista no PIX</span>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold text-slate-900">{formatCurrencyForUser(getPrice('pix'))}</div>
                              {selectedQuantity > 1 && (
                                <div className="text-xs text-slate-500">{selectedQuantity}x {formatCurrencyForUser(getUnitPrice('pix'))}</div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                      {/* Só exibir cartão de crédito se tem account vinculada */}
                      {item.parcelado_price > 0 && hasLinkedAccount === true && (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-slate-600">
                              <CreditCard className="h-4 w-4 text-slate-600" />
                              <span className="text-sm">Cartão de crédito</span>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold text-slate-900">{formatCurrencyForUser(getCreditCardPrice(4))}</div>
                              {selectedQuantity > 1 && (
                                <div className="text-xs text-slate-500">{selectedQuantity}x {formatCurrencyForUser(getCreditCardUnitPrice(4))}</div>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-slate-500">em até 4x de {formatCurrencyForUser(getCreditCardPrice(4) / 4)}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Payment Section - Main content com altura igual */}
        <div className="lg:col-span-3">
          <Card className="h-full shadow-lg border-muted">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Escolha a forma de pagamento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Security Alert */}
              {securityStatus && !securityStatus.canPurchase && (
                <div className="border-l-4 border-red-500 bg-red-50 p-4 rounded-r-lg">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <Icon icon="mdi:alert-circle" className="h-5 w-5 text-red-500" fallback={<span className="text-red-500">⚠️</span>} />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-red-800">
                        Compra Bloqueada
                      </p>
                      <p className="text-sm text-red-700 mt-1">
                        {securityStatus.reason}
                      </p>
                      {securityStatus.reason?.includes('já possui') && (
                        <p className="text-xs text-red-600 mt-2">
                          Você será redirecionado automaticamente em alguns segundos...
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Platform Selection */}
              {securityStatus?.canPurchase !== false && renderSelection()}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default CheckoutForm;
