import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Trash2, Search, Eye, Shield, Package, User } from 'lucide-react';
import logger from '@/lib/logger';
import { getConfig } from '@/lib/config';
import SmartImage from '@/components/SmartImage';
import { Item } from '@/contexts/SupabaseItemsContext';

interface ItemWithUser extends Item {
  user_email?: string;
  user_profile?: {
    email: string;
  };
}

const AdminItemsManagementPage = () => {
  const { user } = useSupabaseAuth();
  const [items, setItems] = useState<ItemWithUser[]>([]);
  const [filteredItems, setFilteredItems] = useState<ItemWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [deleting, setDeleting] = useState<string | null>(null);

  const config = getConfig();
  const isSuportAdmin = user?.email === config.admin.emails[1]; // VITE_ADMIN_EMAIL_SUPORT
  // Function to get full image URL
  const getImageUrl = (item: ItemWithUser): string => {
    // If image_url exists and starts with http, use it directly
    if (item.image_url && (item.image_url.startsWith('http') || item.image_url.startsWith('blob:'))) {
      return item.image_url;
    }
    
    // If image_path exists, convert to Supabase Storage URL
    if (item.image_path) {
      // If it already contains the full URL, use it
      if (item.image_path.startsWith('http')) {
        return item.image_path;
      }
      // Otherwise, construct the Supabase Storage URL
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      return `${supabaseUrl}/storage/v1/object/public/item-images/${item.image_path}`;
    }
    
    // Fallback to placeholder
    return '/placeholder.svg';
  };

  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      // No user is logged in, redirect to home page
      toast.error('Acesso negado. Apenas o administrador principal pode acessar esta página.');
      navigate('/');
      return;
    }
    
    if (!isSuportAdmin) {
      toast.error('Acesso negado. Apenas o administrador principal pode acessar esta página.');
      navigate('/');
      return;
    }
    
    fetchAllItems();
  }, [isSuportAdmin, user, navigate]);

  useEffect(() => {
    filterItems();
  }, [items, searchTerm, selectedCategory]);

  const fetchAllItems = async () => {
    try {
      setLoading(true);

      // Use RPC function to get all items with user emails
      const { data: itemsData, error: itemsError } = await (supabase as any)
        .rpc('get_all_items_with_users');

      if (itemsError) {
        logger.error('Error calling get_all_items_with_users RPC:', itemsError);
        throw itemsError;
      }

      setItems(itemsData || []);
    } catch (error) {
      logger.error('Error fetching items:', error);
      toast.error('Erro ao carregar itens');
    } finally {
      setLoading(false);
    }
  };

  const filterItems = () => {
    let filtered = [...items];

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }

    setFilteredItems(filtered);
  };

  const deleteItem = async (itemId: string, itemName: string) => {
    try {
      setDeleting(itemId);

      const { error } = await supabase
        .from('items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      toast.success(`Item "${itemName}" removido com sucesso`);
      fetchAllItems(); // Refresh the list
    } catch (error) {
      logger.error('Error deleting item:', error);
      toast.error('Erro ao remover item');
    } finally {
      setDeleting(null);
    }
  };

  const formatPrice = (price: number): string => {
    if (price === 0) return "Grátis";
    return `R$ ${price.toFixed(2)}`;
  };

  const formatKKSPrice = (price: number): string => {
    if (price === 0) return "Grátis";
    return `${price.toFixed(2)} KKS`;
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'pally': return 'bg-yellow-100 text-yellow-800';
      case 'kina': return 'bg-green-100 text-green-800';
      case 'mage': return 'bg-purple-100 text-purple-800';
      case 'itens': return 'bg-blue-100 text-blue-800';
      case 'geral': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!isSuportAdmin) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <Shield className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">Acesso Restrito</h2>
              <p className="text-muted-foreground">
                Você não tem permissão para acessar esta página.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Carregando itens...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-7xl">
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2 mb-2">
          <Package className="h-6 w-6 md:h-8 md:w-8" />
          <span className="break-words">Gerenciamento de Itens</span>
        </h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Gerencie todos os itens criados pelos usuários do sistema
        </p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Buscar por nome do item, email do usuário ou categoria..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="w-full md:w-48">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background"
              >
                <option value="all">Todas as categorias</option>
                <option value="pally">Pally</option>
                <option value="kina">Kina</option>
                <option value="mage">Mage</option>
                <option value="itens">Itens</option>
                <option value="geral">Geral</option>
                <option value="kks">KKS</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Items count */}
      <div className="mb-4">
        <p className="text-sm text-muted-foreground">
          Mostrando {filteredItems.length} de {items.length} itens
        </p>
      </div>

      {/* Items grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.map((item) => (
          <Card key={item.id} className="overflow-hidden">
            <div className="relative">
              <div className="aspect-square">
                <SmartImage
                  src={getImageUrl(item)}
                  alt={item.name}
                  className="w-full h-full object-cover"
                  enableModal={false}
                  onError={(e) => {
                    // Fallback to placeholder if image fails to load
                    const target = e.target as HTMLImageElement;
                    target.src = '/placeholder.svg';
                  }}
                />
              </div>
              <div className="absolute top-2 left-2">
                <Badge className={getCategoryColor(item.category)}>
                  {item.category.toUpperCase()}
                </Badge>
              </div>
              <div className="absolute top-2 right-2">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={deleting === item.id}
                      className="h-8 w-8 p-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remover Item</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tem certeza que deseja remover o item "{item.name}"?
                        Esta ação não pode ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deleteItem(item.id, item.name)}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Remover
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
            
            <CardContent className="p-4">
              <div className="space-y-2">
                <h3 className="font-semibold text-lg truncate" title={item.name}>
                  {item.name}
                </h3>
                
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span className="truncate">{item.user_email}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs bg-muted px-2 py-1 rounded">
                    {item.quantity}x
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(item.created_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>

                <div className="space-y-1">
                  {item.rl_price > 0 && (
                    <div className="text-sm">
                      <span className="font-medium text-green-600">
                        RL: {formatPrice(item.rl_price)}
                      </span>
                    </div>
                  )}
                  {item.parcelado_price > 0 && (
                    <div className="text-sm">
                      <span className="font-medium text-blue-600">
                        Parcelado: {formatPrice(item.parcelado_price)}
                      </span>
                    </div>
                  )}
                  {item.kks_price > 0 && (
                    <div className="text-sm">
                      <span className="font-medium text-yellow-600">
                        {formatKKSPrice(item.kks_price)}
                      </span>
                    </div>
                  )}
                </div>

                {item.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2" title={item.description}>
                    {item.description}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredItems.length === 0 && (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum item encontrado</h3>
              <p className="text-muted-foreground">
                {searchTerm || selectedCategory !== 'all' 
                  ? 'Tente ajustar os filtros de busca.' 
                  : 'Ainda não há itens criados no sistema.'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminItemsManagementPage;
