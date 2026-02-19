import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/components/ui/use-toast';
import { Mail, Send, User, Package, CreditCard, AlertTriangle, CheckCircle, Loader2, Edit3, Save, X, Key } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { EmailServiceEdgeFunction } from '@/services/EmailServiceEdgeFunction';
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
}

interface AccountCredentials {
  id: string;
  email: string;
  password: string;
  token?: string;
}

interface ManualSendModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: OrderDetails | null;
  onEmailSent?: () => void;
}

const ManualSendModal: React.FC<ManualSendModalProps> = ({ isOpen, onClose, order, onEmailSent }) => {
  const [loading, setLoading] = useState(false);
  const [credentials, setCredentials] = useState<AccountCredentials | null>(null);
  const [loadingCredentials, setLoadingCredentials] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  
  // Estados para edição
  const [isEditing, setIsEditing] = useState(false);
  const [editedCredentials, setEditedCredentials] = useState<AccountCredentials | null>(null);
  const [savingCredentials, setSavingCredentials] = useState(false);

  // Load credentials when order changes
  useEffect(() => {
    if (order && isOpen) {
      loadAccountCredentials();
      setEmailSent(false);
    }
  }, [order, isOpen]);

  const loadAccountCredentials = async () => {
    if (!order) return;

    setLoadingCredentials(true);
    try {
      console.log('Loading credentials for item_id:', order.item_id);
      
      // Buscar account diretamente no Supabase
      const { data: accountData, error } = await supabase
        .from('accounts')
        .select('id, item_id, email, password, token')
        .eq('item_id', order.item_id)
        .maybeSingle();
      
      if (error) {
        console.error('Supabase error:', error);
        throw new Error(error.message);
      }

      if (accountData) {
        setCredentials({
          id: accountData.id,
          email: accountData.email,
          password: accountData.password,
          token: accountData.token || ''
        });
        console.log('✅ Account credentials loaded successfully for item:', order.item_id);
      } else {
        setCredentials(null);
        console.log('⚠️ No account found for item_id:', order.item_id);
        toast({
          title: "Sem credenciais",
          description: "Não foram encontradas credenciais para este item.",
          variant: "destructive"
        });
      }
    } catch (error) {
      logger.error('Error loading account credentials:', error);
      console.error('Failed to load credentials for item:', order.item_id, error);
      toast({
        title: "Erro ao carregar credenciais",
        description: "Não foi possível carregar as credenciais da conta.",
        variant: "destructive"
      });
    } finally {
      setLoadingCredentials(false);
    }
  };

  const handleSendEmail = async () => {
    if (!order || !credentials) return;

    setLoading(true);
    try {
      // Buscar o image_path correto do item
      let imagePath = '';
      try {
        const { data: itemData } = await supabase
          .from('items')
          .select('image_path')
          .eq('id', order.item_id)
          .single();
        
        imagePath = itemData?.image_path || '';
      } catch (itemError) {
        console.error('Error fetching item image_path:', itemError);
      }

      const emailData = {
        orderId: order.id,
        itemId: order.item_id,
        itemName: order.product_name,
        buyerEmail: order.customer_email,
        buyerName: order.customer_name,
        paymentAmount: order.payment_value,
        paymentId: order.asaas_payment_id,
        gameEmail: credentials.email,
        gamePassword: credentials.password,
        gameToken: credentials.token || '',
        itemImage: order.product_image_url || '',
        isManualSend: true, // Flag para identificar que é envio manual
        isIOSUser: order.platform === 'ios' // Identifica usuários iOS
      };

      const result = await EmailServiceEdgeFunction.processCreditCardPayment(emailData);
      
      if (result.success && result.emailSent) {
        setEmailSent(true);
        
        // Registrar o envio manual no email_logs
        try {
          await supabase
            .from('email_logs')
            .insert({
              order_id: order.id,
              item_id: order.item_id,
              buyer_email: order.customer_email,
              email_sent_at: new Date().toISOString(),
              email_status: 'manual_sent'
            });
        } catch (logError) {
          console.error('Failed to log manual send:', logError);
        }
        
        // Marcar credentials_sent como true na tabela orders
        try {
          await supabase
            .from('orders')
            .update({ credentials_sent: true })
            .eq('id', order.id);
        } catch (updateError) {
          console.error('Failed to update credentials_sent:', updateError);
        }
        
        // Chamar callback para notificar sobre o sucesso
        if (onEmailSent) {
          onEmailSent();
        }
        
        toast({
          title: "Email enviado com sucesso!",
          description: `As credenciais foram enviadas para ${order.customer_email}`,
        });
        
        // Fechar modal automaticamente após 1.5 segundos
        setTimeout(() => {
          handleClose();
        }, 1500);
      } else {
        throw new Error(result.message || 'Erro ao enviar email');
      }
    } catch (error) {
      logger.error('Error sending manual email:', error);
      toast({
        title: "Erro ao enviar email",
        description: "Ocorreu um erro ao enviar as credenciais por email.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Funções para edição
  const handleStartEdit = () => {
    if (credentials) {
      setEditedCredentials({ ...credentials });
      setIsEditing(true);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedCredentials(null);
  };

  const handleSaveCredentials = async () => {
    if (!editedCredentials || !credentials) return;

    setSavingCredentials(true);
    try {
      const { error } = await supabase
        .from('accounts')
        .update({
          email: editedCredentials.email,
          password: editedCredentials.password,
          token: editedCredentials.token || null
        })
        .eq('id', credentials.id);

      if (error) {
        throw new Error(error.message);
      }

      // Atualizar o estado local
      setCredentials({ ...editedCredentials });
      setIsEditing(false);
      setEditedCredentials(null);

      toast({
        title: "Credenciais atualizadas!",
        description: "As credenciais foram salvas no banco de dados.",
      });

      console.log('✅ Credentials updated successfully');
    } catch (error) {
      logger.error('Error saving credentials:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as credenciais.",
        variant: "destructive"
      });
    } finally {
      setSavingCredentials(false);
    }
  };

  const handleCredentialChange = (field: keyof AccountCredentials, value: string) => {
    if (editedCredentials) {
      setEditedCredentials({ 
        ...editedCredentials, 
        [field]: value 
      });
    }
  };

  const handleClose = () => {
    setCredentials(null);
    setEmailSent(false);
    setIsEditing(false);
    setEditedCredentials(null);
    onClose();
  };

  if (!order) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-blue-600">
            <Mail className="h-5 w-5" />
            Envio Manual de Credenciais
          </DialogTitle>
          <DialogDescription>
            Enviar credenciais da conta vinculada ao produto para o cliente que pagou via cartão de crédito.
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
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-blue-600" />
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    Cartão de Crédito
                  </Badge>
                </div>
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

          {/* Account Credentials */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-blue-600 flex items-center gap-2">
                <Key className="h-4 w-4 text-blue-600" />
                Credenciais da Conta
              </h3>
              
              {credentials && !isEditing && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleStartEdit}
                  className="flex items-center gap-1 text-blue-600 border-blue-300 hover:bg-blue-50"
                >
                  <Edit3 className="h-3 w-3" />
                  Editar
                </Button>
              )}
            </div>
            
            {loadingCredentials ? (
              <div className="flex items-center justify-center p-6 bg-slate-50 rounded-lg">
                <Loader2 className="h-6 w-6 animate-spin text-slate-500 mr-2" />
                <span className="text-slate-600">Carregando credenciais...</span>
              </div>
            ) : credentials ? (
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
                {isEditing && editedCredentials ? (
                  <div className="space-y-3">
                    <div className="bg-white p-3 rounded border border-green-200">
                      <span className="font-medium text-slate-600 block mb-2">📧 Email:</span>
                      <Input
                        value={editedCredentials.email}
                        onChange={(e) => handleCredentialChange('email', e.target.value)}
                        className="text-sm"
                        placeholder="Digite o email"
                      />
                    </div>
                    
                    <div className="bg-white p-3 rounded border border-green-200">
                      <span className="font-medium text-slate-600 block mb-2">🔒 Senha:</span>
                      <Input
                        value={editedCredentials.password}
                        onChange={(e) => handleCredentialChange('password', e.target.value)}
                        className="text-sm"
                        placeholder="Digite a senha"
                      />
                    </div>
                    
                    <div className="bg-white p-3 rounded border border-green-200">
                      <span className="font-medium text-slate-600 block mb-2">🎯 Token (opcional):</span>
                      <Input
                        value={editedCredentials.token || ''}
                        onChange={(e) => handleCredentialChange('token', e.target.value)}
                        className="text-sm"
                        placeholder="Digite o token (opcional)"
                      />
                    </div>
                    
                    <div className="flex gap-2 pt-2">
                      <Button
                        onClick={handleSaveCredentials}
                        disabled={savingCredentials}
                        size="sm"
                        className="flex items-center gap-1 bg-green-600 hover:bg-green-700"
                      >
                        {savingCredentials ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Save className="h-3 w-3" />
                        )}
                        {savingCredentials ? 'Salvando...' : 'Salvar'}
                      </Button>
                      
                      <Button
                        onClick={handleCancelEdit}
                        disabled={savingCredentials}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-1"
                      >
                        <X className="h-3 w-3" />
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="bg-white p-3 rounded border border-green-200">
                      <span className="font-medium text-slate-600 block mb-1">📧 Email:</span>
                      <code className="text-sm bg-slate-100 px-2 py-1 rounded text-slate-800">{credentials.email}</code>
                    </div>
                    
                    <div className="bg-white p-3 rounded border border-green-200">
                      <span className="font-medium text-slate-600 block mb-1">🔒 Senha:</span>
                      <code className="text-sm bg-slate-100 px-2 py-1 rounded text-slate-800">{credentials.password}</code>
                    </div>
                    
                    {credentials.token && (
                      <div className="bg-white p-3 rounded border border-green-200">
                        <span className="font-medium text-slate-600 block mb-1">🎯 Token:</span>
                        <code className="text-sm bg-slate-100 px-2 py-1 rounded text-slate-800 break-all">{credentials.token}</code>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <Alert className="border-orange-200 bg-orange-50">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-800">
                  <strong>Nenhuma credencial encontrada</strong><br />
                  Não há credenciais vinculadas a este produto. Verifique se a conta foi cadastrada corretamente.
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Email Status */}
          {emailSent && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <strong>Email enviado com sucesso!</strong><br />
                As credenciais foram enviadas para {order.customer_email}
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
            <Button
              onClick={handleSendEmail}
              disabled={loading || !credentials || emailSent || order.status !== 'Aprovado' || isEditing}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : emailSent ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Email Enviado
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Enviar Credenciais
                </>
              )}
            </Button>
            
            <Button 
              variant="outline" 
              onClick={handleClose}
              className="flex-1 border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              {emailSent ? 'Fechar' : 'Cancelar'}
            </Button>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ManualSendModal;
