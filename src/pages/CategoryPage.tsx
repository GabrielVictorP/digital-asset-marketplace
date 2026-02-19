
import { useSupabaseItems } from '@/hooks/useSupabaseItems';
import { Category } from '@/contexts/SupabaseItemsContext';
import ItemCard from '@/components/ItemCard';

interface CategoryPageProps {
  category: Category;
}

const CategoryPage = ({ category }: CategoryPageProps) => {
  const { getItemsByCategory, loading } = useSupabaseItems();
  const items = getItemsByCategory(category);

  // Get friendly category names
  const getCategoryName = (cat: Category): string => {
    const categoryNames: Record<Category, string> = {
      'kina': 'Kina',
      'mage': 'Mage',
      'pally': 'Pally',
      'geral': 'Geral',
      'outros': 'Outros',
      'supercell': 'Supercell',
      'freefire': 'Free Fire',
      'itens': 'Itens',
      'promocoes': 'Divulgações'
    };
    return categoryNames[cat] || cat.charAt(0).toUpperCase() + cat.slice(1);
  };

  const categoryName = getCategoryName(category);

  // Get page title - use "Contas" for Rucoy categories, keep original name for others
  const getPageTitle = (cat: Category): string => {
    if (['kina', 'mage', 'pally'].includes(cat)) {
      return 'Contas';
    }
    return getCategoryName(cat);
  };

  const pageTitle = getPageTitle(category);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">{pageTitle}</h1>      {items.length === 0 ? (<div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-xl text-muted-foreground mb-2">Nenhuma conta encontrada</p>
        <p className="text-muted-foreground">Não há contas nesta categoria ainda.</p>
      </div>
      ) : (<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 items-stretch">
        {items.map((item) => (
          <ItemCard key={item.id} item={item} />
        ))}
      </div>
      )}
    </div>
  );
};

export default CategoryPage;
