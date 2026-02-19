import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { useSupabaseItems } from "@/hooks/useSupabaseItems";
import { usePhotoLimit } from "@/hooks/usePhotoLimit";
import { Category, Item } from "@/contexts/SupabaseItemsContext";
import { Trash2, DollarSign } from "lucide-react";
import { toast } from "sonner";
import SmartImage from "@/components/SmartImage";
import { getConfig } from "@/lib/config";

const DeleteItemPage = () => {
  const { user } = useSupabaseAuth();
  const config = getConfig();
  const isSuportAdmin = user?.email === config.admin.emails[1]; // VITE_ADMIN_EMAIL_SUPORT
  const { deleteItem, markItemAsSold, loading, getUserItems } =
    useSupabaseItems();
  const { refreshPhotoLimit } = usePhotoLimit();
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

  const [selectedCategory, setSelectedCategory] = useState<Category | "all">(
    "all"
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [sellModal, setSellModal] = useState<{
    isOpen: boolean;
    item: Item | null;
  }>({ isOpen: false, item: null });
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    item: Item | null;
  }>({ isOpen: false, item: null });
  const [soldValue, setSoldValue] = useState("");
  const [quantitySold, setQuantitySold] = useState("1");
  const [valorTotal, setValorTotal] = useState("");
  const [valorRecebido, setValorRecebido] = useState("");
  const [isParcelado, setIsParcelado] = useState(false);
  const [parcelasTotal, setParcelasTotal] = useState("1");
  const [parcelasPagas, setParcelasPagas] = useState("1");
  const [userItems, setUserItems] = useState<Item[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);

  // Fetch user's items with sensitive data on component mount
  useEffect(() => {
    const fetchUserItems = async () => {
      if (user) {
        setItemsLoading(true);
        const items = await getUserItems();
        setUserItems(items);
        setItemsLoading(false);
      }
    };

    fetchUserItems();
  }, [user, getUserItems]);

  // Filter items based on category and search term
  const filteredItems = useMemo(() => {
    return userItems.filter((item) => {
      const matchesCategory =
        selectedCategory === "all" || item.category === selectedCategory;
      const matchesSearch =
        searchTerm === "" ||
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [userItems, selectedCategory, searchTerm]);

  // Redirect if not authenticated
  if (!user) {
    return <Navigate to="/auth/admin" />;
  }
  const handleDeleteItem = (item: Item) => {
    setDeleteModal({ isOpen: true, item });
  };
  const confirmDelete = async () => {
    if (!deleteModal.item) return;

    try {
      await deleteItem(deleteModal.item.id);
      
      // Reload user items
      const items = await getUserItems();
      setUserItems(items);

      // Refresh photo limit after deleting item
      refreshPhotoLimit();

      toast.success("Item deletado com sucesso");
    } catch (error) {
      toast.error("Erro ao deletar item");
      console.error(error);
    } finally {
      setDeleteModal({ isOpen: false, item: null });
    }
  };
  const handleSellItem = (item: Item) => {
    setSellModal({ isOpen: true, item });
    setSoldValue("");
    setQuantitySold("1");
    setValorTotal("");
    setValorRecebido("");
    setIsParcelado(false);
    setParcelasTotal("1");
    setParcelasPagas("1");
  };
  const confirmSell = async () => {
    if (!sellModal.item || !soldValue) {
      toast.error("Por favor digite um valor de venda válido");
      return;
    }

    const quantity = parseInt(quantitySold) || 1;
    const isKKS = sellModal.item.name.toLowerCase() === "kks";

    // For KKS, ensure we keep at least 1 unit
    const maxQuantity = isKKS
      ? Math.max(0, sellModal.item.quantity - 1)
      : sellModal.item.quantity;

    if (quantity <= 0 || quantity > maxQuantity) {
      if (isKKS && maxQuantity === 0) {
        toast.error(
          "KKS deve manter pelo menos 1 unidade. Não é possível vender."
        );
        return;
      }
      toast.error(`Quantidade inválida. Máximo: ${maxQuantity}`);
      return;
    } // Prepare installment data
    const parcelaInfo = isParcelado
      ? {
          valorTotal: parseFloat(valorTotal) || parseFloat(soldValue),
          valorRecebido: parseFloat(valorRecebido) || parseFloat(soldValue),
          isParcelado: true,
          parcelasTotal: parseInt(parcelasTotal) || 1,
          parcelasPagas: parseInt(parcelasPagas) || 1,
        }
      : {
          valorTotal: parseFloat(soldValue),
          valorRecebido: parseFloat(soldValue),
          isParcelado: false,
          parcelasTotal: 1,
          parcelasPagas: 1,
        };

    await markItemAsSold(
      sellModal.item.id,
      parseFloat(soldValue),
      quantity,
      parcelaInfo
    );

    setSellModal({ isOpen: false, item: null });
    setSoldValue("");
    setQuantitySold("1");
    setValorTotal("");
    setValorRecebido("");
    setIsParcelado(false);
    setParcelasTotal("1");
    setParcelasPagas("1");

    // Reload user items
    const items = await getUserItems();
    setUserItems(items);
  };
  if (loading || itemsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Deletar Itens</h1>

      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Buscar itens..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div>
          {" "}
          <select
            value={selectedCategory}
            onChange={(e) =>
              setSelectedCategory(e.target.value as Category | "all")
            }
            className="w-full px-3 py-2 bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
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
            Nenhum item encontrado
          </p>
          <p className="text-muted-foreground">
            Tente alterar os critérios de busca ou criar alguns itens primeiro.
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block border border-border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="py-3 px-4 text-left">Imagem</th>
                  <th className="py-3 px-4 text-left">Nome</th>
                  <th className="py-3 px-4 text-left">Categoria</th>
                  <th className="py-3 px-4 text-left">Preços</th>
                  <th className="py-3 px-4 text-left">Valor Pago</th>
                  <th className="py-3 px-4 text-left">Quantidade</th>
                  <th className="py-3 px-4 text-left">Vídeo</th>
                  <th className="py-3 px-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredItems.map((item) => (
                  <tr key={item.id}>
                    <td className="py-2 px-4">
                      <div className="w-16 h-16 bg-muted">
                        <SmartImage
                          src={item.image_url}
                          alt={item.name}
                          className="w-full h-full object-cover"
                          enableModal={true}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = "/placeholder.svg";
                          }}
                        />
                      </div>
                    </td>
                    <td className="py-2 px-4 font-medium">{item.name}</td>
                    <td
                      className={`py-2 px-4 capitalize font-medium ${getCategoryStyles(
                        item.category
                      )}`}
                    >
                      {item.category}
                    </td>
                    <td className="py-2 px-4">
                      <div className="space-y-1">
                        <div className="text-xs">
                          <span className="font-semibold">RL:</span>{" "}
                          {item.rl_price === 0
                            ? "Grátis"
                            : `R$ ${item.rl_price.toFixed(2)}`}
                        </div>
                        <div className="text-xs">
                          <span className="font-semibold">Parcelado:</span>{" "}
                          {item.parcelado_price === 0
                            ? "Grátis"
                            : `R$ ${item.parcelado_price.toFixed(2)}`}
                        </div>
                        <div className="text-xs">
                          <span className="font-semibold">KKS:</span>{" "}
                          {item.kks_price === 0
                            ? "Grátis"
                            : `${item.kks_price.toFixed(2)}`}
                        </div>
                      </div>
                    </td>
                    <td className="py-2 px-4">
                      <span className="font-semibold">
                        R$ {(item.purchased_value || 0).toFixed(2)}
                      </span>
                    </td>
                    <td className="py-2 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                          item.name.toLowerCase() === "kks"
                            ? "bg-yellow-100 text-yellow-800 border border-yellow-200"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {item.quantity}x
                        {item.name.toLowerCase() === "kks" && " 🪙"}
                      </span>
                    </td>
                    <td className="py-2 px-4">
                      {item.external_link ? (
                        <a
                          href={item.external_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-sm text-primary hover:text-primary/80 transition-colors"
                          title={item.external_link}
                        >
                          🔗 Vídeo
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="py-2 px-4 text-center">
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => handleSellItem(item)}
                          className="p-2 text-green-600 hover:bg-green-100 rounded-md transition-colors"
                          title="Marcar como Vendido"
                        >
                          <DollarSign className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item)}
                          className="p-2 text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                          title="Deletar Item"
                        >
                          <Trash2 className="h-5 w-5" />
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
                <table className="w-full min-w-[800px]">
                  <thead className="bg-muted">
                    <tr>
                      <th className="py-3 px-2 text-left text-sm whitespace-nowrap">
                        Imagem
                      </th>
                      <th className="py-3 px-2 text-left text-sm whitespace-nowrap">
                        Nome
                      </th>
                      <th className="py-3 px-2 text-left text-sm whitespace-nowrap">
                        Categoria
                      </th>
                      <th className="py-3 px-2 text-left text-sm whitespace-nowrap">
                        Preços
                      </th>
                      <th className="py-3 px-2 text-left text-sm whitespace-nowrap">
                        V. Pago
                      </th>
                      <th className="py-3 px-2 text-left text-sm whitespace-nowrap">
                        Qtd
                      </th>
                      <th className="py-3 px-2 text-left text-sm whitespace-nowrap">
                        Vídeo
                      </th>
                      <th className="py-3 px-2 text-center text-sm whitespace-nowrap">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredItems.map((item) => (
                      <tr key={`mobile-${item.id}`}>
                        <td className="py-2 px-2 whitespace-nowrap">
                          <div className="w-12 h-12 bg-muted">
                            <SmartImage
                              src={item.image_url}
                              alt={item.name}
                              className="w-full h-full object-cover"
                              enableModal={true}
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = "/placeholder.svg";
                              }}
                            />
                          </div>
                        </td>
                        <td className="py-2 px-2 font-medium text-sm whitespace-nowrap">
                          {item.name}
                        </td>
                        <td
                          className={`py-2 px-2 capitalize font-medium text-sm whitespace-nowrap ${getCategoryStyles(
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
                        </td>
                        <td className="py-2 px-2 whitespace-nowrap">
                          <div className="space-y-1">
                            <div className="text-xs">
                              <span className="font-semibold">RL:</span>{" "}
                              {item.rl_price === 0
                                ? "Grátis"
                                : `R$ ${item.rl_price.toFixed(2)}`}
                            </div>
                            <div className="text-xs">
                              <span className="font-semibold">Parc:</span>{" "}
                              {item.parcelado_price === 0
                                ? "Grátis"
                                : `R$ ${item.parcelado_price.toFixed(2)}`}
                            </div>
                            <div className="text-xs">
                              <span className="font-semibold">KKS:</span>{" "}
                              {item.kks_price === 0
                                ? "Grátis"
                                : `${item.kks_price.toFixed(2)}`}
                            </div>
                          </div>
                        </td>
                        <td className="py-2 px-2 whitespace-nowrap">
                          <span className="font-semibold text-sm">
                            R$ {(item.purchased_value || 0).toFixed(2)}
                          </span>
                        </td>
                        <td className="py-2 px-2 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                              item.name.toLowerCase() === "kks"
                                ? "bg-yellow-100 text-yellow-800 border border-yellow-200"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {item.quantity}x
                            {item.name.toLowerCase() === "kks" && " 🪙"}
                          </span>
                        </td>
                        <td className="py-2 px-2 whitespace-nowrap">
                          {item.external_link ? (
                            <a
                              href={item.external_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center text-xs text-primary hover:text-primary/80 transition-colors"
                              title={item.external_link}
                            >
                              🔗
                            </a>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              -
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-2 text-center whitespace-nowrap">
                          <div className="flex gap-1 justify-center">
                            <button
                              onClick={() => handleSellItem(item)}
                              className="p-1 text-green-600 hover:bg-green-100 rounded-md transition-colors"
                              title="Marcar como Vendido"
                            >
                              <DollarSign className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item)}
                              className="p-1 text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                              title="Deletar Item"
                            >
                              <Trash2 className="h-4 w-4" />
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
        </>
      )}

      {/* Sell Modal */}
      {sellModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-background border border-border rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Marcar como Vendido</h3>
            <div className="space-y-4">
              {" "}
              <div>
                {" "}
                <p className="text-sm text-muted-foreground">
                  Item: {sellModal.item?.name}
                </p>
                <p
                  className={`text-sm capitalize font-medium ${getCategoryStyles(
                    sellModal.item?.category || ""
                  )}`}
                >
                  Categoria: {sellModal.item?.category}
                </p>
                {sellModal.item?.external_link && (
                  <p className="text-sm text-muted-foreground">
                    Vídeo:{" "}
                    <a
                      href={sellModal.item.external_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary/80 transition-colors"
                    >
                      🔗 Ver Vídeo
                    </a>
                  </p>
                )}
              </div>{" "}
              <div className="bg-muted p-3 rounded-md">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="font-semibold">Preço RL:</span>
                    <p>R$ {sellModal.item?.rl_price.toFixed(2)}</p>
                  </div>
                  <div>
                    <span className="font-semibold">Valor Pago (unit.):</span>
                    <p>
                      R$ {(sellModal.item?.purchased_value || 0).toFixed(2)}
                    </p>
                  </div>
                </div>{" "}
                {/* Show calculations when quantity > 1 */}
                {(parseInt(quantitySold) || 1) > 1 && (
                  <div className="mt-2 pt-2 border-t border-border">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="font-semibold">Quantidade:</span>
                        <p>{parseInt(quantitySold) || 1}x</p>
                      </div>
                      <div>
                        <span className="font-semibold">Valor Pago Total:</span>
                        <p>
                          R${" "}
                          {(
                            (sellModal.item?.purchased_value || 0) *
                            (parseInt(quantitySold) || 1)
                          ).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}{" "}
                <div className="mt-2 pt-2 border-t border-border">
                  <span className="font-semibold">Lucro Potencial:</span>
                  <p
                    className={`${
                      soldValue
                        ? parseFloat(soldValue) -
                            (sellModal.item?.purchased_value ||
                              sellModal.item?.rl_price ||
                              0) *
                              (parseInt(quantitySold) || 1) >=
                          0
                          ? "text-green-600"
                          : "text-red-600"
                        : "text-muted-foreground"
                    }`}
                  >
                    R${" "}
                    {soldValue
                      ? (
                          parseFloat(soldValue) -
                          (sellModal.item?.purchased_value ||
                            sellModal.item?.rl_price ||
                            0) *
                            (parseInt(quantitySold) || 1)
                        ).toFixed(2)
                      : "0.00"}
                  </p>
                  {isParcelado && valorTotal && (
                    <div className="mt-1">
                      <span className="text-xs font-semibold">
                        Lucro Total (quando pago completo):
                      </span>
                      <p
                        className={`text-xs ${
                          valorTotal
                            ? parseFloat(valorTotal) -
                                (sellModal.item?.purchased_value ||
                                  sellModal.item?.rl_price ||
                                  0) *
                                  (parseInt(quantitySold) || 1) >=
                              0
                              ? "text-green-600"
                              : "text-red-600"
                            : "text-muted-foreground"
                        }`}
                      >
                        R${" "}
                        {valorTotal
                          ? (
                              parseFloat(valorTotal) -
                              (sellModal.item?.purchased_value ||
                                sellModal.item?.rl_price ||
                                0) *
                                (parseInt(quantitySold) || 1)
                            ).toFixed(2)
                          : "0.00"}
                      </p>
                    </div>
                  )}
                </div>
              </div>{" "}
              <div>
                <label
                  htmlFor="sold_value"
                  className="block text-sm font-medium mb-2"
                >
                  {(parseInt(quantitySold) || 1) > 1
                    ? "Valor Total Recebido (R$)"
                    : "Valor Vendido (R$)"}
                </label>
                <input
                  type="number"
                  id="sold_value"
                  min="0"
                  step="0.01"
                  value={soldValue}
                  onChange={(e) => setSoldValue(e.target.value)}
                  placeholder={
                    (parseInt(quantitySold) || 1) > 1
                      ? "Digite o valor total que você recebeu"
                      : "Digite o valor vendido"
                  }
                  className="w-full px-3 py-2 bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                  autoFocus
                />
                {(parseInt(quantitySold) || 1) > 1 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    💡 Digite o valor total que você recebeu pela venda (pode
                    incluir parcelamento, desconto, etc.)
                  </p>
                )}
              </div>
              {/* Campos de Parcelamento */}
              <div className="space-y-4 border-t border-border pt-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is_parcelado"
                    checked={isParcelado}
                    onChange={(e) => setIsParcelado(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <label htmlFor="is_parcelado" className="text-sm font-medium">
                    Venda Parcelada
                  </label>
                </div>

                {isParcelado && (
                  <div className="space-y-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3 rounded-md">
                    {" "}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label
                          htmlFor="valor_total"
                          className="block text-xs font-semibold mb-1 text-black"
                        >
                          Valor Total (R$)
                        </label>
                        <input
                          type="number"
                          id="valor_total"
                          min="0"
                          step="0.01"
                          value={valorTotal}
                          onChange={(e) => setValorTotal(e.target.value)}
                          placeholder="Ex: 100.00"
                          className="w-full px-2 py-1 text-xs bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="valor_recebido"
                          className="block text-xs font-semibold mb-1 text-black"
                        >
                          Valor Recebido (R$)
                        </label>
                        <input
                          type="number"
                          id="valor_recebido"
                          min="0"
                          step="0.01"
                          value={valorRecebido}
                          onChange={(e) => setValorRecebido(e.target.value)}
                          placeholder="Ex: 30.00"
                          className="w-full px-2 py-1 text-xs bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label
                          htmlFor="parcelas_total"
                          className="block text-xs font-semibold mb-1 text-black"
                        >
                          Total de Parcelas
                        </label>
                        <input
                          type="number"
                          id="parcelas_total"
                          min="1"
                          step="1"
                          value={parcelasTotal}
                          onChange={(e) => setParcelasTotal(e.target.value)}
                          placeholder="Ex: 3"
                          className="w-full px-2 py-1 text-xs bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="parcelas_pagas"
                          className="block text-xs font-semibold mb-1 text-black"
                        >
                          Parcelas Pagas
                        </label>
                        <input
                          type="number"
                          id="parcelas_pagas"
                          min="0"
                          max={parcelasTotal}
                          step="1"
                          value={parcelasPagas}
                          onChange={(e) => setParcelasPagas(e.target.value)}
                          placeholder="Ex: 1"
                          className="w-full px-2 py-1 text-xs bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">
                      💡 Use "Valor Recebido" para registrar quanto já foi pago
                      até agora
                    </p>
                  </div>
                )}
              </div>
              <div>
                <label
                  htmlFor="quantity_sold"
                  className="block text-sm font-medium mb-2"
                >
                  Quantidade a Vender
                </label>
                <input
                  type="number"
                  id="quantity_sold"
                  min="1"
                  max={
                    sellModal.item?.name.toLowerCase() === "kks"
                      ? Math.max(0, (sellModal.item?.quantity || 1) - 1)
                      : sellModal.item?.quantity || 1
                  }
                  step="1"
                  value={quantitySold}
                  onChange={(e) => setQuantitySold(e.target.value)}
                  placeholder="1"
                  className="w-full px-3 py-2 bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {sellModal.item?.name.toLowerCase() === "kks" ? (
                    <>
                      Máximo: {Math.max(0, (sellModal.item?.quantity || 1) - 1)}
                      (KKS mantém sempre 1 unidade mínima)
                    </>
                  ) : (
                    <>Máximo disponível: {sellModal.item?.quantity || 1}</>
                  )}
                </p>
              </div>
              <div className="flex gap-2 justify-end">
                {" "}
                <button
                  onClick={() => {
                    setSellModal({ isOpen: false, item: null });
                    setSoldValue("");
                    setQuantitySold("1");
                    setValorTotal("");
                    setValorRecebido("");
                    setIsParcelado(false);
                    setParcelasTotal("1");
                    setParcelasPagas("1");
                  }}
                  className="px-4 py-2 text-muted-foreground hover:bg-muted rounded-md transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmSell}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
                >
                  Confirmar Venda
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
              Tem certeza que deseja deletar este item? Esta ação não pode ser
              desfeita.
            </p>

            <div className="bg-muted/50 border border-border rounded-md p-4 mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-muted rounded-md overflow-hidden flex-shrink-0">
                  <SmartImage
                    src={deleteModal.item?.image_url || ""}
                    alt={deleteModal.item?.name || ""}
                    className="w-full h-full object-cover"
                    enableModal={true}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = "/placeholder.svg";
                    }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {deleteModal.item?.name}
                  </p>
                  <p
                    className={`text-xs capitalize font-medium ${getCategoryStyles(
                      deleteModal.item?.category || ""
                    )}`}
                  >
                    {deleteModal.item?.category}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs bg-red-600/20 text-red-500 px-2 py-0.5 rounded">
                      RL: R$ {deleteModal.item?.rl_price.toFixed(2)}
                    </span>
                    <span className="text-xs bg-amber-600/20 text-amber-500 px-2 py-0.5 rounded">
                      KKS: {deleteModal.item?.kks_price.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Quantidade: {deleteModal.item?.quantity}x
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
                onClick={confirmDelete}
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

export default DeleteItemPage;
