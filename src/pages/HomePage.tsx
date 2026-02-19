
import { useState } from 'react';
import { useSupabaseItems } from '@/hooks/useSupabaseItems';
import ItemCard from '@/components/ItemCard';
import CategorySelectionModal from '@/components/CategorySelectionModal';
import { Button } from '@/components/ui/button';
import { GridIcon } from 'lucide-react';

const HomePage = () => {
  const { items, loading } = useSupabaseItems();
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  // Get the latest 8 items from all categories
  const latestItems = [...items].slice(0, 8);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  return (
    <div>      <div className="py-12 mb-8 bg-gradient-hero rounded-lg shadow-lg border border-gaming-primary/20">
        <div className="text-center px-4">
          {/* <h1 className="text-4xl font-bold mb-2">Suport Vendas</h1> */}
          <p className="text-lg max-w-2xl mx-auto mb-6 text-gaming-text">
            Navegue e encontre as melhores contas para seu jogo. Entre em contato pelo WhatsApp para comprar.
          </p>
          <Button
            onClick={() => setShowCategoryModal(true)}
            className="bg-gaming-accent hover:bg-gaming-accent/90 text-gaming-background px-8 py-3 text-lg font-semibold shadow-lg border border-gaming-gold/30"
          >
            <GridIcon className="h-5 w-5 mr-2" />
            Ver Todas as Categorias
          </Button>
        </div>
      </div>

      <h2 className="text-2xl font-bold mb-6">Últimas Contas</h2>

      {latestItems.length === 0 ? (<div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-xl text-muted-foreground mb-2">Nenhuma conta disponível</p>
        <p className="text-muted-foreground">
          Em breve novas contas serão adicionadas.
        </p>
      </div>
      ) : (<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 items-stretch">
        {latestItems.map((item) => (
          <ItemCard key={item.id} item={item} />
        ))}        </div>
      )}

      <CategorySelectionModal
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
      />
    </div>
  );
};

export default HomePage;
