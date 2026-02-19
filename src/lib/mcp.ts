// Interface para resultado das queries MCP
interface MCPResult {
  error?: string
  text_result?: Array<{ text: string }>
}

// Importar o cliente Supabase
import { supabase } from '@/integrations/supabase/client'

// Função para executar ferramentas MCP via Supabase
export const call_mcp_tool = async (toolName: string, args: any): Promise<MCPResult> => {
  try {
    if (toolName === 'query') {
      const { sql } = args
      
      console.log('Executando query real:', sql)
      
      // Detectar tipo de query e executar diretamente no Supabase
      if (sql.includes('orders') && sql.includes('COUNT')) {
        // Query de estatísticas
        const { data, error } = await supabase
          .from('orders')
          .select('*')
        
        if (error) {
          throw new Error(error.message)
        }
        
        // Calcular estatísticas
        const stats = {
          total_sales: data.length,
          total_value: data.reduce((sum, order) => sum + Number(order.payment_value), 0),
          pix_sales: data.filter(order => order.payment_method === 'PIX').length,
          card_sales: data.filter(order => order.payment_method === 'CREDIT_CARD').length,
          approved_sales: data.filter(order => order.status === 'Aprovado').length,
          pending_sales: data.filter(order => order.status === 'Em Análise').length,
          cancelled_sales: data.filter(order => order.status === 'Cancelado').length
        }
        
        return {
          text_result: [{ text: JSON.stringify([stats]) }]
        }
      } else if (sql.includes('orders') && sql.includes('ORDER BY')) {
        // Query de pedidos - primeiro buscar os pedidos
        const { data: ordersData, error: ordersError } = await supabase
          .from('orders')
          .select('*')
          .order('purchase_date', { ascending: false })
          .limit(100)
        
        if (ordersError) {
          throw new Error(ordersError.message)
        }
        
        if (!ordersData || ordersData.length === 0) {
          return {
            text_result: [{ text: JSON.stringify([]) }]
          }
        }
        
        // Buscar dados dos usuários
        const userIds = [...new Set(ordersData.map(order => order.user_id))]
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('user_id, full_name, email, phone_number')
          .in('user_id', userIds)
        
        // Buscar dados dos items
        const itemIds = [...new Set(ordersData.map(order => order.item_id))]
        const { data: itemsData, error: itemsError } = await supabase
          .from('items')
          .select('id, name, image_url, description')
          .in('id', itemIds)
        
        // Criar mapas para lookup rápido
        const usersMap = new Map(usersData?.map(user => [user.user_id, user]) || [])
        const itemsMap = new Map(itemsData?.map(item => [item.id, item]) || [])
        
        // Transformar dados para o formato esperado
        const transformedData = ordersData.map(order => {
          const user = usersMap.get(order.user_id)
          const item = itemsMap.get(order.item_id)
          
          return {
            ...order,
            customer_name: user?.full_name || order.customer_name || 'N/A',
            customer_email: user?.email || order.customer_email || 'N/A',
            customer_phone: user?.phone_number || order.customer_phone || null,
            product_name: item?.name || order.product_name || 'Produto não encontrado',
            product_image_url: item?.image_url || order.product_image_url || null,
            product_description: item?.description || order.product_description || null
          }
        })
        
        return {
          text_result: [{ text: JSON.stringify(transformedData) }]
        }
      }
      
      // Para queries genéricas, tentar execução direta (limitada)
      return {
        error: 'Query não suportada pelo MCP simplificado'
      }
    }
    
    return {
      error: `Ferramenta MCP '${toolName}' não encontrada`
    }
  } catch (error) {
    console.error('Erro na chamada MCP:', error)
    return {
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }
  }
}

// Função auxiliar para verificar se MCP está disponível
export const isMCPAvailable = (): boolean => {
  // Em produção, verificaria se o servidor MCP está acessível
  return true
}

// Função para executar query SQL via MCP
export const executeMCPQuery = async (sql: string): Promise<any[]> => {
  const result = await call_mcp_tool('query', { sql })
  
  if (result.error) {
    throw new Error(result.error)
  }
  
  if (!result.text_result || result.text_result.length === 0) {
    return []
  }
  
  try {
    return JSON.parse(result.text_result[0].text)
  } catch (error) {
    console.error('Erro ao fazer parse do resultado MCP:', error)
    return []
  }
}
