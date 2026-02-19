import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, CheckCircle, Clock, AlertCircle, QrCode } from 'lucide-react';
// Ícones do Iconify para melhor visual profissional
import { Icon } from '@iconify/react';
import { formatCurrencyForUser } from '@/lib/locale-utils';
import { toast } from '@/components/ui/use-toast';

interface SimplePixPaymentProps {
  qrCode: string;
  copyPaste: string;
  value: number;
  onPaymentConfirmed?: () => void;
  description?: string;
  paymentLink?: string;
}

const SimplePixPayment = ({ 
  qrCode, 
  copyPaste, 
  value, 
  onPaymentConfirmed,
  description = "Pagamento PIX",
  paymentLink
}: SimplePixPaymentProps) => {
  const [copied, setCopied] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(300); // 5 minutes

  // Countdown timer
  useEffect(() => {
    if (timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining]);

  const handleCopyPaste = useCallback(async () => {
    if (!copyPaste) return;

    try {
      await navigator.clipboard.writeText(copyPaste);
      setCopied(true);
      toast({
        title: "Código copiado!",
        description: "O código PIX foi copiado para sua área de transferência.",
      });
      setTimeout(() => setCopied(false), 3000);
    } catch (error) {
      console.error('Erro ao copiar:', error);
      toast({
        title: "Erro ao copiar",
        description: "Não foi possível copiar o código PIX.",
        variant: "destructive"
      });
    }
  }, [copyPaste]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!qrCode || !copyPaste) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="p-8">
          <div className="text-center space-y-6">
            <div className="w-12 h-12 mx-auto">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-primary">
                Carregando dados PIX...
              </h3>
              <p className="text-muted-foreground">
                Aguarde enquanto geramos seu QR Code PIX.
              </p>
              <div className="text-xs text-muted-foreground">
                Isso pode levar alguns segundos.
              </div>
            </div>
            
            {/* Fallback: Link de pagamento se disponível */}
            {paymentLink && (
              <div className="border-t pt-6 mt-6">
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Ou acesse diretamente:
                  </p>
                  <a
                    href={paymentLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center w-full px-4 py-3 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-colors duration-200"
                  >
                    🔗 Abrir página de pagamento
                  </a>
                  <p className="text-xs text-muted-foreground">
                    Link direto para pagamento via PIX no Asaas
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Payment Info Header */}
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Pagamento PIX</CardTitle>
          <div className="text-3xl font-bold text-primary">
            {formatCurrencyForUser(value)}
          </div>
          {description && (
            <p className="text-muted-foreground">{description}</p>
          )}
        </CardHeader>
        <CardContent>
          {/* Timer */}
          <div className="flex items-center justify-center gap-2 text-orange-600 bg-orange-50 rounded-lg p-4">
            <Clock className="h-5 w-5" />
            <span className="font-medium">
              Tempo restante: {formatTime(timeRemaining)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* QR Code Section */}
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Icon icon="material-symbols:qr-code-2" className="h-5 w-5" fallback={<Icon icon="mdi:qrcode" className="h-5 w-5" fallback={<QrCode className="h-5 w-5" />} />} />
            Escaneie o QR Code
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="p-4 bg-white border-2 border-dashed border-gray-300 rounded-xl">
              <img
                src={`data:image/png;base64,${qrCode}`}
                alt="QR Code PIX"
                className="w-64 h-64 mx-auto"
              />
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Abra o app do seu banco e escaneie o código
          </p>
        </CardContent>
      </Card>

      {/* Copy Paste Section */}
      <Card>
        <CardHeader className="text-center">
          <CardTitle>Ou copie o código PIX</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <textarea
              readOnly
              value={copyPaste}
              className="w-full h-24 p-3 border border-input rounded-lg text-xs font-mono resize-none bg-muted"
              placeholder="Código PIX..."
            />
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyPaste}
              className={`absolute top-2 right-2 ${copied ? 'bg-green-100 border-green-300' : ''}`}
            >
              {copied ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          
          <Button
            onClick={handleCopyPaste}
            className="w-full"
            variant={copied ? "secondary" : "default"}
          >
            {copied ? (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Código Copiado!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Copiar Código PIX
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="text-primary">Como pagar com PIX</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3 text-sm">
            {[
              "Abra o app do seu banco ou carteira digital",
              "Escolha pagar via PIX",
              "Escaneie o QR Code ou cole o código PIX",
              "Confirme o pagamento"
            ].map((step, index) => (
              <li key={index} className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">
                  {index + 1}
                </div>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      {/* Status Info */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4 text-center">
          <div className="flex items-center justify-center gap-2 text-blue-700">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium">
              Aguardando confirmação do pagamento...
            </span>
          </div>
          <p className="text-xs text-blue-600 mt-1">
            O pagamento será confirmado automaticamente
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default SimplePixPayment;
