import { useEffect, useState } from 'react';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Calendar, CreditCard, Package, CheckCircle, Clock, XCircle, Banknote, Zap, Smartphone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import logger from '@/lib/logger';
import { formatCurrencyForUser } from '@/lib/locale-utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface UserOrder {
  id: string;
  asaas_payment_id: string;
  payment_value: number;
  total_value?: number;
  installment_count?: number;
  payment_method: 'PIX' | 'CREDIT_CARD' | 'BOLETO';
  purchase_date: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  product_name: string;
  product_image_url: string;
  product_description: string;
  product_price: number;
  quantity?: number;
  status: string;
  platform: string;
  external_reference: string;
  notes: string;
  created_at: string;
  updated_at: string;
  item_id: string;
  credentials_sent?: boolean;
}

interface AccountDetails {
  id: string;
  email: string;
  password: string;
  token?: string;
  item_id: string;
}

const UserDashboard = () => {
  const { user, loading: authLoading } = useSupabaseAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<UserOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<UserOrder | null>(null);
  const [accountDetails, setAccountDetails] = useState<AccountDetails | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth/login');
    }
  }, [user, authLoading, navigate]);

  // Fetch user orders
  useEffect(() => {
    const fetchOrders = async () => {
      if (!user) return;

      try {
        setLoading(true);
        setError(null);

        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .eq('user_id', user.id)
          .order('purchase_date', { ascending: false })
          .limit(50);

        if (error) {
          logger.error('Error fetching user orders:', error);
          setError('Erro ao carregar suas compras. Tente novamente.');
        } else {
          setOrders(data || []);
        }
      } catch (err) {
        logger.error('Unexpected error fetching orders:', err);
        setError('Erro inesperado. Tente novamente.');
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [user]);

  // Fetch account details for selected order
  const fetchAccountDetails = async (itemId: string) => {
    try {
      setModalLoading(true);
      console.log('🔍 Buscando conta para item_id:', itemId);
      
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('item_id', itemId)
        .maybeSingle();

      if (error) {
        console.error('❌ Erro ao buscar conta:', error);
        logger.error('Error fetching account details:', error);
        toast('Erro ao carregar detalhes da conta');
        return null;
      }

      if (data) {
        console.log('✅ Conta encontrada:', { id: data.id, email: data.email });
      } else {
        console.log('⚠️ Nenhuma conta encontrada para item_id:', itemId);
      }

      return data;
    } catch (err) {
      console.error('❌ Erro inesperado ao buscar conta:', err);
      logger.error('Unexpected error fetching account details:', err);
      toast('Erro inesperado ao carregar detalhes da conta');
      return null;
    } finally {
      setModalLoading(false);
    }
  };

  // Handle order click - usando credentials_sent do orders
  const handleOrderClick = async (order: UserOrder) => {
    console.log('🖱️ Clicou no pedido:', {
      id: order.id,
      item_id: order.item_id,
      product_name: order.product_name,
      payment_method: order.payment_method,
      credentials_sent: order.credentials_sent
    });
    
    setSelectedOrder(order);
    
    // Primeiro, verificar se há conta vinculada
    const account = await fetchAccountDetails(order.item_id);
    if (!account) {
      toast('Esta compra não possui conta vinculada');
      return;
    }
    
    // Para PIX: sempre permitir acesso (automático)
    if (order.payment_method === 'PIX') {
      setAccountDetails(account);
      setShowAccountModal(true);
      return;
    }
    
    // Para CARTÃO: verificar se credenciais foram enviadas
    if (order.payment_method === 'CREDIT_CARD') {
      if (!order.credentials_sent) {
        toast('As credenciais ainda não foram enviadas pelo administrador. Aguarde o email com suas credenciais.');
        return;
      }
      
      setAccountDetails(account);
      setShowAccountModal(true);
      return;
    }
    
    // Para outros métodos, comportamento padrão
    setAccountDetails(account);
    setShowAccountModal(true);
  };

  // Close modal
  const closeModal = () => {
    setShowAccountModal(false);
    setSelectedOrder(null);
    setAccountDetails(null);
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'Aprovado':
        return {
          label: 'Aprovado',
          color: 'bg-green-500 hover:bg-green-500 text-white',
          icon: CheckCircle
        };
      case 'Em Análise':
        return {
          label: 'Em Análise',
          color: 'bg-yellow-500 text-white',
          icon: Clock
        };
      case 'Cancelado':
        return {
          label: 'Cancelado',
          color: 'bg-red-500 text-white',
          icon: XCircle
        };
      default:
        return {
          label: status,
          color: 'bg-gray-400 text-white',
          icon: Clock
        };
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'PIX':
        return <Zap className="h-4 w-4 text-primary" />;
      case 'CREDIT_CARD':
        return <CreditCard className="h-4 w-4 text-primary" />;
      case 'BOLETO':
        return <Banknote className="h-4 w-4 text-primary" />;
      default:
        return <Package className="h-4 w-4 text-primary" />;
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'PIX':
        return 'PIX';
      case 'CREDIT_CARD':
        return 'Cartão';
      case 'BOLETO':
        return 'Boleto';
      default:
        return method;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Função para calcular o valor correto a ser exibido
  const getDisplayValue = (order: UserOrder) => {
    // Se tem total_value (valor total da compra), usar ele
    if (order.total_value && Number(order.total_value) > 0) {
      return Number(order.total_value);
    }
    // Senão, usar payment_value
    return Number(order.payment_value);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-[calc(100vh-200px)] flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 border-2 border-current border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-muted-foreground">Carregando suas compras...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-4 md:py-8">
      {/* Header - Voltar acima do título */}
      <div className="mb-4">
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar à loja
        </Link>
      </div>
      
      {/* Title */}
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold">Minhas Compras</h1>
        <p className="text-muted-foreground">
          Histórico completo das suas compras
        </p>
        {user?.email && (
          <p className="text-sm text-muted-foreground mt-2">
            Logado como: <span className="font-medium">{user.email}</span>
          </p>
        )}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Seus Pedidos ({orders.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">Nenhuma compra encontrada</h3>
              <p className="mb-4">
                Você ainda não fez nenhuma compra em nossa loja.
              </p>
              <Link 
                to="/" 
                className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-md transition-colors"
              >
                <Package className="h-4 w-4" />
                Explorar Produtos
              </Link>
            </div>
          ) : (
            <>
              {/* Versão mobile/tablet - cards */}
              <div className="block md:hidden space-y-4">
                {orders.map((order) => {
                  const statusInfo = getStatusInfo(order.status);
                  
                  return (
                    <div
                      key={order.id}
                      className="bg-card border rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleOrderClick(order)}
                    >
                      {/* Header com imagem e nome */}
                      <div className="flex items-start gap-3 mb-3">
                        {order.product_image_url ? (
                          <img
                            src={order.product_image_url}
                            alt={order.product_name}
                            className="w-12 h-12 object-cover rounded border flex-shrink-0"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.style.display = 'none'
                            }}
                          />
                        ) : (
                          <div className="w-12 h-12 bg-muted rounded border flex items-center justify-center flex-shrink-0">
                            <Package className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm truncate" title={order.product_name}>
                            {order.product_name || 'Produto sem nome'}
                            {order.quantity && order.quantity > 1 && (
                              <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                {order.quantity}x
                              </span>
                            )}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {formatCurrencyForUser(getDisplayValue(order))}
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            <Badge className={`${statusInfo.color} text-xs`} variant="secondary">
                              {statusInfo.label}
                            </Badge>
                            <div className="flex items-center gap-2">
                              {getPaymentMethodIcon(order.payment_method)}
                              <span className="text-xs">{getPaymentMethodLabel(order.payment_method)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Info adicional */}
                      <div className="flex justify-between items-center text-xs text-muted-foreground">
                        <span>
                          {new Date(order.purchase_date).toLocaleDateString('pt-BR', {
                            timeZone: 'America/Sao_Paulo'
                          })}
                        </span>
                        <span>
                          {order.platform === 'android' ? '🤖 Android' : order.platform === 'ios' ? '📱 iOS' : 'N/A'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Versão desktop - tabela */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-2 md:px-4 text-xs md:text-sm">Data</th>
                        <th className="text-left py-3 px-2 md:px-4 text-xs md:text-sm">Produto</th>
                        <th className="text-left py-3 px-2 md:px-4 text-xs md:text-sm">Qtd</th>
                        <th className="text-left py-3 px-2 md:px-4 text-xs md:text-sm">Método</th>
                        <th className="text-left py-3 px-2 md:px-4 text-xs md:text-sm">Plataforma</th>
                        <th className="text-left py-3 px-2 md:px-4 text-xs md:text-sm">Valor</th>
                        <th className="text-left py-3 px-2 md:px-4 text-xs md:text-sm">Status</th>
                        <th className="text-left py-3 px-2 md:px-4 text-xs md:text-sm">ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((order) => {
                        const statusInfo = getStatusInfo(order.status);
                        
                        return (
                          <tr 
                            key={order.id} 
                            className="border-b hover:bg-muted/50 cursor-pointer transition-colors"
                            onClick={() => handleOrderClick(order)}
                          >
                            <td className="py-3 px-2 md:px-4">
                              <div className="text-xs md:text-sm">
                                {new Date(order.purchase_date).toLocaleDateString('pt-BR', {
                                  timeZone: 'America/Sao_Paulo'
                                })}
                                <div className="text-xs text-muted-foreground">
                                  {new Date(order.purchase_date).toLocaleTimeString('pt-BR', {
                                    timeZone: 'America/Sao_Paulo'
                                  })}
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-2 md:px-4">
                              <div className="flex items-center gap-2 md:gap-3">
                                {order.product_image_url ? (
                                  <img
                                    src={order.product_image_url}
                                    alt={order.product_name}
                                    className="w-6 h-6 md:w-8 md:h-8 object-cover rounded border flex-shrink-0"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement
                                      target.style.display = 'none'
                                    }}
                                  />
                                ) : (
                                  <div className="w-6 h-6 md:w-8 md:h-8 bg-muted rounded border flex items-center justify-center flex-shrink-0">
                                    <Package className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <div className="text-xs md:text-sm font-medium truncate" title={order.product_name}>
                                    {order.product_name || 'Produto sem nome'}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {formatCurrencyForUser(getDisplayValue(order))}
                                    {order.installment_count && order.installment_count > 1 && (
                                      <span className="ml-1 text-xs">({order.installment_count}x de {formatCurrencyForUser(Number(order.payment_value))})</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-2 md:px-4">
                              <div className="text-xs md:text-sm font-medium text-center">
                                {order.quantity || 1}
                                {order.quantity && order.quantity > 1 && (
                                  <div className="text-xs text-muted-foreground">
                                    unidades
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-2 md:px-4">
                              <div className="flex items-center gap-1 md:gap-2">
                                <span className="text-xs md:text-sm">{getPaymentMethodIcon(order.payment_method)}</span>
                                <span className="text-xs md:text-sm">{getPaymentMethodLabel(order.payment_method)}</span>
                              </div>
                            </td>
                            <td className="py-3 px-2 md:px-4">
                              <div className="flex items-center gap-2">
                                {order.platform === 'android' ? (
                                  <>
                                    <span className="text-sm md:text-lg">🤖</span>
                                    <span className="text-xs md:text-sm text-green-600 font-medium">Android</span>
                                  </>
                                ) : order.platform === 'ios' ? (
                                  <>
                                    <span className="text-sm md:text-lg">📱</span>
                                    <span className="text-xs md:text-sm text-blue-600 font-medium">iOS</span>
                                  </>
                                ) : (
                                  <span className="text-xs md:text-sm text-muted-foreground">N/A</span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-2 md:px-4">
                              <div className="text-xs md:text-sm font-medium">
                                {formatCurrencyForUser(getDisplayValue(order))}
                                {order.installment_count && order.installment_count > 1 && (
                                  <div className="text-xs text-muted-foreground">
                                    {order.installment_count}x de {formatCurrencyForUser(Number(order.payment_value))}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-2 md:px-4">
                              <Badge 
                                className={`${statusInfo.color} text-xs`}
                                variant="secondary"
                              >
                                {statusInfo.label}
                              </Badge>
                            </td>
                            <td className="py-3 px-2 md:px-4">
                              <code className="text-xs bg-muted px-2 py-1 rounded">
                                {order.asaas_payment_id}
                              </code>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
      
      {/* Modal de detalhes da conta */}
      <Dialog open={showAccountModal} onOpenChange={closeModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Detalhes da Conta
            </DialogTitle>
          </DialogHeader>
          
          {modalLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-8 w-8 border-2 border-current border-t-transparent rounded-full animate-spin" />
              <span className="ml-2">Carregando...</span>
            </div>
          ) : accountDetails && selectedOrder ? (
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
                <h3 className="font-semibold text-blue-900 mb-2">
                  {selectedOrder.product_name}
                </h3>
                <p className="text-sm text-blue-700">
                  Comprado em {new Date(selectedOrder.purchase_date).toLocaleDateString('pt-BR', {
                    timeZone: 'America/Sao_Paulo'
                  })}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  {getPaymentMethodIcon(selectedOrder.payment_method)}
                  <span className="text-xs text-blue-600 font-medium">
                    {getPaymentMethodLabel(selectedOrder.payment_method)}
                    {selectedOrder.payment_method === 'PIX' ? ' (Enviado automaticamente)' : ' (Enviado pelo administrador)'}
                  </span>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="bg-white border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">📬</span>
                    <span className="font-medium text-gray-700">Email:</span>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded px-3 py-2 font-mono text-sm text-black">
                    {accountDetails.email}
                  </div>
                </div>
                
                <div className="bg-white border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">🔐</span>
                    <span className="font-medium text-gray-700">Senha:</span>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded px-3 py-2 font-mono text-sm text-black">
                    {accountDetails.password}
                  </div>
                </div>
                
                {accountDetails.token && (
                  <div className="bg-white border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">🏠</span>
                      <span className="font-medium text-gray-700">Token:</span>
                    </div>
                    <div className="bg-gray-50 border border-gray-200 rounded px-3 py-2 font-mono text-sm text-black">
                      {accountDetails.token}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800">
                  <strong>Importante:</strong> Guarde essas informações em local seguro. 
                  Você pode acessar esses dados sempre que precisar aqui no seu dashboard.
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma informação de conta encontrada.
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserDashboard;
