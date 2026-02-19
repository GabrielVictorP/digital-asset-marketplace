import { Item } from '@/contexts/SupabaseItemsContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { formatCurrencyForUser } from '@/lib/locale-utils';
import { ShoppingCart, Zap, CreditCard, Loader2, CheckCircle } from 'lucide-react';

interface OrderSummaryProps {
  item: Item;
  selectedPaymentType: 'pix' | 'credit_card' | null;
  onProceedToPayment: () => void;
  isProcessing: boolean;
}

const OrderSummary = ({ 
  item, 
  selectedPaymentType, 
  onProceedToPayment, 
  isProcessing 
}: OrderSummaryProps) => {
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

  return (
    <Card className="sticky top-4 overflow-hidden">
      <CardHeader className="pb-3 sm:pb-6">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg md:text-xl">
          <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" />
          Resumo do Pedido
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4 pt-0">
        {/* Product Summary */}
        <div className="space-y-2 sm:space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h4 className="font-medium truncate text-sm sm:text-base" title={item.name}>
                {item.name}
              </h4>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Quantidade: 1
              </p>
            </div>
            <div className="flex-shrink-0">
              <Badge variant="secondary" className="text-xs whitespace-nowrap">
                {item.category === 'promocoes' ? 'DIVULGAÇÕES' : item.category.toUpperCase()}
              </Badge>
            </div>
          </div>
        </div>

        <Separator />

        {/* Payment Method Selected */}
        {selectedPaymentType && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Forma de pagamento:</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {getPaymentMethodIcon()}
                  <span className="font-medium truncate">{getPaymentMethodLabel()}</span>
                </div>
              </div>
              {selectedPaymentType === 'pix' && (
                <div className="flex justify-center">
                  <Badge variant="secondary" className="text-xs">
                    Melhor preço
                  </Badge>
                </div>
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

        <Separator />

        {/* Price Breakdown */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm">Subtotal:</span>
            <span className="text-xs sm:text-sm font-medium">
              {selectedPrice > 0 ? formatCurrencyForUser(selectedPrice) : '--'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm">Taxa de processamento:</span>
            <span className="text-xs sm:text-sm text-green-600 font-medium">Grátis</span>
          </div>
        </div>

        <Separator />

        {/* Total */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-base sm:text-lg font-bold">
            <span>Total:</span>
            <span className="text-primary">
              {selectedPrice > 0 ? formatCurrencyForUser(selectedPrice) : '--'}
            </span>
          </div>
          
          {selectedPaymentType === 'pix' && item.parcelado_price > item.rl_price && (
            <div className="text-xs text-green-600 text-center px-2">
              Você está economizando {formatCurrencyForUser(item.parcelado_price - item.rl_price)} pagando com PIX!
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="pt-2 sm:pt-3">
          <Button
            onClick={onProceedToPayment}
            disabled={!canProceed}
            className="w-full h-10 sm:h-12"
            size="lg"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-2 animate-spin" />
                <span className="text-xs sm:text-sm">Processando...</span>
              </>
            ) : !selectedPaymentType ? (
              <>
                <ShoppingCart className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                <span className="text-xs sm:text-sm">Selecione um método</span>
              </>
            ) : (
              <>
                <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                <span className="text-xs sm:text-sm font-medium">Finalizar Compra</span>
              </>
            )}
          </Button>
        </div>

        {/* Security Info */}
        <div className="pt-2 sm:pt-3 border-t">
          <div className="text-center space-y-1">
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Pagamento seguro</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Processado pelo Asaas
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default OrderSummary;
