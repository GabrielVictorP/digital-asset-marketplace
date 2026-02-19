import { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { toast } from 'sonner';
import logger from '@/lib/logger';
import { getConfig } from '@/lib/config';

export type Category = 'kina' | 'mage' | 'pally' | 'geral' | 'outros' | 'supercell' | 'freefire' | 'itens' | 'promocoes';

// Helper type for database items that might not have external_link yet
type DatabaseItem = {
  id: string;
  name: string;
  image_url: string;
  image_path: string | null;
  rl_price: number;
  parcelado_price: number;
  kks_price: number;
  purchased_value: number;
  quantity: number;
  category: string;
  user_id: string | null;
  created_at: string;
  updated_at: string;
  is_active?: boolean;
  external_link?: string | null;
  description?: string | null;
};

// Type for Supabase query result
type SupabaseQueryResult = DatabaseItem[] | null;

export interface Item {
  id: string;
  name: string;
  image_url: string;
  image_path: string | null;
  rl_price: number;
  parcelado_price: number;
  kks_price: number;
  purchased_value: number;
  quantity: number;
  category: Category;
  external_link: string | null;
  description: string | null;
  user_id: string | null;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

interface ItemsContextType {
  items: Item[];
  loading: boolean;
  addItem: (item: Omit<Item, 'id' | 'created_at' | 'updated_at' | 'image_url' | 'user_id' | 'is_active'>) => Promise<void>;
  updateItem: (id: string, updates: Partial<Omit<Item, 'id' | 'created_at' | 'updated_at' | 'image_url' | 'user_id'>>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  markItemAsSold: (id: string, soldValue: number, quantitySold?: number, parcelaInfo?: {
    valorTotal: number;
    valorRecebido: number;
    isParcelado: boolean;
    parcelasTotal: number;
    parcelasPagas: number;
  }) => Promise<void>;
  hideItemFromSales: (id: string) => Promise<void>; // New function for soft delete
  addKKSQuantity: (quantity: number, kksPrice: number) => Promise<void>;
  removeKKSQuantity: (quantity: number) => Promise<void>;
  updateKKSPrice: (newPrice: number) => Promise<void>;
  getItemsByCategory: (category: Category) => Item[];
  getUserItemsByCategory: (category: Category) => Item[];
  getKKSItem: () => Item | undefined;
  uploadImage: (file: File) => Promise<string | null>;
  refreshItems: () => Promise<void>;
  getItemById: (id: string) => Item | undefined;
  getItemWithSensitiveData: (id: string) => Promise<Item | null>;
  getUserItems: () => Promise<Item[]>;
  getAllItemsForAdmin: () => Promise<Item[]>; // New function for admin to see all items including inactive
}

const SupabaseItemsContext = createContext<ItemsContextType | undefined>(undefined);

export const SupabaseItemsProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useSupabaseAuth();  const fetchItems = async () => {
    try {
      // Try to select with external_link, description and is_active first
      // Only fetch active items for public view
      const { data, error } = await supabase
        .from('items')
        .select(`
          id,
          name,
          image_url,
          image_path,
          rl_price,
          parcelado_price,
          kks_price,
          quantity,
          purchased_value,
          category,
          external_link,
          description,
          user_id,
          created_at,
          updated_at,
          is_active
        `)
        .eq('is_active', true) // Filtrar apenas itens ativos
        .order('updated_at', { ascending: false });

      // If error is about missing columns, retry without them
      if (error && (error.message.includes("external_link") || error.message.includes("description") || error.message.includes("is_active"))) {
        const fallbackResult = await supabase
          .from('items')
          .select(`
            id,
            name,
            image_url,
            image_path,
            rl_price,
            parcelado_price,
            kks_price,
            quantity,
            purchased_value,
            category,
            user_id,
            created_at,
            updated_at
          `)
          .order('updated_at', { ascending: false });

        const fallbackData = fallbackResult.data as unknown as DatabaseItem[];
        const fallbackError = fallbackResult.error;

        if (fallbackError) {
          logger.error('Error fetching items (fallback):', fallbackError);
          toast.error('Failed to fetch items');
          return;
        }        // Use fallback data
        const typedItems = (fallbackData || []).map((item: DatabaseItem) => ({
          ...item,
          category: item.category as Category,
          external_link: null, // Missing column
          description: null, // Missing column
          quantity: item.quantity || 1, // Use database value or default
          purchased_value: item.purchased_value || 0, // Use database value or default
          user_id: item.user_id || null // Use database value or default
        })) as Item[];

        setItems(typedItems);
        return;
      }

      if (error) {
        logger.error('Error fetching items:', error);
        toast.error('Failed to fetch items');
        return;
      }      // Type assertion to ensure category matches our Category type
      const typedItems = ((data as unknown as DatabaseItem[]) || []).map((item: DatabaseItem) => ({
        ...item,
        category: item.category as Category,
        external_link: item.external_link || null, // Handle missing column gracefully
        description: item.description || null, // Handle missing column gracefully
        quantity: item.quantity || 1, // Handle missing column gracefully
        purchased_value: item.purchased_value || 0, // Use database value or default
        user_id: item.user_id || null // Use database value or default
      })) as Item[];

      setItems(typedItems);
    } catch (error) {
      logger.error('Error fetching items:', error);
      toast.error('Failed to fetch items');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []); // Re-fetch when component mounts

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = fileName;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file);

      if (uploadError) {
        logger.error('Upload error:', uploadError);
        toast.error('Failed to upload image');
        return null;
      }

      return filePath;
    } catch (error) {
      logger.error('Error uploading image:', error);
      toast.error('Failed to upload image');
      return null;
    }
  }; const addItem = async (newItem: Omit<Item, 'id' | 'created_at' | 'updated_at' | 'image_url' | 'user_id'>) => {
    if (!user) {
      toast.error('You must be logged in to create items');
      return;
    } try {

      // Prepare item data, excluding description if it might not exist in DB
      const itemToInsert = {
        ...newItem,
        user_id: user.id
      };

      // Try to insert with description first, if it fails, try without description
      let { data, error } = await supabase
        .from('items')
        .insert([itemToInsert])
        .select()
        .single();

      // If error is about missing description column, retry without description
      if (error && error.message.includes("description")) {
        const { description, ...itemWithoutDescription } = itemToInsert;

        const result = await supabase
          .from('items')
          .insert([itemWithoutDescription])
          .select()
          .single();

        data = result.data;
        error = result.error;
      } if (error) {
        logger.error('Error adding item:', error);
        toast.error('Failed to add item');
        return;
      }

      // Type assertion for the returned data
      const typedItem = {
        ...data,
        category: data.category as Category
      } as Item;

      setItems(prev => [typedItem, ...prev]);
      toast.success('Item added successfully!');
    } catch (error) {
      logger.error('Error adding item:', error);
      toast.error('Failed to add item');
    }
  };
  const deleteItem = async (id: string) => {
    if (!user) {
      toast.error('You must be logged in to delete items');
      return;
    }

    try {
      const { error } = await supabase
        .from('items')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        logger.error('Error deleting item:', error);
        toast.error('Failed to delete item');
        return;
      }

      setItems(prev => prev.filter(item => item.id !== id));
      toast.success('Item deleted successfully!');
    } catch (error) {
      logger.error('Error deleting item:', error);
      toast.error('Failed to delete item');
    }
  };
  const markItemAsSold = async (
    id: string,
    soldValue: number,
    quantitySold: number = 1,
    parcelaInfo?: {
      valorTotal: number;
      valorRecebido: number;
      isParcelado: boolean;
      parcelasTotal: number;
      parcelasPagas: number;
    }
  ) => {
    if (!user) {
      toast.error('You must be logged in to mark items as sold');
      return;
    }

    try {
      // First, get the item details
      const item = items.find(item => item.id === id);
      if (!item) {
        toast.error('Item not found');
        return;
      }      // Check if it's KKS currency
      const isKKS = item.name.toLowerCase() === 'kks';

      if (isKKS) {
        // For KKS, decrease quantity but don't remove
        if (item.quantity < quantitySold) {
          toast.error(`Quantidade insuficiente de KKS. Disponível: ${item.quantity}`);
          return;
        }

        const newQuantity = item.quantity - quantitySold;        // For KKS, calculate values based on quantity
        // soldValue is the TOTAL value the user received (can include installments, etc.)
        // Only the purchased value should be multiplied by quantity
        const totalSoldValue = soldValue; // User enters the actual total received
        const unitPurchasedValue = item.purchased_value || item.rl_price || 0;
        const totalPurchasedValue = unitPurchasedValue * quantitySold;

        logger.log('KKS Sale Calculation:', {
          quantitySold,
          unitPurchasedValue,
          totalSoldValue,
          totalPurchasedValue,
          profit: totalSoldValue - totalPurchasedValue
        });        // Add to sold_items table - check if item with same base name already exists
        const { data: existingSoldItem, error: checkError } = await supabase
          .from('sold_items')
          .select('*')
          .eq('name', item.name) // Check for base name without quantity suffix
          .eq('user_id', user.id)
          .maybeSingle();

        if (checkError && checkError.code !== 'PGRST116') {
          logger.error('Error checking existing sold item:', checkError);
          toast.error('Failed to check existing sold items');
          return;
        } let soldError;
        if (existingSoldItem) {
          // Update existing sold item by adding values and quantities
          const existingQuantity = (existingSoldItem as Record<string, unknown>).quantity as number || 1;
          const newQuantity = existingQuantity + quantitySold;
          const newSoldValue = existingSoldItem.sold_value + totalSoldValue;
          const newPurchasedValue = existingSoldItem.purchased_value + totalPurchasedValue;          // For parcelas, if this is a new installment payment, update accordingly
          const existingValorTotal = (existingSoldItem as Record<string, unknown>).valor_total as number || existingSoldItem.sold_value;
          const existingValorRecebido = (existingSoldItem as Record<string, unknown>).valor_recebido as number || existingSoldItem.sold_value;

          const updateData: Record<string, unknown> = {
            name: item.name,
            sold_value: newSoldValue,
            purchased_value: newPurchasedValue,
            quantity: newQuantity,
            sold_at: new Date().toISOString() // Update to current date when adding to existing sale
          };

          if (parcelaInfo) {
            updateData.valor_total = parcelaInfo.valorTotal;
            updateData.valor_recebido = parcelaInfo.valorRecebido;
            updateData.is_parcelado = parcelaInfo.isParcelado;
            updateData.parcelas_total = parcelaInfo.parcelasTotal;
            updateData.parcelas_pagas = parcelaInfo.parcelasPagas;
          } else {
            // Default values for non-parcela sales
            updateData.valor_total = newSoldValue;
            updateData.valor_recebido = newSoldValue;
            updateData.is_parcelado = false;
            updateData.parcelas_total = 1;
            updateData.parcelas_pagas = 1;
          }

          const { error } = await supabase
            .from('sold_items')
            .update(updateData)
            .eq('id', existingSoldItem.id)
            .eq('user_id', user.id);

          soldError = error;
        } else {
          // Create new sold item
          const insertData: Record<string, unknown> = {
            name: item.name,
            category: item.category,
            sold_value: totalSoldValue,
            purchased_value: totalPurchasedValue,
            quantity: quantitySold,
            user_id: user.id
          };

          if (parcelaInfo) {
            insertData.valor_total = parcelaInfo.valorTotal;
            insertData.valor_recebido = parcelaInfo.valorRecebido;
            insertData.is_parcelado = parcelaInfo.isParcelado;
            insertData.parcelas_total = parcelaInfo.parcelasTotal;
            insertData.parcelas_pagas = parcelaInfo.parcelasPagas;
          } else {
            // Default values for non-parcela sales
            insertData.valor_total = totalSoldValue;
            insertData.valor_recebido = totalSoldValue;
            insertData.is_parcelado = false;
            insertData.parcelas_total = 1;
            insertData.parcelas_pagas = 1;
          }

          // Insert basic data only for now
          const { error } = await supabase
            .from('sold_items')
            .insert([{
              name: item.name,
              category: item.category,
              sold_value: totalSoldValue,
              purchased_value: totalPurchasedValue,
              quantity: quantitySold,
              user_id: user.id
            }]);

          soldError = error;
        }

        if (soldError) {
          logger.error('Error adding to sold items:', soldError);
          toast.error('Failed to mark KKS as sold');
          return;
        }

        // Update quantity in items table (never delete KKS, ensure minimum 1)
        const finalQuantity = Math.max(1, newQuantity);
        await updateItem(id, {
          quantity: finalQuantity
        });

        const profit = totalSoldValue - totalPurchasedValue;
        toast.success(`${quantitySold} KKS vendidos! Lucro: R$ ${profit.toFixed(2)}`);
      } else {
        // For regular items, handle normally but respect quantity
        if (item.quantity < quantitySold) {
          toast.error('Quantidade insuficiente');
          return;
        }        // Add to sold_items table - check if item with same base name already exists
        const { data: existingSoldItem, error: checkError } = await supabase
          .from('sold_items')
          .select('*')
          .eq('name', item.name) // Check for base name without quantity suffix
          .eq('user_id', user.id)
          .maybeSingle();

        if (checkError && checkError.code !== 'PGRST116') {
          logger.error('Error checking existing sold item:', checkError);
          toast.error('Failed to check existing sold items');
          return;
        } let soldError;
        if (existingSoldItem) {
          // Update existing sold item by adding values and quantities
          const existingQuantity = (existingSoldItem as Record<string, unknown>).quantity as number || 1;
          const newQuantity = existingQuantity + quantitySold;
          const newSoldValue = existingSoldItem.sold_value + soldValue;
          const newPurchasedValue = existingSoldItem.purchased_value + ((item.purchased_value || 0) * quantitySold); const updateData: Record<string, unknown> = {
            name: item.name,
            sold_value: newSoldValue,
            purchased_value: newPurchasedValue,
            quantity: newQuantity,
            sold_at: new Date().toISOString() // Update to current date when adding to existing sale
          };

          if (parcelaInfo) {
            updateData.valor_total = parcelaInfo.valorTotal;
            updateData.valor_recebido = parcelaInfo.valorRecebido;
            updateData.is_parcelado = parcelaInfo.isParcelado;
            updateData.parcelas_total = parcelaInfo.parcelasTotal;
            updateData.parcelas_pagas = parcelaInfo.parcelasPagas;
          } else {
            // Default values for non-parcela sales
            updateData.valor_total = newSoldValue;
            updateData.valor_recebido = newSoldValue;
            updateData.is_parcelado = false;
            updateData.parcelas_total = 1;
            updateData.parcelas_pagas = 1;
          }

          const { error } = await supabase
            .from('sold_items')
            .update(updateData)
            .eq('id', existingSoldItem.id)
            .eq('user_id', user.id);

          soldError = error;
        } else {
          // Create new sold item
          const insertData: Record<string, unknown> = {
            name: item.name,
            category: item.category,
            sold_value: soldValue,
            purchased_value: (item.purchased_value || 0) * quantitySold,
            quantity: quantitySold,
            user_id: user.id
          };

          if (parcelaInfo) {
            insertData.valor_total = parcelaInfo.valorTotal;
            insertData.valor_recebido = parcelaInfo.valorRecebido;
            insertData.is_parcelado = parcelaInfo.isParcelado;
            insertData.parcelas_total = parcelaInfo.parcelasTotal;
            insertData.parcelas_pagas = parcelaInfo.parcelasPagas;
          } else {
            // Default values for non-parcela sales
            insertData.valor_total = soldValue;
            insertData.valor_recebido = soldValue;
            insertData.is_parcelado = false;
            insertData.parcelas_total = 1;
            insertData.parcelas_pagas = 1;
          }

          // Insert basic data only for now - fallback if migration not applied
          const { error } = await supabase
            .from('sold_items')
            .insert([{
              name: item.name,
              category: item.category,
              sold_value: soldValue,
              purchased_value: (item.purchased_value || 0) * quantitySold,
              quantity: quantitySold,
              user_id: user.id
            }]);

          soldError = error;
        }

        if (soldError) {
          logger.error('Error adding to sold items:', soldError);
          toast.error('Failed to mark item as sold');
          return;
        }

        const newQuantity = item.quantity - quantitySold;

        const cfg = getConfig();
        if (newQuantity <= 0) {
          if (cfg.isDev) {
            // Em modo de teste/desenvolvimento, manter item visível na vitrine (ajuste solicitado)
            await updateItem(id, {
              quantity: 1
            });
          } else {
            // Em produção, remover item quando zerar o estoque
            const { error: deleteError } = await supabase
              .from('items')
              .delete()
              .eq('id', id)
              .eq('user_id', user.id);

            if (deleteError) {
              logger.error('Error removing item:', deleteError);
              toast.error('Failed to remove item from inventory');
              return;
            }

            // Remove item from local state
            setItems(prev => prev.filter(item => item.id !== id));
          }
        } else {
          // Update quantity
          await updateItem(id, {
            quantity: newQuantity
          });
        }

        toast.success('Item vendido com sucesso!');
      }
      toast.success('Item marked as sold successfully!');
    } catch (error) {
      logger.error('Error marking item as sold:', error);
      toast.error('Failed to mark item as sold');
    }
  };
  const updateItem = async (id: string, updates: Partial<Omit<Item, 'id' | 'created_at' | 'updated_at' | 'image_url' | 'user_id'>>) => {
    if (!user) {
      toast.error('You must be logged in to update items');
      return;
    }

    logger.log('updateItem called for:', { id, userId: user.id });

    try {
      // Prepare update data with current timestamp to ensure item moves to the top
      const currentTimestamp = new Date().toISOString();
      const updateData = {
        ...updates,
        updated_at: currentTimestamp
      };

      logger.log('Attempting to update item:', id);

      // Try to update with all fields first
      let { data, error } = await supabase
        .from('items')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      logger.log('Update result:', { success: !!data, hasError: !!error });

      // If error is about missing description column, retry without description
      if (error && error.message.includes("description")) {
        logger.log('Retrying without description field');
        const { description, ...updateWithoutDescription } = updateData;

        const result = await supabase
          .from('items')
          .update(updateWithoutDescription)
          .eq('id', id)
          .eq('user_id', user.id)
          .select()
          .single();

        data = result.data;
        error = result.error;
        logger.log('Retry result:', { success: !!data, hasError: !!error });
      }

      if (error) {
        logger.error('Error updating item:', error);
        toast.error(`Failed to update item: ${error.message}`);
        return;
      }

      if (!data) {
        logger.error('No data returned from update');
        toast.error('Item not found or you do not have permission to update it');
        return;
      }

      logger.log('Successfully updated item:', { id: data.id, name: data.name });

      // Update local state and resort based on updated_at
      const updatedItem = {
        ...items.find(item => item.id === id)!,
        ...updates,
        updated_at: currentTimestamp
      };
      
      // Remove the old item and add the updated one at the beginning of the array
      setItems(prev => [
        updatedItem,
        ...prev.filter(item => item.id !== id)
      ]);

      toast.success('Item updated successfully!');
    } catch (error) {
      logger.error('Error updating item:', error);
      toast.error('Failed to update item');
    }
  };
  const getItemById = (id: string): Item | undefined => {
    return items.find(item => item.id === id);
  };
  // Function to get item with sensitive data for authenticated users
  const getItemWithSensitiveData = async (id: string): Promise<Item | null> => {
    if (!user) {
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (error || !data) {
        return null;
      } return {
        ...data,
        category: data.category as Category,
        external_link: (data as unknown as DatabaseItem).external_link || null,
        description: (data as unknown as DatabaseItem).description || null
      } as Item;
    } catch (error) {
      logger.error('Error fetching item with sensitive data:', error);
      return null;
    }
  };

  // Function to get user's items for admin pages (without sensitive data)
  const getUserItems = async (): Promise<Item[]> => {
    if (!user) {
      return [];
    }

    try {
      // Use specific field selection instead of select('*') to avoid exposing sensitive data
      const { data, error } = await supabase
        .from('items')
        .select(`
          id,
          name,
          image_url,
          image_path,
          rl_price,
          parcelado_price,
          kks_price,
          quantity,
          purchased_value,
          category,
          external_link,
          description,
          user_id,
          created_at,
          updated_at          `)
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false });

      // If error is about missing columns, retry without them
      if (error && (error.message.includes("external_link") || error.message.includes("description"))) {
        const fallbackResult = await supabase
          .from('items')
          .select(`
            id,
            name,
            image_url,
            image_path,
            rl_price,
            parcelado_price,
            kks_price,
            quantity,
            purchased_value,
            category,
            user_id,
            created_at,
            updated_at
          `)
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false });

        const fallbackData = fallbackResult.data as unknown as DatabaseItem[];
        const fallbackError = fallbackResult.error;

        if (fallbackError) {
          logger.error('Error fetching user items (fallback):', fallbackError);
          return [];
        }

        // Use fallback data
        const typedItems = (fallbackData || []).map((item: DatabaseItem) => ({
          ...item,
          category: item.category as Category,
          external_link: null, // Missing column
          description: null, // Missing column
          quantity: item.quantity || 1, // Use database value or default
          purchased_value: item.purchased_value || 0, // Use database value or default
          user_id: item.user_id || null, // Use database value or default
          is_active: item.is_active !== false // Default to true if missing
        })) as Item[];

        return typedItems;
      }

      if (error) {
        logger.error('Error fetching user items:', error);
        return [];
      }

      // Type assertion to ensure category matches our Category type
      const typedItems = ((data as unknown as DatabaseItem[]) || []).map((item: DatabaseItem) => ({
        ...item,
        category: item.category as Category,
        external_link: item.external_link || null, // Handle missing column gracefully
        description: item.description || null, // Handle missing column gracefully
        quantity: item.quantity || 1, // Handle missing column gracefully
        purchased_value: item.purchased_value || 0, // Use database value or default
        user_id: item.user_id || null, // Use database value or default
        is_active: item.is_active !== false // Default to true if missing
      })) as Item[];

      return typedItems;
    } catch (error) {
      logger.error('Error fetching user items:', error);
      return [];
    }
  };

  const getItemsByCategory = (category: Category) => {
    if (category === 'geral') {
      return items; // Return all items for "geral" category
    }
    return items.filter(item => item.category === category);
  };

  const getUserItemsByCategory = (category: Category) => {
    if (!user) return [];
    const userItems = items.filter(item => item.user_id === user.id);
    if (category === 'geral') {
      return userItems; // Return all user items for "geral" category
    }
    return userItems.filter(item => item.category === category);
  };
  const refreshItems = async () => {
    await fetchItems();
  };

  // KKS currency specific functions
  const getKKSItem = (): Item | undefined => {
    if (!user) return undefined;
    return items.find(item => item.name.toLowerCase() === 'kks' && item.user_id === user.id);
  };

  const addKKSQuantity = async (quantity: number, kksPrice: number) => {
    if (!user) {
      toast.error('You must be logged in to manage KKS');
      return;
    }

    try {
      const existingKKS = getKKSItem();

      if (existingKKS) {
        // Update existing KKS item
        await updateItem(existingKKS.id, {
          quantity: existingKKS.quantity + quantity,
          rl_price: kksPrice,
          parcelado_price: kksPrice * 1.1, // 10% more for installment
          kks_price: 0 // KKS doesn't cost KKS
        });
      } else {
        // Create new KKS item
        await addItem({
          name: 'KKS',
          image_path: null,
          rl_price: kksPrice,
          parcelado_price: kksPrice * 1.1,
          kks_price: 0,
          purchased_value: 0,
          quantity: quantity,
          category: 'itens',
          external_link: null,
          description: 'Moeda KKS do Rucoy'
        });
      }

      toast.success(`${quantity} KKS adicionados com sucesso!`);
    } catch (error) {
      logger.error('Error adding KKS:', error);
      toast.error('Failed to add KKS');
    }
  };
  const removeKKSQuantity = async (quantity: number) => {
    if (!user) {
      toast.error('You must be logged in to manage KKS');
      return;
    }

    try {
      const existingKKS = getKKSItem();

      if (!existingKKS) {
        toast.error('KKS item not found');
        return;
      }

      // KKS nunca pode ter menos de 1 unidade
      const maxRemovable = existingKKS.quantity - 1;

      if (maxRemovable <= 0) {
        toast.error('KKS deve manter pelo menos 1 unidade. Não é possível remover mais.');
        return;
      }

      if (quantity > maxRemovable) {
        toast.error(`Você só pode remover no máximo ${maxRemovable} KKS. O KKS deve manter pelo menos 1 unidade.`);
        return;
      }

      const newQuantity = existingKKS.quantity - quantity;

      // Atualizar a quantidade (nunca deletar o item KKS)
      await updateItem(existingKKS.id, {
        quantity: newQuantity
      });

      toast.success(`${quantity} KKS removidos com sucesso! Restam ${newQuantity} KKS.`);
    } catch (error) {
      logger.error('Error removing KKS:', error);
      toast.error('Falha ao remover KKS');
    }
  };

  const updateKKSPrice = async (newPrice: number) => {
    if (!user) {
      toast.error('You must be logged in to update KKS price');
      return;
    }

    try {
      const kksItem = getKKSItem();
      if (!kksItem) {
        toast.error('KKS item not found');
        return;
      }

      await updateItem(kksItem.id, {
        rl_price: newPrice,
        parcelado_price: newPrice * 1.1
      });

      toast.success('Preço do KKS atualizado com sucesso!');
    } catch (error) {
      logger.error('Error updating KKS price:', error);
      toast.error('Failed to update KKS price');
    }
  };

  // Hide item from sales (soft delete) - set is_active to false
  const hideItemFromSales = async (id: string) => {
    try {
      const { error } = await supabase
        .from('items')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) {
        logger.error('Error hiding item:', error);
        toast.error('Failed to hide item from sales');
        return;
      }

      // Remove from local state immediately
      setItems(prev => prev.filter(item => item.id !== id));
      toast.success('Item hidden from sales successfully');
    } catch (error) {
      logger.error('Error hiding item:', error);
      toast.error('Failed to hide item from sales');
    }
  };

  // Get all items including inactive ones (for admin use only)
  const getAllItemsForAdmin = async (): Promise<Item[]> => {
    try {
      const { data, error } = await supabase
        .from('items')
        .select(`
          id,
          name,
          image_url,
          image_path,
          rl_price,
          parcelado_price,
          kks_price,
          quantity,
          purchased_value,
          category,
          external_link,
          description,
          user_id,
          created_at,
          updated_at,
          is_active
        `)
        .order('updated_at', { ascending: false });

      if (error) {
        logger.error('Error fetching all items for admin:', error);
        return [];
      }

      return ((data as unknown as DatabaseItem[]) || []).map((item: DatabaseItem) => ({
        ...item,
        category: item.category as Category,
        external_link: item.external_link || null,
        description: item.description || null,
        quantity: item.quantity || 1,
        purchased_value: item.purchased_value || 0,
        user_id: item.user_id || null,
        is_active: item.is_active !== false
      })) as Item[];
    } catch (error) {
      logger.error('Error fetching all items for admin:', error);
      return [];
    }
  };

  return (
    <SupabaseItemsContext.Provider value={{
      items,
      loading,
      addItem,
      updateItem,
      deleteItem,
      markItemAsSold,
      hideItemFromSales,
      getItemsByCategory,
      getUserItemsByCategory,
      uploadImage,
      refreshItems,
      getItemById,
      getItemWithSensitiveData,
      getUserItems,
      getAllItemsForAdmin,
      addKKSQuantity,
      removeKKSQuantity,
      updateKKSPrice,
      getKKSItem
    }}>
      {children}
    </SupabaseItemsContext.Provider>);
};

// Export the context and type for use in the hook
export { SupabaseItemsContext };
export type { ItemsContextType };
