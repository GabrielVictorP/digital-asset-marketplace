import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, Mail, Package, CreditCard, ArrowLeft, Home, Copy, Check } from 'lucide-react';
import { Icon } from '@iconify/react';
import { formatCurrencyForUser } from '@/lib/locale-utils';
import { toast } from '@/components/ui/use-toast';
import SmartImage from '@/components/SmartImage';
import { useSupabaseItems } from '@/hooks/useSupabaseItems';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';

interface PurchaseDetails {
  orderId: string;
  itemId: string;
  itemName: string;
  itemImage?: string;
  paymentMethod: 'PIX' | 'Cartão de Crédito';
  paymentAmount: number;
  paymentId: string;
  buyerName: string;
  buyerEmail: string;
  purchaseDate: string;
  status: 'approved' | 'pending';
  platform?: 'android' | 'ios';
  installmentCount?: number;
}

const PurchaseSuccessPage = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useSupabaseAuth();
  const { items } = useSupabaseItems();
  
  const [purchaseDetails, setPurchaseDetails] = useState<PurchaseDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const loadPurchaseDetails = () => {
      if (!orderId) {
        navigate('/');
        return;
      }

      // Buscar detalhes da compra pelos parâmetros da URL ou localStorage
      const itemId = searchParams.get('itemId');
      const paymentMethodParam = searchParams.get('paymentMethod');
      const paymentAmount = searchParams.get('paymentAmount');
      const paymentId = searchParams.get('paymentId');
      const platform = searchParams.get('platform') as 'android' | 'ios';
      const installmentCount = searchParams.get('installments') ? parseInt(searchParams.get('installments')!) : undefined;
      
      // Mapear corretamente o método de pagamento
      let paymentMethod: 'PIX' | 'Cartão de Crédito';
      if (paymentMethodParam === 'pix' || paymentMethodParam === 'PIX') {
        paymentMethod = 'PIX';
      } else if (paymentMethodParam === 'CartaoDeCredito' || paymentMethodParam === 'CREDIT_CARD' || paymentMethodParam === 'credit_card') {
        paymentMethod = 'Cartão de Crédito';
      } else {
        // Fallback baseado na URL ou parâmetros
        paymentMethod = paymentMethodParam as 'PIX' | 'Cartão de Crédito' || 'PIX';
      }
      
      // Verificar se temos todos os dados necessários
      if (!itemId || !paymentMethod || !paymentAmount || !paymentId || !user) {
        navigate('/');
        return;
      }

      const item = items.find(i => i.id === itemId);
      if (!item) {
        navigate('/');
        return;
      }

      const details: PurchaseDetails = {
        orderId,
        itemId,
        itemName: item.name,
        itemImage: item.image_url,
        paymentMethod,
        paymentAmount: parseFloat(paymentAmount),
        paymentId,
        buyerName: user.email?.split('@')[0] || 'Cliente',
        buyerEmail: user.email || '',
        purchaseDate: new Date().toLocaleString('pt-BR'),
        status: 'approved',
        platform,
        installmentCount
      };

      setPurchaseDetails(details);
      setLoading(false);

      // Limpar dados sensíveis da URL após carregamento
      setTimeout(() => {
        const newUrl = `/purchase-success/${orderId}`;
        window.history.replaceState({}, '', newUrl);
      }, 1000);
    };

    loadPurchaseDetails();
  }, [orderId, searchParams, navigate, user, items]);

  const handleCopyOrderId = async () => {
    if (!purchaseDetails?.paymentId) return;
    
    try {
      await navigator.clipboard.writeText(purchaseDetails.paymentId);
      setCopied(true);
      toast({
        title: "ID copiado!",
        description: "O ID do pagamento foi copiado para sua área de transferência.",
      });
      setTimeout(() => setCopied(false), 3000);
    } catch (error) {
      toast({
        title: "Erro ao copiar",
        description: "Não foi possível copiar o ID do pagamento.",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando detalhes da compra...</p>
        </Card>
      </div>
    );
  }

  if (!purchaseDetails) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold mb-2">Compra não encontrada</h2>
          <p className="text-muted-foreground mb-6">
            Não foi possível encontrar os detalhes desta compra.
          </p>
          <Button onClick={() => navigate('/')} className="w-full">
            <Home className="h-4 w-4 mr-2" />
            Voltar à loja
          </Button>
        </Card>
      </div>
    );
  }

  const getPaymentIcon = () => {
    return purchaseDetails.paymentMethod === 'PIX' 
      ? <Icon icon="simple-icons:pix" className="h-5 w-5" />
      : <CreditCard className="h-5 w-5" />;
  };

  const getPaymentColor = () => {
    return purchaseDetails.paymentMethod === 'PIX' ? 'bg-green-500' : 'bg-blue-500';
  };

  const getPlatformIcon = () => {
    if (!purchaseDetails.platform) return null;
    return purchaseDetails.platform === 'android' 
      ? <Icon icon="logos:android-icon" className="h-4 w-4" />
      : <Icon icon="logos:apple" className="h-4 w-4" />;
  };

  return (
    <div className="container mx-auto px-4 py-4 md:py-8 max-w-2xl">
      {/* Header de sucesso */}
      <div className="text-center mb-6 md:mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 md:w-16 md:h-16 bg-green-100 rounded-full mb-4">
          <CheckCircle className="h-6 w-6 md:h-8 md:w-8 text-green-600" />
        </div>
        <h1 className="text-xl md:text-3xl font-bold text-green-600 mb-2">
          Compra realizada com sucesso! 🎉
        </h1>
        <p className="text-sm md:text-lg text-muted-foreground">
          Seu pagamento foi aprovado e processado
        </p>
      </div>

      {/* Card principal com detalhes */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Detalhes da Compra
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Produto comprado */}
          <div className="flex flex-col sm:flex-row items-start gap-4 p-4 bg-gray-50 rounded-lg">
            <SmartImage
              src={purchaseDetails.itemImage}
              alt={purchaseDetails.itemName}
              className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg border flex-shrink-0 mx-auto sm:mx-0"
            />
            <div className="flex-1 text-center sm:text-left">
              <h3 className="font-semibold text-base sm:text-lg text-black">{purchaseDetails.itemName}</h3>
              <p className="text-xl sm:text-2xl font-bold text-primary">
                {formatCurrencyForUser(purchaseDetails.paymentAmount)}
              </p>
              {purchaseDetails.platform && (
                <div className="flex items-center justify-center sm:justify-start gap-1 mt-1">
                  {getPlatformIcon()}
                  <span className="text-sm text-muted-foreground capitalize">
                    {purchaseDetails.platform}
                  </span>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Informações do pagamento */}
          <div className="grid gap-4">
            <div>
              <p className="text-sm text-muted-foreground">ID do Pagamento</p>
              <div className="flex items-center gap-2">
                <p className="font-mono text-sm font-medium">
                  {purchaseDetails.paymentId}
                </p>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCopyOrderId}
                  className="h-6 w-6 p-0"
                >
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Data da Compra</p>
                <p className="font-medium text-sm sm:text-base">{purchaseDetails.purchaseDate}</p>
              </div>
              <div className="flex flex-col gap-2">
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge className="bg-green-500 text-white self-start">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Aprovado
                </Badge>
              </div>
            </div>
            
            <div>
              <p className="text-sm text-muted-foreground">Forma de Pagamento</p>
              <div className="flex items-center gap-2">
                {getPaymentIcon()}
                <p className="font-medium text-sm sm:text-base">
                  {purchaseDetails.paymentMethod === 'PIX' ? 'PIX' : 
                   (purchaseDetails.installmentCount && purchaseDetails.installmentCount > 1 ? 
                    `Cartão de Crédito - ${purchaseDetails.installmentCount}x` : 'Cartão de Crédito - À vista')}
                </p>
              </div>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Comprador</p>
              <p className="font-medium">{purchaseDetails.buyerEmail}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Instruções importantes */}
      <Card className="mb-6 border-blue-200 bg-blue-50">
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-col sm:flex-row items-start gap-3">
            <Mail className="h-6 w-6 text-blue-600 mt-0.5 flex-shrink-0 mx-auto sm:mx-0" />
            <div className="flex-1 text-center sm:text-left">
              <h3 className="font-semibold text-blue-900 mb-2">
                Verifique seu e-mail! 📧
              </h3>
              <p className="text-blue-800 text-sm leading-relaxed">
                Enviamos as credenciais do seu produto para <strong>{purchaseDetails.buyerEmail}</strong>. 
                Caso não receba o e-mail em alguns minutos, verifique sua caixa de spam ou entre em contato conosco.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Botões de ação */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Button
          variant="outline"
          onClick={() => navigate('/user/dashboard')}
          className="flex-1"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <Button
          onClick={() => navigate('/')}
          className="flex-1"
        >
          <Home className="h-4 w-4 mr-2" />
          Continuar Comprando
        </Button>
      </div>

      {/* Footer com suporte */}
      <div className="text-center mt-8 pt-6 border-t">
        <p className="text-sm text-muted-foreground">
          Precisa de ajuda? Entre em contato conosco:
        </p>
        <div className="flex flex-col sm:flex-row justify-center items-center gap-2 sm:gap-4 mt-2">
          <a
            href="mailto:support@example.com"
            className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
          >
            support@example.com
          </a>
          <span className="text-muted-foreground hidden sm:inline">•</span>
          <a
            href="https://wa.me/559999999999"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-green-600 hover:text-green-800 transition-colors flex items-center gap-1"
          >
            <Icon icon="logos:whatsapp-icon" className="h-4 w-4" />
            WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
};

export default PurchaseSuccessPage;
