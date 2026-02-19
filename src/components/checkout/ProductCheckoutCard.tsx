import { Item } from '@/contexts/SupabaseItemsContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrencyForUser } from '@/lib/locale-utils';
import SmartImage from '@/components/SmartImage';
import { Package, Tag, ShoppingBag, Zap, CreditCard, Loader2, CheckCircle, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

interface ProductCheckoutCardProps {
  item: Item;
  compact?: boolean;
  selectedPaymentType?: 'pix' | 'credit_card' | null;
  showOrderSummary?: boolean;
  onProceedToPayment?: () => void;
  isProcessing?: boolean;
}

const ProductCheckoutCard = ({ 
  item, 
  compact = false, 
  selectedPaymentType = null,
  showOrderSummary = false,
  onProceedToPayment,
  isProcessing = false
}: ProductCheckoutCardProps) => {
  const formatPrice = (price: number): string => {
    if (price === 0) return "Grátis";
    return formatCurrencyForUser(price);
  };

  const formatKKSPrice = (price: number): string => {
    if (price === 0) return "Grátis";
    return price.toFixed(2);
  };

  const getSelectedPrice = () => {
    if (!selectedPaymentType) return 0;
    return selectedPaymentType === 'pix' ? item.rl_price : item.parcelado_price;
  };

  const getPaymentMethodLabel = () => {
    if (!selectedPaymentType) return '';
    return selectedPaymentType === 'pix' ? 'PIX' : 'Cartão de Crédito';
  };

  const getPaymentMethodIcon = () => {
    if (!selectedPaymentType) return null;
    return selectedPaymentType === 'pix' 
      ? <Zap className="h-4 w-4" />
      : <CreditCard className="h-4 w-4" />;
  };

  const canProceed = selectedPaymentType !== null && !isProcessing;
  const selectedPrice = getSelectedPrice();

  // Function to get category-specific styling
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
        return 'bg-gaming-primary/90 text-white';
    }
  };

  if (compact) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Resumo do Pedido</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-muted">
              <SmartImage
                src={item.image_url}
                alt={item.name}
                className="w-full h-full object-cover"
              />
              <div className={`absolute top-1 left-1 backdrop-blur-sm px-1 py-0.5 rounded text-xs font-semibold border ${getCategoryStyles(item.category)}`}>
                {item.category === 'promocoes' ? 'DIVULGAÇÕES' : item.category.toUpperCase()}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold truncate" title={item.name}>
                {item.name}
              </h4>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Package className="h-3 w-3" />
                <span>{item.quantity}x disponível</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingBag className="h-5 w-5" />
          Detalhes do Produto
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Product Image */}
          <div className="relative aspect-square rounded-lg overflow-hidden bg-muted">
            <SmartImage
              src={item.image_url}
              alt={item.name}
              className="w-full h-full object-cover"
              enableModal={true}
            />
            <div className={`absolute top-3 left-3 backdrop-blur-sm px-3 py-1 rounded-md text-sm font-semibold border ${getCategoryStyles(item.category)}`}>
              {item.category === 'promocoes' ? 'DIVULGAÇÕES' : item.category.toUpperCase()}
            </div>
          </div>

          {/* Product Details */}
          <div className="space-y-4">
            <div>
              <h3 className="text-2xl font-bold mb-2">{item.name}</h3>
              <div className="flex items-center gap-2 text-muted-foreground mb-4">
                <Package className="h-4 w-4" />
                <span className="text-sm">
                  <strong>{item.quantity}</strong> unidade(s) disponível(s)
                </span>
              </div>
            </div>

            {/* Available Prices */}
            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Opções de Pagamento
              </h4>
              
              <div className="space-y-2">
                {item.rl_price > 0 && (
                  <div className="flex items-center justify-between p-3 bg-primary/5 border border-primary/20 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-primary rounded-full"></div>
                      <span className="font-medium">PIX (RL)</span>
                    </div>
                    <span className="font-bold text-primary">
                      {formatPrice(item.rl_price)}
                    </span>
                  </div>
                )}

                {item.parcelado_price > 0 && (
                  <div className="flex items-center justify-between p-3 bg-secondary/5 border border-secondary/20 rounded-lg opacity-60">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-secondary rounded-full"></div>
                      <span className="font-medium">Cartão de Crédito</span>
                      <span className="text-xs text-muted-foreground">(Indisponível)</span>
                    </div>
                    <span className="font-bold text-secondary">
                      {formatPrice(item.parcelado_price)}
                    </span>
                  </div>
                )}

                {item.kks_price > 0 && (
                  <div className="flex items-center justify-between p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <span className="font-medium">KKS</span>
                    </div>
                    <span className="font-bold text-yellow-600">
                      {formatKKSPrice(item.kks_price)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Special KKS Badge */}
            {item.name.toLowerCase() === 'kks' && (
              <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-lg px-4 py-3 text-center">
                <span className="text-sm font-medium text-yellow-200">
                  🪙 Moeda KKS do Rucoy
                </span>
              </div>
            )}

            {/* External Link */}
            {item.external_link && (
              <div>
                <a
                  href={item.external_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-gaming-accent bg-gaming-accent/20 border border-gaming-accent/30 rounded-lg hover:bg-gaming-accent/30 transition-colors duration-200"
                >
                  🔗 Ver Vídeo
                </a>
              </div>
            )}

            {/* Description for specific categories */}
            {(item.category === 'freefire' || item.category === 'supercell') && item.description && (
              <div className="p-3 bg-muted rounded-lg">
                <h5 className="font-medium mb-2">Descrição:</h5>
                <p className="text-sm text-muted-foreground">
                  {item.description}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Order Summary Section */}
        {showOrderSummary && (
          <>
            <Separator className="my-6" />
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                <h4 className="text-lg font-semibold">Resumo da Compra</h4>
              </div>

              {/* Product Summary */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Produto:</span>
                  <span className="font-medium">{item.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Quantidade:</span>
                  <span className="font-medium">1 unidade</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Categoria:</span>
                  <Badge variant="secondary" className="text-xs">
                    {item.category === 'promocoes' ? 'DIVULGAÇÕES' : item.category.toUpperCase()}
                  </Badge>
                </div>
              </div>

              {/* Payment Method Selected */}
              {selectedPaymentType && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Forma de pagamento:</span>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                    {getPaymentMethodIcon()}
                    <span className="font-medium">{getPaymentMethodLabel()}</span>
                    {selectedPaymentType === 'pix' && (
                      <Badge variant="secondary" className="text-xs ml-auto">
                        Mais barato
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {!selectedPaymentType && (
                <div className="p-4 bg-muted/50 border border-dashed rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">
                    Selecione uma forma de pagamento para continuar
                  </p>
                </div>
              )}

              {/* Price Breakdown */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Subtotal:</span>
                  <span className="text-sm">
                    {selectedPrice > 0 ? formatCurrencyForUser(selectedPrice) : '--'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Taxa de processamento:</span>
                  <span className="text-sm text-green-600">Grátis</span>
                </div>
              </div>

              <Separator />

              {/* Total */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span className="text-primary">
                    {selectedPrice > 0 ? formatCurrencyForUser(selectedPrice) : '--'}
                  </span>
                </div>
                
                {selectedPaymentType === 'pix' && item.parcelado_price > item.rl_price && (
                  <div className="text-xs text-green-600 text-center">
                    Você está economizando {formatCurrencyForUser(item.parcelado_price - item.rl_price)} pagando com PIX!
                  </div>
                )}
              </div>

              {/* Action Button */}
              {onProceedToPayment && (
                <div className="pt-2">
                  <Button
                    onClick={onProceedToPayment}
                    disabled={!canProceed}
                    className="w-full"
                    size="lg"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processando...
                      </>
                    ) : !selectedPaymentType ? (
                      <>
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        Selecione um método
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Finalizar Compra
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* Security Info */}
              <div className="pt-2 border-t">
                <div className="text-center space-y-1">
                  <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span>Pagamento seguro</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Processado pelo Asaas
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default ProductCheckoutCard;
