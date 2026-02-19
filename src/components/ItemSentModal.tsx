import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/components/ui/use-toast';
import { Package, User, CheckCircle, Loader2, AlertTriangle, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import logger from '@/lib/logger';

interface OrderDetails {
  id: string;
  asaas_payment_id: string;
  user_id: string;
  item_id: string;
  payment_value: number;
  payment_method: 'PIX' | 'CREDIT_CARD' | 'BOLETO';
  purchase_date: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  product_name: string;
  product_image_url?: string;
  product_description?: string;
  product_price: number;
  status: 'Aprovado' | 'Cancelado' | 'Em Análise';
  external_reference?: string;
  notes?: string;
  platform?: string;
  item_sent?: boolean;
  has_account?: boolean;
}

interface ItemSentModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: OrderDetails | null;
  onItemSent?: () => void;
}

const ItemSentModal: React.FC<ItemSentModalProps> = ({ isOpen, onClose, order, onItemSent }) => {
  const [loading, setLoading] = useState(false);
  const [itemSent, setItemSent] = useState(false);

  const handleConfirmSent = async () => {
    if (!order) return;

    setLoading(true);
    try {
      // Atualizar o campo item_sent para true na tabela orders usando Supabase
      const { error } = await supabase
        .from('orders')
        .update({ 
          item_sent: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', order.id);

      if (error) {
        throw new Error(error.message);
      }

      setItemSent(true);
      
      // Chamar callback para notificar sobre o sucesso
      if (onItemSent) {
        onItemSent();
      }
      
      toast({
        title: "Item marcado como enviado!",
        description: `O item "${order.product_name}" foi marcado como enviado para ${order.customer_name}`,
      });

      logger.info(`Item sent confirmed for order ${order.id}`);
      
      // Fechar modal automaticamente após 1.5 segundos
      setTimeout(() => {
        handleClose();
      }, 1500);
      
    } catch (error) {
      logger.error('Error updating item_sent status:', error);
      toast({
        title: "Erro ao marcar item como enviado",
        description: "Ocorreu um erro ao atualizar o status do item.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setItemSent(false);
    onClose();
  };

  if (!order) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-green-600">
            <Package className="h-5 w-5" />
            Enviar Item Físico
          </DialogTitle>
          <DialogDescription>
            Confirme que você enviou o item físico para o cliente. Esta ação marcará o pedido como "Item Enviado".
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Order Information */}
          <div className="bg-slate-50 p-4 rounded-lg border">
            <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <Package className="h-4 w-4" />
              Informações do Pedido
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="font-medium text-slate-600">Produto:</span>
                <p className="text-slate-900">{order.product_name}</p>
              </div>
              <div>
                <span className="font-medium text-slate-600">Valor:</span>
                <p className="text-slate-900">R$ {order.payment_value.toFixed(2)}</p>
              </div>
              <div>
                <span className="font-medium text-slate-600">Cliente:</span>
                <p className="text-slate-900">{order.customer_name}</p>
              </div>
              <div>
                <span className="font-medium text-slate-600">Email:</span>
                <p className="text-slate-900">{order.customer_email}</p>
              </div>
              <div>
                <span className="font-medium text-slate-600">Método:</span>
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  {order.payment_method === 'PIX' ? 'PIX' : 
                   order.payment_method === 'CREDIT_CARD' ? 'Cartão de Crédito' : 'Boleto'}
                </Badge>
              </div>
              <div>
                <span className="font-medium text-slate-600">Status:</span>
                <Badge 
                  variant="secondary" 
                  className={order.status === 'Aprovado' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}
                >
                  {order.status}
                </Badge>
              </div>
            </div>
          </div>

          <Separator />

          {/* Item Type Info */}
          <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <span className="font-semibold text-orange-800">Item Físico</span>
            </div>
            <p className="text-sm text-orange-700">
              Este produto não possui credenciais digitais vinculadas. É um item físico que deve ser enviado manualmente para o cliente.
            </p>
          </div>

          {/* Confirmation Status */}
          {itemSent && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <strong>Item marcado como enviado!</strong><br />
                O status foi atualizado e o cliente poderá ver que o item foi despachado.
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
            <Button
              onClick={handleConfirmSent}
              disabled={loading || itemSent || order.status !== 'Aprovado'}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Atualizando...
                </>
              ) : itemSent ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Item Marcado como Enviado
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Confirmar que Enviei o Item
                </>
              )}
            </Button>
            
            <Button 
              variant="outline" 
              onClick={handleClose}
              className="flex-1 border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              {itemSent ? 'Fechar' : 'Cancelar'}
            </Button>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ItemSentModal;
