import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useSupabaseItems } from '@/hooks/useSupabaseItems';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { PaymentProvider } from '@/contexts/PaymentContext';
import { Item } from '@/contexts/SupabaseItemsContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import CheckoutForm from '@/components/checkout/CheckoutForm';
import CheckoutProtection from '@/components/CheckoutProtection';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

const CheckoutPage = () => {
  const { itemId } = useParams<{ itemId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useSupabaseAuth();
  const { items, loading: itemsLoading } = useSupabaseItems();
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const validateItemAccess = async () => {
      if (authLoading || itemsLoading) return;

      // Check if user is authenticated
      if (!user) {
        toast({
          title: "Autenticação necessária",
          description: "Você precisa estar logado para fazer uma compra.",
          variant: "destructive"
        });
        navigate('/auth/login');
        return;
      }

      // Find the item
      if (!itemId) {
        toast({
          title: "Item não encontrado",
          description: "ID do item não fornecido.",
          variant: "destructive"
        });
        navigate('/');
        return;
      }

      // SECURITY: Query item directly from database to check if it's active and available
      // This prevents access via direct URL to inactive items
      try {
        const { data: itemData, error: itemError } = await supabase
          .from('items')
          .select('*')
          .eq('id', itemId)
          .eq('is_active', true) // Only active items
          .single();

        if (itemError || !itemData) {
          toast({
            title: "Item não encontrado",
            description: "O item solicitado não existe, foi removido ou não está mais disponível para compra.",
            variant: "destructive"
          });
          navigate('/');
          return;
        }

        const item = {
          ...itemData,
          category: itemData.category as any,
          external_link: itemData.external_link || null,
          description: itemData.description || null,
        } as Item;

        // Check if item has quantity available
        if (item.quantity <= 0) {
          toast({
            title: "Item indisponível",
            description: "Este item não está mais disponível.",
            variant: "destructive"
          });
          navigate('/');
          return;
        }

        // Check if item has valid prices
        if (item.rl_price <= 0 && item.parcelado_price <= 0) {
          toast({
            title: "Preços não configurados",
            description: "Este item não possui preços válidos configurados.",
            variant: "destructive"
          });
          navigate('/');
          return;
        }

        // Check if it's an admin item (only admins can buy from admin)
        const isAdminItem = item.user_id === import.meta.env.VITE_ADMIN_USER_ID;
        if (!isAdminItem) {
          toast({
            title: "Item não permitido",
            description: "Este item não está disponível para compra via checkout.",
            variant: "destructive"
          });
          navigate('/');
          return;
        }

        setSelectedItem(item);
        setLoading(false);
      } catch (error) {
        console.error('Error validating item access:', error);
        toast({
          title: "Erro de validação",
          description: "Erro ao validar acesso ao item.",
          variant: "destructive"
        });
        navigate('/');
      }
    };

    validateItemAccess();
  }, [itemId, user, authLoading, itemsLoading, navigate]);

  if (loading || authLoading || itemsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando checkout...</p>
        </Card>
      </div>
    );
  }

  if (!selectedItem) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center">
          <p className="text-muted-foreground mb-4">Item não encontrado</p>
          <Button onClick={() => navigate('/')} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar à loja
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <PaymentProvider>
      <CheckoutProtection itemId={selectedItem?.id}>
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4 md:py-8 max-w-4xl">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6 md:mb-8">
            <Button
              variant="ghost"
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 self-start"
              size="sm"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
            <div className="flex-1">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Checkout</h1>
              <p className="text-xs sm:text-sm md:text-base text-muted-foreground">
                Finalize sua compra de forma segura
              </p>
            </div>
          </div>

          {/* Checkout Form */}
          <CheckoutForm item={selectedItem} />
        </div>
      </CheckoutProtection>
    </PaymentProvider>
  );
};

export default CheckoutPage;
