import { useMemo, useState, useEffect, useCallback } from "react";
import { Navigate } from "react-router-dom";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { supabase } from "@/integrations/supabase/client";
import { Category } from "@/contexts/SupabaseItemsContext";
import { formatDateForUser, formatCurrencyForUser } from "@/lib/locale-utils";
import { Edit, Trash2, Save, X } from "lucide-react";
import { toast } from "sonner";
import logger from "@/lib/logger";
import { getConfig } from "@/lib/config";

interface SoldItem {
  id: string;
  name: string;
  category: Category;
  sold_value: number;
  purchased_value: number;
  profitable_value: number;
  sold_at: string;
  quantity: number;
  valor_total: number;
  valor_recebido: number;
  is_parcelado: boolean;
  parcelas_total: number;
  parcelas_pagas: number;
}

const ProfitablePage = () => {
  const { user } = useSupabaseAuth();
  const config = getConfig();
  const isSuportAdmin = user?.email === config.admin.emails[1]; // VITE_ADMIN_EMAIL_SUPORT
  // Function to get category-specific styling
  const getCategoryStyles = (category: string) => {
    switch (category) {
      case "pally":
        return "text-pally-primary";
      case "kina":
        return "text-kina-primary";
      case "mage":
        return "text-mage-primary";
      case "itens":
        return "text-itens-primary";
      case "geral":
        return "text-geral-primary";
      default:
        return "text-muted-foreground";
    }
  };
  const [soldItems, setSoldItems] = useState<SoldItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | "all">(
    "all"
  );
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState<{
    isOpen: boolean;
    item: SoldItem | null;
  }>({ isOpen: false, item: null });
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    item: SoldItem | null;
  }>({ isOpen: false, item: null });
  const [editValues, setEditValues] = useState<{
    name: string;
    category: Category;
    sold_value: string;
    purchased_value: string;
    quantity: string;
    valor_total: string;
    valor_recebido: string;
    is_parcelado: boolean;
    parcelas_total: string;
    parcelas_pagas: string;
  }>({
    name: "",
    category: "geral",
    sold_value: "",
    purchased_value: "",
    quantity: "",
    valor_total: "",
    valor_recebido: "",
    is_parcelado: false,
    parcelas_total: "",
    parcelas_pagas: "",
  });
  const fetchSoldItems = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("sold_items")
        .select("*")
        .eq("user_id", user?.id)
        .order("sold_at", { ascending: false });

      if (error) {
        logger.error("Error fetching sold items:", error);
        return;
      } // Type assertion to ensure category matches our Category type and add missing fields
      const typedItems = (data || []).map((item) => ({
        ...item,
        category: item.category as Category,
        quantity: ((item as Record<string, unknown>).quantity as number) || 1,
        valor_total:
          ((item as Record<string, unknown>).valor_total as number) ||
          item.sold_value,
        valor_recebido:
          ((item as Record<string, unknown>).valor_recebido as number) ||
          item.sold_value,
        is_parcelado:
          ((item as Record<string, unknown>).is_parcelado as boolean) || false,
        parcelas_total:
          ((item as Record<string, unknown>).parcelas_total as number) || 1,
        parcelas_pagas:
          ((item as Record<string, unknown>).parcelas_pagas as number) || 1,
      })) as SoldItem[];

      setSoldItems(typedItems);
    } catch (error) {
      logger.error("Error fetching sold items:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const handleDelete = (item: SoldItem) => {
    setDeleteModal({ isOpen: true, item });
  };

  const confirmDelete = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from("sold_items")
        .delete()
        .eq("id", itemId)
        .eq("user_id", user?.id);

      if (error) {
        logger.error("Error deleting sold item:", error);
        toast.error("Erro ao deletar item");
        return;
      }

      // Remove from local state
      setSoldItems((prev) => prev.filter((item) => item.id !== itemId));
      toast.success("Item deletado com sucesso");
    } catch (error) {
      logger.error("Error deleting sold item:", error);
      toast.error("Erro ao deletar item");
    }
  };
  const handleEdit = (item: SoldItem) => {
    setEditModal({ isOpen: true, item });
    setEditValues({
      name: item.name,
      category: item.category,
      sold_value: item.sold_value.toString(),
      purchased_value: item.purchased_value.toString(),
      quantity: item.quantity.toString(),
      valor_total: item.valor_total.toString(),
      valor_recebido: item.valor_recebido.toString(),
      is_parcelado: item.is_parcelado,
      parcelas_total: item.parcelas_total.toString(),
      parcelas_pagas: item.parcelas_pagas.toString(),
    });
  };
  const handleSave = async () => {
    if (!editModal.item) return;

    // Convert string values to numbers
    const soldValue = parseFloat(editValues.sold_value) || 0;
    const purchasedValue = parseFloat(editValues.purchased_value) || 0;
    const quantity = parseInt(editValues.quantity) || 1;
    const valorTotal = parseFloat(editValues.valor_total) || 0;
    const valorRecebido = parseFloat(editValues.valor_recebido) || 0;
    const parcelasTotal = parseInt(editValues.parcelas_total) || 1;
    const parcelasPagas = parseInt(editValues.parcelas_pagas) || 0;

    try {
      const { error } = await supabase
        .from("sold_items")
        .update({
          name: editValues.name,
          category: editValues.category,
          sold_value: soldValue,
          purchased_value: purchasedValue,
          quantity: quantity,
          valor_total: valorTotal,
          valor_recebido: valorRecebido,
          is_parcelado: editValues.is_parcelado,
          parcelas_total: parcelasTotal,
          parcelas_pagas: parcelasPagas,
        })
        .eq("id", editModal.item.id)
        .eq("user_id", user?.id);

      if (error) {
        logger.error("Error updating sold item:", error);
        toast.error("Erro ao atualizar item");
        return;
      } // Update local state
      setSoldItems((prev) =>
        prev.map((item) =>
          item.id === editModal.item!.id
            ? {
                ...item,
                name: editValues.name,
                category: editValues.category,
                sold_value: soldValue,
                purchased_value: purchasedValue,
                quantity: quantity,
                valor_total: valorTotal,
                valor_recebido: valorRecebido,
                is_parcelado: editValues.is_parcelado,
                parcelas_total: parcelasTotal,
                parcelas_pagas: parcelasPagas,
                profitable_value: soldValue - purchasedValue,
              }
            : item
        )
      );

      setEditModal({ isOpen: false, item: null });
      toast.success("Item atualizado com sucesso");
    } catch (error) {
      logger.error("Error updating sold item:", error);
      toast.error("Erro ao atualizar item");
    }
  };
  const handleCancel = () => {
    setEditModal({ isOpen: false, item: null });
    setEditValues({
      name: "",
      category: "geral",
      sold_value: "",
      purchased_value: "",
      quantity: "",
      valor_total: "",
      valor_recebido: "",
      is_parcelado: false,
      parcelas_total: "",
      parcelas_pagas: "",
    });
  };

  // Filter items based on category
  const filteredItems = useMemo(() => {
    return soldItems.filter((item) => {
      const matchesCategory =
        selectedCategory === "all" || item.category === selectedCategory;
      return matchesCategory;
    });
  }, [soldItems, selectedCategory]);

  // Calculate totals
  const totals = useMemo(() => {
    return filteredItems.reduce(
      (acc, item) => ({
        totalPurchased: acc.totalPurchased + item.purchased_value,
        totalSold: acc.totalSold + item.sold_value,
        totalProfit: acc.totalProfit + item.profitable_value,
      }),
      { totalPurchased: 0, totalSold: 0, totalProfit: 0 }
    );
  }, [filteredItems]);

  useEffect(() => {
    if (user) {
      fetchSoldItems();
    }
  }, [user, fetchSoldItems]);
  // Redirect if not authenticated
  if (!user) {
    return <Navigate to="/auth/admin" />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Valor de Lucro</h1>
      <div className="mb-6">
        <div>
          <label
            htmlFor="category-filter"
            className="block text-sm font-medium mb-2"
          >
            Filtrar por Categoria
          </label>{" "}
          <select
            id="category-filter"
            value={selectedCategory}
            onChange={(e) =>
              setSelectedCategory(e.target.value as Category | "all")
            }
            className="px-3 py-2 bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">Todas as Categorias</option>
            <option value="kina">Kina</option>
            <option value="mage">Mage</option>
            <option value="pally">Pally</option>
            <option value="geral">Geral</option>
            <option value="outros">Outros</option>
            <option value="supercell">Supercell</option>
            <option value="freefire">Free Fire</option>
            <option value="itens">Itens</option>
            {isSuportAdmin && <option value="promocoes">Divulgações</option>}
          </select>
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-xl text-muted-foreground mb-2">
            Nenhum item vendido encontrado
          </p>
          <p className="text-muted-foreground">
            Tente alterar seus critérios de filtro ou venda alguns itens
            primeiro.
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block border border-border rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-muted">
                <tr>
                  <th className="py-2 px-2 text-left text-xs">Nome</th>
                  <th className="py-2 px-1 text-center text-xs">Cat</th>
                  <th className="py-2 px-1 text-center text-xs">Qtd</th>
                  <th className="py-2 px-2 text-right text-xs">Valor Total</th>
                  <th className="py-2 px-2 text-right text-xs">
                    Valor Recebido
                  </th>
                  <th className="py-2 px-1 text-center text-xs">Parcelas</th>
                  <th className="py-2 px-2 text-right text-xs">Valor Vendido</th>
                  <th className="py-2 px-2 text-right text-xs">Valor Comprado</th>
                  <th className="py-2 px-2 text-right text-xs">
                    Lucro
                  </th>
                  <th className="py-2 px-1 text-center text-xs">Data</th>
                  <th className="py-2 px-1 text-center text-xs">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/50">
                    <td className="py-1 px-2">
                      <span className="font-medium text-xs">{item.name}</span>
                    </td>

                    <td className="py-1 px-1 text-center">
                      <span
                        className={`capitalize text-xs px-1 py-1 rounded ${getCategoryStyles(
                          item.category
                        )}`}
                      >
                        {item.category === "supercell"
                          ? "SC"
                          : item.category === "freefire"
                          ? "FF"
                          : item.category === "outros"
                          ? "Out"
                          : item.category}
                      </span>
                    </td>
                    <td className="py-1 px-1 text-center">
                      <span className="font-medium text-xs">
                        {item.quantity}
                      </span>
                    </td>
                    {/* Valor Total */}
                    <td className="py-1 px-2 text-right">
                      <span
                        className={`text-xs ${
                          item.is_parcelado
                            ? "text-amber-700 dark:text-amber-400 font-bold"
                            : ""
                        }`}
                      >
                        {formatCurrencyForUser(item.valor_total)}
                        {item.is_parcelado && (
                          <div className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                            📋 Parcelado
                          </div>
                        )}
                      </span>
                    </td>
                    {/* Valor Recebido */}
                    <td className="py-1 px-2 text-right">
                      <span
                        className={`text-xs ${
                          item.valor_recebido < item.valor_total
                            ? "text-orange-700 dark:text-orange-400 font-bold"
                            : "text-green-700 dark:text-green-400 font-bold"
                        }`}
                      >
                        {formatCurrencyForUser(item.valor_recebido)}
                      </span>
                    </td>
                    {/* Parcelas */}
                    <td className="py-1 px-1 text-center">
                      <span
                        className={`text-xs ${
                          item.is_parcelado
                            ? item.parcelas_pagas < item.parcelas_total
                              ? "text-orange-700 dark:text-orange-400 font-bold"
                              : "text-green-700 dark:text-green-400 font-bold"
                            : "text-muted-foreground"
                        }`}
                      >
                        {item.is_parcelado
                          ? `${item.parcelas_pagas}/${item.parcelas_total}`
                          : "1/1"}
                      </span>
                    </td>
                    {/* Valor Pago */}
                    <td className="py-1 px-2 text-right">
                      <span className="text-xs">
                        {formatCurrencyForUser(item.sold_value)}
                      </span>
                    </td>
                    {/* Valor de Compra */}
                    <td className="py-1 px-2 text-right">
                      <span className="text-xs">
                        {formatCurrencyForUser(item.purchased_value)}
                      </span>
                    </td>
                    {/* Valor de Lucro */}
                    <td
                      className={`py-1 px-2 text-right font-semibold text-xs ${
                        item.profitable_value >= 0
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {formatCurrencyForUser(item.profitable_value)}
                    </td>
                    {/* Data da Venda */}
                    <td className="py-1 px-1 text-center">
                      <span className="text-xs">
                        {formatDateForUser(item.sold_at)
                          .replace(/\/20/, "/")
                          .slice(0, 8)}
                      </span>
                    </td>
                    {/* Ações */}
                    <td className="py-1 px-1 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleEdit(item)}
                          className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
                          title="Editar"
                        >
                          <Edit size={12} />
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
                          className="p-1 text-red-600 hover:text-red-800 transition-colors"
                          title="Deletar"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Table with Horizontal Scroll */}
          <div className="md:hidden">
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs min-w-[800px]">
                  <thead className="bg-muted">
                    <tr>
                      <th className="py-2 px-2 text-left text-xs whitespace-nowrap">
                        Nome
                      </th>
                      <th className="py-2 px-1 text-center text-xs whitespace-nowrap">
                        Cat
                      </th>
                      <th className="py-2 px-1 text-center text-xs whitespace-nowrap">
                        Qtd
                      </th>
                      <th className="py-2 px-2 text-right text-xs whitespace-nowrap">
                        V. Total
                      </th>
                      <th className="py-2 px-2 text-right text-xs whitespace-nowrap">
                        V. Recebido
                      </th>
                      <th className="py-2 px-1 text-center text-xs whitespace-nowrap">
                        Parcelas
                      </th>
                      <th className="py-2 px-2 text-right text-xs whitespace-nowrap">
                        V. Pago
                      </th>
                      <th className="py-2 px-2 text-right text-xs whitespace-nowrap">
                        V. Compra
                      </th>
                      <th className="py-2 px-2 text-right text-xs whitespace-nowrap">
                        Lucro
                      </th>
                      <th className="py-2 px-1 text-center text-xs whitespace-nowrap">
                        Data
                      </th>
                      <th className="py-2 px-1 text-center text-xs whitespace-nowrap">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredItems.map((item) => (
                      <tr
                        key={`mobile-${item.id}`}
                        className="hover:bg-muted/50"
                      >
                        <td className="py-1 px-2 whitespace-nowrap">
                          <span className="font-medium text-xs">
                            {item.name}
                          </span>
                        </td>

                        <td className="py-1 px-1 text-center whitespace-nowrap">
                          <span
                            className={`capitalize text-xs px-1 py-1 rounded ${getCategoryStyles(
                              item.category
                            )}`}
                          >
                            {item.category === "supercell"
                              ? "SC"
                              : item.category === "freefire"
                              ? "FF"
                              : item.category === "outros"
                              ? "Out"
                              : item.category}
                          </span>
                        </td>
                        <td className="py-1 px-1 text-center whitespace-nowrap">
                          <span className="font-medium text-xs">
                            {item.quantity}
                          </span>
                        </td>
                        <td className="py-1 px-2 text-right whitespace-nowrap">
                          <span
                            className={`text-xs ${
                              item.is_parcelado
                                ? "text-amber-700 dark:text-amber-400 font-bold"
                                : ""
                            }`}
                          >
                            {formatCurrencyForUser(item.valor_total)}
                            {item.is_parcelado && (
                              <div className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                                📋
                              </div>
                            )}
                          </span>
                        </td>
                        <td className="py-1 px-2 text-right whitespace-nowrap">
                          <span
                            className={`text-xs ${
                              item.valor_recebido < item.valor_total
                                ? "text-orange-700 dark:text-orange-400 font-bold"
                                : "text-green-700 dark:text-green-400 font-bold"
                            }`}
                          >
                            {formatCurrencyForUser(item.valor_recebido)}
                          </span>
                        </td>
                        <td className="py-1 px-1 text-center whitespace-nowrap">
                          <span
                            className={`text-xs ${
                              item.is_parcelado
                                ? item.parcelas_pagas < item.parcelas_total
                                  ? "text-orange-700 dark:text-orange-400 font-bold"
                                  : "text-green-700 dark:text-green-400 font-bold"
                                : "text-muted-foreground"
                            }`}
                          >
                            {item.is_parcelado
                              ? `${item.parcelas_pagas}/${item.parcelas_total}`
                              : "1/1"}
                          </span>
                        </td>
                        <td className="py-1 px-2 text-right whitespace-nowrap">
                          <span className="text-xs">
                            {formatCurrencyForUser(item.sold_value)}
                          </span>
                        </td>
                        <td className="py-1 px-2 text-right whitespace-nowrap">
                          <span className="text-xs">
                            {formatCurrencyForUser(item.purchased_value)}
                          </span>
                        </td>
                        <td
                          className={`py-1 px-2 text-right font-semibold text-xs whitespace-nowrap ${
                            item.profitable_value >= 0
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {formatCurrencyForUser(item.profitable_value)}
                        </td>
                        <td className="py-1 px-1 text-center whitespace-nowrap">
                          <span className="text-xs">
                            {formatDateForUser(item.sold_at)
                              .replace(/\/20/, "/")
                              .slice(0, 8)}
                          </span>
                        </td>
                        <td className="py-1 px-1 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleEdit(item)}
                              className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
                              title="Editar"
                            >
                              <Edit size={12} />
                            </button>
                            <button
                              onClick={() => handleDelete(item)}
                              className="p-1 text-red-600 hover:text-red-800 transition-colors"
                              title="Deletar"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Scroll Hint */}
            <div className="mt-2 text-center">
              <p className="text-xs text-muted-foreground">
                👆 Deslize para o lado para ver mais colunas
              </p>
            </div>
          </div>

          {/* Totals Summary */}
          <div className="mt-6 border border-border rounded-lg p-4 bg-muted/50">
            <h3 className="text-lg font-semibold mb-4">
              Resumo (
              {selectedCategory === "all"
                ? "Todas as Categorias"
                : selectedCategory}
              )
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Total Pago</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrencyForUser(totals.totalPurchased)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Total Vendido</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrencyForUser(totals.totalSold)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Lucro Total</p>
                <p
                  className={`text-2xl font-bold ${
                    totals.totalProfit >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {formatCurrencyForUser(totals.totalProfit)}
                </p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-border text-center">
              <p className="text-sm text-muted-foreground">Margem de Lucro</p>
              <p
                className={`text-xl font-semibold ${
                  totals.totalProfit >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {totals.totalSold > 0
                  ? ((totals.totalProfit / totals.totalSold) * 100).toFixed(1)
                  : 0}
                %
              </p>
            </div>{" "}
          </div>
        </>
      )}

      {/* Edit Modal */}
      {editModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-background border border-border rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Editar Venda</h3>
            <div className="space-y-4">
              {/* Nome e Categoria */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="edit_name"
                    className="block text-sm font-medium mb-2"
                  >
                    Nome do Item
                  </label>
                  <input
                    type="text"
                    id="edit_name"
                    value={editValues.name}
                    onChange={(e) =>
                      setEditValues({ ...editValues, name: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label
                    htmlFor="edit_category"
                    className="block text-sm font-medium mb-2"
                  >
                    Categoria
                  </label>
                  <select
                    id="edit_category"
                    value={editValues.category}
                    onChange={(e) =>
                      setEditValues({
                        ...editValues,
                        category: e.target.value as Category,
                      })
                    }
                    className="w-full px-3 py-2 bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="kina">Kina</option>
                    <option value="mage">Mage</option>
                    <option value="pally">Pally</option>
                    <option value="geral">Geral</option>
                    <option value="outros">Outros</option>
                    <option value="supercell">Supercell</option>
                    <option value="freefire">Free Fire</option>
                    <option value="itens">Itens</option>
                  </select>
                </div>
              </div>

              {/* Quantidade */}
              <div>
                <label
                  htmlFor="edit_quantity"
                  className="block text-sm font-medium mb-2"
                >
                  Quantidade
                </label>{" "}
                <input
                  type="number"
                  id="edit_quantity"
                  min="1"
                  value={editValues.quantity}
                  onChange={(e) =>
                    setEditValues({ ...editValues, quantity: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Checkbox de Parcelamento */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="edit_is_parcelado"
                  checked={editValues.is_parcelado}
                  onChange={(e) =>
                    setEditValues({
                      ...editValues,
                      is_parcelado: e.target.checked,
                    })
                  }
                  className="w-4 h-4"
                />
                <label
                  htmlFor="edit_is_parcelado"
                  className="text-sm font-medium"
                >
                  Venda Parcelada
                </label>
              </div>

              {/* Campos de Valores */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="edit_sold_value"
                    className="block text-sm font-medium mb-2"
                  >
                    Valor Pago (R$)
                  </label>{" "}
                  <input
                    type="number"
                    id="edit_sold_value"
                    min="0"
                    step="0.01"
                    value={editValues.sold_value}
                    onChange={(e) =>
                      setEditValues({
                        ...editValues,
                        sold_value: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label
                    htmlFor="edit_purchased_value"
                    className="block text-sm font-medium mb-2"
                  >
                    Valor de Compra (R$)
                  </label>{" "}
                  <input
                    type="number"
                    id="edit_purchased_value"
                    min="0"
                    step="0.01"
                    value={editValues.purchased_value}
                    onChange={(e) =>
                      setEditValues({
                        ...editValues,
                        purchased_value: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Campos de Parcelamento */}
              {editValues.is_parcelado && (
                <div className="space-y-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-4 rounded-md">
                  <h4 className="font-medium text-sm text-black">
                    Informações de Parcelamento
                  </h4>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="edit_valor_total"
                        className="block text-sm font-semibold mb-2 text-black"
                      >
                        Valor Total (R$)
                      </label>
                      <input
                        type="number"
                        id="edit_valor_total"
                        min="0"
                        step="0.01"
                        value={editValues.valor_total}
                        onChange={(e) =>
                          setEditValues({
                            ...editValues,
                            valor_total: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="edit_valor_recebido"
                        className="block text-sm font-semibold mb-2 text-black"
                      >
                        Valor Recebido (R$)
                      </label>
                      <input
                        type="number"
                        id="edit_valor_recebido"
                        min="0"
                        step="0.01"
                        value={editValues.valor_recebido}
                        onChange={(e) =>
                          setEditValues({
                            ...editValues,
                            valor_recebido: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="edit_parcelas_total"
                        className="block text-sm font-semibold mb-2 text-black"
                      >
                        Total de Parcelas
                      </label>
                      <input
                        type="number"
                        id="edit_parcelas_total"
                        min="1"
                        value={editValues.parcelas_total}
                        onChange={(e) =>
                          setEditValues({
                            ...editValues,
                            parcelas_total: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="edit_parcelas_pagas"
                        className="block text-sm font-semibold mb-2 text-black"
                      >
                        Parcelas Pagas
                      </label>
                      <input
                        type="number"
                        id="edit_parcelas_pagas"
                        min="0"
                        max={editValues.parcelas_total}
                        value={editValues.parcelas_pagas}
                        onChange={(e) =>
                          setEditValues({
                            ...editValues,
                            parcelas_pagas: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Cálculo de Lucro */}
              <div className="bg-muted p-3 rounded-md">
                <span className="font-semibold">Lucro:</span>
                <p
                  className={`text-lg font-bold ${
                    (parseFloat(editValues.sold_value) || 0) -
                      (parseFloat(editValues.purchased_value) || 0) >=
                    0
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {formatCurrencyForUser(
                    (parseFloat(editValues.sold_value) || 0) -
                      (parseFloat(editValues.purchased_value) || 0)
                  )}
                </p>
              </div>

              {/* Botões */}
              <div className="flex gap-3 justify-end">
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 text-muted-foreground hover:bg-muted rounded-md transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                >
                  Salvar Alterações
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-background border border-border rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-destructive/10 rounded-full">
              <Trash2 className="h-6 w-6 text-destructive" />
            </div>

            <h3 className="text-lg font-semibold text-center mb-2">
              Confirmar Exclusão
            </h3>
            <p className="text-sm text-muted-foreground text-center mb-6">
              Tem certeza que deseja deletar este item vendido? Esta ação não pode ser desfeita.
            </p>

            <div className="bg-muted/50 border border-border rounded-md p-4 mb-6">
              <div className="flex items-center space-x-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {deleteModal.item?.name}
                  </p>
                  <p className={`text-xs capitalize font-medium ${getCategoryStyles(
                    deleteModal.item?.category || ""
                  )}`}>
                    {deleteModal.item?.category}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Valor vendido: {formatCurrencyForUser(deleteModal.item?.sold_value || 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Data: {formatDateForUser(deleteModal.item?.sold_at || "").replace(/\/20/, "/").slice(0, 8)}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteModal({ isOpen: false, item: null })}
                className="px-4 py-2 text-muted-foreground hover:bg-muted rounded-md transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (deleteModal.item) confirmDelete(deleteModal.item.id);
                  setDeleteModal({ isOpen: false, item: null });
                }}
                className="px-4 py-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-md transition-colors flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Deletar Item
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfitablePage;
