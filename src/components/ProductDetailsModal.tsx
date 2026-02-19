import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { formatCurrencyForUser } from '@/lib/locale-utils'
import { 
  ShoppingCart, 
  Calendar, 
  DollarSign, 
  Package, 
  User, 
  Mail, 
  Phone,
  ExternalLink,
  Copy,
  Check
} from 'lucide-react'
import { useState } from 'react'
import { toast } from '@/components/ui/use-toast'

interface OrderDetails {
  id: string
  asaas_payment_id: string
  payment_value: number
  payment_method: 'PIX' | 'CREDIT_CARD' | 'BOLETO'
  purchase_date: string
  customer_name: string
  customer_email: string
  customer_phone?: string
  product_name: string
  product_image_url?: string
  product_description?: string
  product_price: number
  quantity?: number
  status: 'Aprovado' | 'Cancelado' | 'Em Análise'
  external_reference?: string
  notes?: string
  installment_count?: number
  total_value?: number
}

interface ProductDetailsModalProps {
  order: OrderDetails | null
  isOpen: boolean
  onClose: () => void
}

const ProductDetailsModal = ({ order, isOpen, onClose }: ProductDetailsModalProps) => {
  const [copiedId, setCopiedId] = useState(false)

  if (!order) return null

  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(order.asaas_payment_id)
      setCopiedId(true)
      toast({
        title: "ID copiado!",
        description: "ID do pagamento copiado para a área de transferência.",
      })
      setTimeout(() => setCopiedId(false), 2000)
    } catch (err) {
      toast({
        title: "Erro ao copiar",
        description: "Não foi possível copiar o ID do pagamento.",
        variant: "destructive"
      })
    }
  }

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'Aprovado':
        return 'bg-green-500 hover:bg-green-600'
      case 'Cancelado':
        return 'bg-red-500 hover:bg-red-600'
      case 'Em Análise':
        return 'bg-yellow-500 hover:bg-yellow-600'
      default:
        return 'bg-gray-500 hover:bg-gray-600'
    }
  }

  const getPaymentMethodLabel = (method: string): string => {
    switch (method) {
      case 'PIX':
        return 'PIX'
      case 'CREDIT_CARD':
        return 'Cartão de Crédito'
      case 'BOLETO':
        return 'Boleto Bancário'
      default:
        return method
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Detalhes do Pedido
          </DialogTitle>
          <DialogDescription>
            Informações completas sobre a compra realizada
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Coluna esquerda - Produto */}
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Produto
              </h3>
              
              {/* Imagem do produto */}
              {order.product_image_url && (
                <div className="mb-4">
                  <img
                    src={order.product_image_url}
                    alt={order.product_name}
                    className="w-full h-48 object-cover rounded-md border"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.style.display = 'none'
                    }}
                  />
                </div>
              )}

              {/* Nome do produto */}
              <div className="mb-3">
                <h4 className="font-medium text-lg">{order.product_name}</h4>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    Preço unitário: {formatCurrencyForUser(order.product_price)}
                  </p>
                  {order.quantity && order.quantity > 1 && (
                    <p className="text-sm text-muted-foreground">
                      <strong>Quantidade: {order.quantity} unidades</strong>
                    </p>
                  )}
                  {order.quantity && (
                    <p className="text-sm font-medium text-foreground">
                      Subtotal: {formatCurrencyForUser(order.product_price * order.quantity)}
                    </p>
                  )}
                </div>
              </div>

              {/* Descrição */}
              {order.product_description && (
                <div className="mb-3">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {order.product_description}
                  </p>
                </div>
              )}

              <Separator className="my-3" />

              {/* Status */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Status:</span>
                <Badge className={`${getStatusColor(order.status)} text-white`}>
                  {order.status}
                </Badge>
              </div>
            </div>
          </div>

          {/* Coluna direita - Informações do pedido */}
          <div className="space-y-4">
            {/* Informações do pagamento */}
            <div className="bg-muted/50 rounded-lg p-4">
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Pagamento
              </h3>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Valor Total:</span>
                  <span className="font-medium text-lg">
                    {formatCurrencyForUser(order.total_value || order.payment_value)}
                  </span>
                </div>

                {order.installment_count && order.installment_count > 1 && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Parcelamento:</span>
                    <span className="font-medium">
                      {order.installment_count}x de {formatCurrencyForUser(order.payment_value)}
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Método:</span>
                  <span className="font-medium">
                    {getPaymentMethodLabel(order.payment_method)}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Data:</span>
                  <span className="font-medium">
                    {new Date(order.purchase_date).toLocaleString('pt-BR')}
                  </span>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">ID Asaas:</span>
                  <div className="flex items-center gap-2">
                    <code className="text-xs bg-muted px-2 py-1 rounded">
                      {order.asaas_payment_id}
                    </code>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleCopyId}
                      className="h-6 w-6 p-0"
                    >
                      {copiedId ? (
                        <Check className="h-3 w-3 text-green-600" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>

              </div>
            </div>

            {/* Informações do cliente */}
            <div className="bg-muted/50 rounded-lg p-4">
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                <User className="h-5 w-5" />
                Cliente
              </h3>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{order.customer_name}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{order.customer_email}</span>
                </div>

                {order.customer_phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{order.customer_phone}</span>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Rodapé com ações */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
          <Button variant="outline" asChild>
            <a
              href={`https://www.asaas.com/payment/show/${order.asaas_payment_id}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Ver no Asaas
            </a>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default ProductDetailsModal
