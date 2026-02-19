import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { formatCurrencyForUser } from '@/lib/locale-utils'
import {
  CreditCard, 
  Zap, 
  Receipt, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  Users, 
  RefreshCw,
  ArrowLeft,
  Filter,
  Search,
  Package,
  ChevronLeft,
  ChevronRight,
  Send,
  Check,
  X
} from 'lucide-react'
import { toast } from '@/components/ui/use-toast'
import { call_mcp_tool } from '@/lib/mcp'
import SuperAdminRouteGuard from '@/components/SuperAdminRouteGuard'
import ProductDetailsModal from '@/components/ProductDetailsModal'
import ManualSendModal from '@/components/ManualSendModal'
import ItemSentModal from '@/components/ItemSentModal'

interface OrderDetails {
  id: string
  asaas_payment_id: string
  user_id: string
  item_id: string
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
  platform?: string
  email_sent_at?: string
  email_status?: string
  installment_count?: number
  total_value?: number
  credentials_sent?: boolean
  item_sent?: boolean
  has_account?: boolean
}

interface SalesStats {
  total_sales: number
  total_value: number
  pix_sales: number
  card_sales: number
  approved_sales: number
  pending_sales: number
  cancelled_sales: number
}

const SalesPage = () => {
  const { user } = useSupabaseAuth()
  const navigate = useNavigate()
  const [orders, setOrders] = useState<OrderDetails[]>([])
  const [stats, setStats] = useState<SalesStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<OrderDetails | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedOrderForSend, setSelectedOrderForSend] = useState<OrderDetails | null>(null)
  const [isSendModalOpen, setIsSendModalOpen] = useState(false)
  const [selectedOrderForItemSent, setSelectedOrderForItemSent] = useState<OrderDetails | null>(null)
  const [isItemSentModalOpen, setIsItemSentModalOpen] = useState(false)
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [methodFilter, setMethodFilter] = useState<string>('all')
  const [dateFilter, setDateFilter] = useState<string>('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)

  // Permissão verificada pelo SuperAdminRouteGuard

  // Carregar pedidos
  const loadOrders = async () => {
    if (!user) return

    setLoading(true)
    setError(null)

    try {
      // Query para buscar pedidos com dados do usuário, item e status de email
      const ordersQuery = `
        SELECT 
          o.*,
          COALESCE(p.full_name, u.full_name, o.customer_name) as customer_name,
          COALESCE(p.email, u.email, o.customer_email) as customer_email,
          COALESCE(p.phone_number, u.phone_number, o.customer_phone) as customer_phone,
          COALESCE(i.name, o.product_name) as product_name,
          COALESCE(i.image_url, o.product_image_url) as product_image_url,
          COALESCE(i.description, o.product_description) as product_description,
          COALESCE(o.installment_count, 1) as installment_count,
          COALESCE(o.total_value, o.payment_value) as total_value,
          COALESCE(o.quantity, 1) as quantity,
          o.credentials_sent,
          o.item_sent,
          CASE WHEN a.item_id IS NOT NULL THEN true ELSE false END as has_account,
          e.email_sent_at,
          e.email_status
        FROM orders o
        LEFT JOIN profiles p ON o.user_id = p.id
        LEFT JOIN users u ON o.user_id = u.user_id
        LEFT JOIN items i ON o.item_id = i.id
        LEFT JOIN accounts a ON a.item_id = o.item_id
        LEFT JOIN LATERAL (
          SELECT email_sent_at, email_status 
          FROM email_logs 
          WHERE order_id = o.id AND email_status IN ('sent', 'manual_sent')
          ORDER BY email_sent_at DESC 
          LIMIT 1
        ) e ON true
        WHERE o.status = 'Aprovado'
        ORDER BY o.purchase_date DESC
        LIMIT 100
      `

      const ordersResult = await call_mcp_tool('query', { sql: ordersQuery })
      
      if (ordersResult.error) {
        throw new Error(ordersResult.error)
      }

      const ordersData = JSON.parse(ordersResult.text_result[0].text) as OrderDetails[]
      setOrders(ordersData)

      // Query para estatísticas (apenas pedidos aprovados)
      const statsQuery = `
        SELECT 
          COUNT(*) as total_sales,
          COALESCE(SUM(payment_value), 0) as total_value,
          COUNT(CASE WHEN payment_method = 'PIX' THEN 1 END) as pix_sales,
          COUNT(CASE WHEN payment_method = 'CREDIT_CARD' THEN 1 END) as card_sales,
          COUNT(CASE WHEN status = 'Aprovado' THEN 1 END) as approved_sales,
          COUNT(CASE WHEN status = 'Em Análise' THEN 1 END) as pending_sales,
          COUNT(CASE WHEN status = 'Cancelado' THEN 1 END) as cancelled_sales
        FROM orders
        WHERE status = 'Aprovado'
      `

      const statsResult = await call_mcp_tool('query', { sql: statsQuery })
      
      if (statsResult.error) {
        throw new Error(statsResult.error)
      }

      const statsData = JSON.parse(statsResult.text_result[0].text)[0] as SalesStats
      setStats(statsData)

    } catch (err) {
      console.error('Error loading sales:', err)
      setError(err instanceof Error ? err.message : 'Erro ao carregar vendas')
      toast({
        title: "Erro ao carregar vendas",
        description: "Ocorreu um erro ao carregar os dados de vendas.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOrders()
  }, [user])

  // Filtrar pedidos
  const filteredOrders = orders.filter(order => {
    try {
      // Filtro por busca
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase()
        const matchesSearch = 
          order.product_name?.toLowerCase().includes(searchLower) ||
          order.customer_email?.toLowerCase().includes(searchLower) ||
          order.customer_name?.toLowerCase().includes(searchLower) ||
          order.asaas_payment_id?.toLowerCase().includes(searchLower)
        
        if (!matchesSearch) return false
      }


      // Filtro por método
      if (methodFilter !== 'all' && order.payment_method !== methodFilter) {
        return false
      }

      // Filtro por data
      if (dateFilter !== 'all') {
        // Verificar se a data é válida
        if (!order.purchase_date) return false
        
        const orderDate = new Date(order.purchase_date)
        
        // Verificar se a data é válida
        if (isNaN(orderDate.getTime())) {
          console.warn('Invalid purchase_date for order:', order.id, order.purchase_date)
          return false
        }
        
        const now = new Date()
        
        switch (dateFilter) {
          case 'today':
            if (!isToday(orderDate)) return false
            break
          case 'week':
            if (!isThisWeek(orderDate)) return false
            break
          case 'month':
            if (!isThisMonth(orderDate)) return false
            break
          case 'custom':
            try {
              if (startDate) {
                const startDateObj = new Date(startDate)
                if (!isNaN(startDateObj.getTime()) && orderDate < startDateObj) return false
              }
              if (endDate) {
                const endDateObj = new Date(endDate + 'T23:59:59')
                if (!isNaN(endDateObj.getTime()) && orderDate > endDateObj) return false
              }
            } catch (dateError) {
              console.warn('Error parsing custom date filter:', dateError)
              return true // Se erro na data, inclui o item para não quebrar a visualização
            }
            break
        }
      }

      return true
    } catch (error) {
      console.error('Error filtering order:', error, order)
      return true // Se erro no filtro, inclui o item para não quebrar a visualização
    }
  })

  // Funções auxiliares para filtros de data
  const isToday = (date: Date): boolean => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const isThisWeek = (date: Date): boolean => {
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    return date >= weekAgo && date <= now
  }

  const isThisMonth = (date: Date): boolean => {
    const now = new Date()
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
  }

  // Funções de utilidade
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'Aprovado':
        return 'bg-green-500 hover:bg-green-500'
      case 'Em Análise':
        return 'bg-yellow-500'
      case 'Cancelado':
        return 'bg-red-500'
      default:
        return 'bg-gray-400'
    }
  }

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'PIX':
        return <Zap className="h-4 w-4" />
      case 'CREDIT_CARD':
        return <CreditCard className="h-4 w-4" />
      case 'BOLETO':
        return <Receipt className="h-4 w-4" />
      default:
        return <DollarSign className="h-4 w-4" />
    }
  }

  const getMethodLabel = (method: string): string => {
    switch (method) {
      case 'PIX':
        return 'PIX'
      case 'CREDIT_CARD':
        return 'Cartão'
      case 'BOLETO':
        return 'Boleto'
      default:
        return method
    }
  }

  // Função para abrir modal com detalhes do pedido
  const handleOrderClick = (order: OrderDetails) => {
    setSelectedOrder(order)
    setIsModalOpen(true)
  }

  // Função para fechar modal
  const handleCloseModal = () => {
    setSelectedOrder(null)
    setIsModalOpen(false)
  }

  // Função para abrir modal de envio manual
  const handleSendClick = (order: OrderDetails) => {
    setSelectedOrderForSend(order)
    setIsSendModalOpen(true)
  }

  // Função para fechar modal de envio
  const handleCloseSendModal = () => {
    setSelectedOrderForSend(null)
    setIsSendModalOpen(false)
    // Recarregar pedidos após fechar o modal para atualizar status
    loadOrders()
  }

  // Função para abrir modal de item enviado
  const handleItemSentClick = (order: OrderDetails) => {
    setSelectedOrderForItemSent(order)
    setIsItemSentModalOpen(true)
  }

  // Função para fechar modal de item enviado
  const handleCloseItemSentModal = () => {
    setSelectedOrderForItemSent(null)
    setIsItemSentModalOpen(false)
    // Recarregar pedidos após fechar o modal para atualizar status
    loadOrders()
  }


  // Pagination calculations
  const safeFilteredOrders = filteredOrders || []
  const totalPages = Math.ceil(safeFilteredOrders.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentOrders = safeFilteredOrders.slice(startIndex, endIndex)
  
  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, methodFilter, dateFilter, startDate, endDate])

  return (
    <SuperAdminRouteGuard>
      <div className="container mx-auto px-4 py-4 md:py-8">
      {/* Header - Voltar acima do título */}
      <div className="mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/')}
          className="hover:bg-transparent p-0 h-auto text-muted-foreground hover:text-foreground mb-2"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
      </div>
      
      {/* Title aligned left */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 md:mb-8 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Vendas Aprovadas</h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Vendas aprovadas através do sistema de pagamentos Asaas
          </p>
        </div>
        <Button onClick={loadOrders} disabled={loading} variant="outline" size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-8">
          <Card>
            <CardContent className="p-3 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm font-medium text-muted-foreground">Total de Vendas</p>
                  <p className="text-lg md:text-2xl font-bold">{stats.total_sales}</p>
                </div>
                <Users className="h-6 w-6 md:h-8 md:w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm font-medium text-muted-foreground">Valor Total</p>
                  <p className="text-lg md:text-2xl font-bold">{formatCurrencyForUser(stats.total_value)}</p>
                </div>
                <DollarSign className="h-6 w-6 md:h-8 md:w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm font-medium text-muted-foreground">Aprovados</p>
                  <p className="text-lg md:text-2xl font-bold text-green-600">{stats.approved_sales}</p>
                </div>
                <TrendingUp className="h-6 w-6 md:h-8 md:w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm font-medium text-muted-foreground">Em Análise</p>
                  <p className="text-lg md:text-2xl font-bold text-yellow-600">{stats.pending_sales}</p>
                </div>
                <Calendar className="h-6 w-6 md:h-8 md:w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Card único com filtros e tabela */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              Pedidos ({safeFilteredOrders.length} de {orders.length})
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filtros dentro do card */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="h-4 w-4" />
              <span className="font-medium">Filtros</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              <div className="space-y-2">
                <Label htmlFor="search">Buscar</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Cliente, produto, ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="method">Método</Label>
                <Select value={methodFilter} onValueChange={setMethodFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="PIX">PIX</SelectItem>
                    <SelectItem value="CREDIT_CARD">Cartão</SelectItem>
                    <SelectItem value="BOLETO">Boleto</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">Período</Label>
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="today">Hoje</SelectItem>
                    <SelectItem value="week">Esta semana</SelectItem>
                    <SelectItem value="month">Este mês</SelectItem>
                    <SelectItem value="custom">Período personalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Campos de data personalizada */}
            {dateFilter === 'custom' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Data inicial</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">Data final</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
            )}
            
            <Separator className="mt-4" />
          </div>
          {/* Tabela */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Carregando vendas...</span>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-destructive mb-4">{error}</p>
              <Button onClick={loadOrders} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Tentar novamente
              </Button>
            </div>
          ) : safeFilteredOrders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum pedido encontrado com os filtros aplicados.</p>
            </div>
          ) : (
            <>
              {/* Versão Mobile - Cards */}
              <div className="block lg:hidden space-y-4">
                {currentOrders.map((order) => (
                  <Card key={order.id} className="p-4">
                    <div className="space-y-3">
                      {/* Header com cliente e data */}
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-sm">
                            {order.customer_name || 'N/A'}
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            {order.customer_email}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(order.purchase_date).toLocaleDateString('pt-BR', {
                              timeZone: 'America/Sao_Paulo'
                            })} às {new Date(order.purchase_date).toLocaleTimeString('pt-BR', {
                              timeZone: 'America/Sao_Paulo'
                            })}
                          </p>
                        </div>
                        <Badge 
                          className={`${getStatusColor(order.status)} text-white text-xs`}
                          variant="secondary"
                        >
                          {order.status}
                        </Badge>
                      </div>
                      
                      {/* Produto */}
                      <div 
                        className="flex items-center gap-3 p-2 -m-2 hover:bg-muted/50 rounded-md cursor-pointer transition-colors"
                        onClick={() => handleOrderClick(order)}
                        title="Clique para ver detalhes"
                      >
                        {order.product_image_url ? (
                          <img
                            src={order.product_image_url}
                            alt={order.product_name}
                            className="w-10 h-10 object-cover rounded border flex-shrink-0"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.style.display = 'none'
                            }}
                          />
                        ) : (
                          <div className="w-10 h-10 bg-muted rounded border flex items-center justify-center flex-shrink-0">
                            <Package className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" title={order.product_name}>
                            {order.product_name || 'Produto sem nome'}
                            {order.quantity && order.quantity > 1 && (
                              <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                {order.quantity}x
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatCurrencyForUser(order.total_value || order.payment_value)}
                            {order.installment_count && order.installment_count > 1 && (
                              <span className="ml-1">({order.installment_count}x de {formatCurrencyForUser((order.total_value || order.payment_value) / order.installment_count)})</span>
                            )}
                          </p>
                        </div>
                      </div>
                      
                      {/* Info adicional */}
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          {getMethodIcon(order.payment_method)}
                          <span>{getMethodLabel(order.payment_method)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {order.platform === 'android' ? (
                            <>
                              <span>🤖</span>
                              <span className="text-green-600 font-medium">Android</span>
                            </>
                          ) : order.platform === 'ios' ? (
                            <>
                              <span>📱</span>
                              <span className="text-blue-600 font-medium">iOS</span>
                            </>
                          ) : (
                            <span className="text-muted-foreground">N/A</span>
                          )}
                        </div>
                      </div>
                      
                      {/* Ações */}
                      {order.status === 'Aprovado' && (
                        <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
                          {order.has_account ? (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleSendClick(order)}
                                className="flex-1 min-w-max bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-300"
                              >
                                <Send className="h-3 w-3 mr-1" />
                                Enviar Credencial
                              </Button>
                              
                              <div className="flex items-center gap-1">
                                {order.credentials_sent ? (
                                  <div className="flex items-center gap-1 text-green-600 text-xs">
                                    <Check className="h-3 w-3" />
                                    <span>Enviada</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1 text-red-500 text-xs">
                                    <X className="h-3 w-3" />
                                    <span>Não Enviada</span>
                                  </div>
                                )}
                              </div>
                            </>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleItemSentClick(order)}
                                className="flex-1 min-w-max bg-green-50 hover:bg-green-100 text-green-700 border-green-300"
                              >
                                <Package className="h-3 w-3 mr-1" />
                                Enviar Item
                              </Button>
                              
                              <div className="flex items-center gap-1">
                                {order.item_sent ? (
                                  <div className="flex items-center gap-1 text-green-600 text-xs">
                                    <Check className="h-3 w-3" />
                                    <span>Enviado</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1 text-orange-500 text-xs">
                                    <X className="h-3 w-3" />
                                    <span>Não Enviado</span>
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
              
              {/* Versão Desktop - Tabela */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">Data</th>
                      <th className="text-left py-3 px-4">Cliente</th>
                      <th className="text-left py-3 px-4">Produto</th>
                      <th className="text-left py-3 px-4">Qtd</th>
                      <th className="text-left py-3 px-4">Método</th>
                      <th className="text-left py-3 px-4">Plataforma</th>
                      <th className="text-left py-3 px-4">Valor</th>
                      <th className="text-left py-3 px-4">Status</th>
                      <th className="text-left py-3 px-4">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentOrders.map((order) => (
                      <tr key={order.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-4">
                          <div className="text-sm">
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
                        <td className="py-3 px-4">
                          <div className="text-sm">
                            {order.customer_name || 'N/A'}
                            <div className="text-xs text-muted-foreground">
                              {order.customer_email}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div 
                            className="flex items-center gap-3 cursor-pointer hover:bg-muted/50 rounded-md p-2 -m-2 transition-colors"
                            onClick={() => handleOrderClick(order)}
                            title="Clique para ver detalhes"
                          >
                            {order.product_image_url ? (
                              <img
                                src={order.product_image_url}
                                alt={order.product_name}
                                className="w-8 h-8 object-cover rounded border flex-shrink-0"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement
                                  target.style.display = 'none'
                                }}
                              />
                            ) : (
                              <div className="w-8 h-8 bg-muted rounded border flex items-center justify-center flex-shrink-0">
                                <Package className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="text-sm font-medium truncate" title={order.product_name}>
                                {order.product_name || 'Produto sem nome'}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {formatCurrencyForUser(order.payment_value)}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm font-medium text-center">
                            {order.quantity || 1}
                            {order.quantity && order.quantity > 1 && (
                              <div className="text-xs text-muted-foreground">
                                unidades
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {getMethodIcon(order.payment_method)}
                            <span className="text-sm">{getMethodLabel(order.payment_method)}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {order.platform === 'android' ? (
                              <>
                                <span className="text-lg">🤖</span>
                                <span className="text-sm text-green-600 font-medium">Android</span>
                              </>
                            ) : order.platform === 'ios' ? (
                              <>
                                <span className="text-lg">📱</span>
                                <span className="text-sm text-blue-600 font-medium">iOS</span>
                              </>
                            ) : (
                              <span className="text-sm text-muted-foreground">N/A</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm font-medium">
                            {formatCurrencyForUser(order.total_value || order.payment_value)}
                            {order.installment_count && order.installment_count > 1 && (
                              <div className="text-xs text-muted-foreground">
                                {order.installment_count}x de {formatCurrencyForUser((order.total_value || order.payment_value) / order.installment_count)}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge 
                            className={`${getStatusColor(order.status)} text-white`}
                            variant="secondary"
                          >
                            {order.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {order.status === 'Aprovado' && (
                              <>
                                {/* Para itens COM conta vinculada - Botão "Enviar Credencial" */}
                                {order.has_account ? (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleSendClick(order)}
                                      className="flex items-center gap-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-300 hover:border-blue-400"
                                      title="Enviar credenciais da conta"
                                    >
                                      <Send className="h-3 w-3" />
                                      <span className="hidden sm:inline">Enviar Credencial</span>
                                    </Button>
                                    
                                    {/* Indicador de status de envio de credenciais */}
                                    <div className="flex items-center">
                                      {order.credentials_sent ? (
                                        <div className="flex items-center gap-1 text-green-600" title="Credenciais já foram enviadas">
                                          <Check className="h-4 w-4" />
                                          <span className="text-xs hidden sm:inline">Credencial Enviada</span>
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-1 text-red-500" title="Credenciais ainda não foram enviadas">
                                          <X className="h-4 w-4" />
                                          <span className="text-xs hidden sm:inline">Credencial Não Enviada</span>
                                        </div>
                                      )}
                                    </div>
                                  </>
                                ) : (
                                  /* Para itens SEM conta vinculada - Botão "Item Enviado" */
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleItemSentClick(order)}
                                      className="flex items-center gap-1 bg-green-50 hover:bg-green-100 text-green-700 border-green-300 hover:border-green-400"
                                      title="Marcar item como enviado"
                                    >
                                      <Package className="h-3 w-3" />
                                      <span className="hidden sm:inline">Enviar Item</span>
                                    </Button>
                                    
                                    {/* Indicador de status de envio do item */}
                                    <div className="flex items-center">
                                      {order.item_sent ? (
                                        <div className="flex items-center gap-1 text-green-600" title="Item já foi enviado">
                                          <Check className="h-4 w-4" />
                                          <span className="text-xs hidden sm:inline">Item Enviado</span>
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-1 text-orange-500" title="Item ainda não foi enviado">
                                          <X className="h-4 w-4" />
                                          <span className="text-xs hidden sm:inline">Item Não Enviado</span>
                                        </div>
                                      )}
                                    </div>
                                  </>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Paginação */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Mostrando {startIndex + 1} a {Math.min(endIndex, safeFilteredOrders.length)} de {safeFilteredOrders.length} pedidos
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Anterior
                    </Button>
                    
                    <span className="text-sm font-medium">
                      Página {currentPage} de {totalPages}
                    </span>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Próxima
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
      
      {/* Modal de detalhes do produto */}
      <ProductDetailsModal
        order={selectedOrder}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
      
      {/* Modal de envio manual */}
      <ManualSendModal
        order={selectedOrderForSend}
        isOpen={isSendModalOpen}
        onClose={handleCloseSendModal}
        onEmailSent={() => {
          // Atualizar lista imediatamente quando email for enviado
          loadOrders()
        }}
      />
      
      {/* Modal de item enviado */}
      <ItemSentModal
        order={selectedOrderForItemSent}
        isOpen={isItemSentModalOpen}
        onClose={handleCloseItemSentModal}
        onItemSent={() => {
          // Atualizar lista imediatamente quando item for marcado como enviado
          loadOrders()
        }}
      />
      </div>
    </SuperAdminRouteGuard>
  )
}

export default SalesPage
