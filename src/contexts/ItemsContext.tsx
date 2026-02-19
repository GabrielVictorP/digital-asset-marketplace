
import { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { toast } from 'sonner';

export type Category = 'kina' | 'mage' | 'pally' | 'geral';

export interface Item {
  id: string;
  imageUrl: string;
  rlPrice: number;
  parceladoPrice: number;
  kksPrice: number;
  category: Category;
  createdAt: number;
}

interface ItemsContextType {
  items: Item[];
  addItem: (item: Omit<Item, 'id' | 'createdAt'>) => void;
  deleteItem: (id: string) => void;
  getItemsByCategory: (category: Category) => Item[];
}

const ItemsContext = createContext<ItemsContextType | undefined>(undefined);

// Mock initial data
const initialItems: Item[] = [
  {
    id: '1',
    imageUrl: '/placeholder.svg',
    rlPrice: 100,
    parceladoPrice: 110,
    kksPrice: 90,
    category: 'kina',
    createdAt: Date.now()
  },
  {
    id: '2',
    imageUrl: '/placeholder.svg',
    rlPrice: 200,
    parceladoPrice: 220,
    kksPrice: 180,
    category: 'mage',
    createdAt: Date.now()
  },
  {
    id: '3',
    imageUrl: '/placeholder.svg',
    rlPrice: 150,
    parceladoPrice: 165,
    kksPrice: 135,
    category: 'pally',
    createdAt: Date.now()
  },
  {
    id: '4',
    imageUrl: '/placeholder.svg',
    rlPrice: 80,
    parceladoPrice: 88,
    kksPrice: 0,
    category: 'geral',
    createdAt: Date.now()
  }
];

export const ItemsProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<Item[]>([]);
  
  // Load items from localStorage on initial render
  useEffect(() => {
    const storedItems = localStorage.getItem('items');
    if (storedItems) {
      setItems(JSON.parse(storedItems));
    } else {
      // Use initial mock data if nothing is stored
      setItems(initialItems);
      localStorage.setItem('items', JSON.stringify(initialItems));
    }
  }, []);
  
  // Update localStorage whenever items change
  useEffect(() => {
    localStorage.setItem('items', JSON.stringify(items));
  }, [items]);

  const addItem = (newItem: Omit<Item, 'id' | 'createdAt'>) => {
    const item: Item = {
      ...newItem,
      id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      createdAt: Date.now()
    };
    
    setItems((prev) => [item, ...prev]);
    toast.success('Item added successfully!');
  };

  const deleteItem = (id: string) => {
    setItems((prev) => prev.filter(item => item.id !== id));
    toast.success('Item deleted successfully!');
  };

  const getItemsByCategory = (category: Category) => {
    return items.filter(item => item.category === category);
  };
  return (
    <ItemsContext.Provider value={{ items, addItem, deleteItem, getItemsByCategory }}>
      {children}
    </ItemsContext.Provider>
  );
};

// Export the context and type for use in the hook
export { ItemsContext };
export type { ItemsContextType };
