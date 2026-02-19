
import { useState, useEffect } from 'react';
import { Navigate, useParams, useNavigate } from 'react-router-dom';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { useSupabaseItems } from '@/hooks/useSupabaseItems';
import { usePhotoLimit } from '@/hooks/usePhotoLimit';
import { useGameAccount } from '@/hooks/useGameAccount';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { Category, Item } from '@/contexts/SupabaseItemsContext';
import { Upload, Image as ImageIcon, Crop, AlertCircle, Key, Link } from 'lucide-react';
import SmartImage from '@/components/SmartImage';
import ImageCropper from '@/components/ImageCropper';
import LinkAccountModal from '@/components/LinkAccountModal';
import { toast } from 'sonner';
import logger from '@/lib/logger';
import { supabase } from '@/integrations/supabase/client';
import { GameAccountService } from '@/services/GameAccountService';

const CreateItemPage = () => {
  const { user } = useSupabaseAuth();
  const navigate = useNavigate();
  const { isSuperAdmin } = useSuperAdmin();
  const { addItem, updateItem, uploadImage, getItemWithSensitiveData } = useSupabaseItems();
  const { photoLimit, currentCount, canCreate, loading: photoLimitLoading, refreshPhotoLimit } = usePhotoLimit();
  const { id } = useParams<{ id: string }>();  // Check if this is edit mode
  const isEditMode = Boolean(id);
  const [existingItem, setExistingItem] = useState<Item | null>(null);
  const [loadingItem, setLoadingItem] = useState(false);
  const [hasTriedToLoad, setHasTriedToLoad] = useState(false);

  logger.log('CreateItemPage rendered:', { id, isEditMode }); const [formData, setFormData] = useState({
    name: '',
    image_path: null as string | null,
    rl_price: '' as string,
    parcelado_price: '' as string,
    kks_price: '' as string,
    purchased_value: '' as string,
    quantity: '1' as string,
    external_link: '' as string,
    description: '' as string,
    category: 'geral' as Category,
  });
  const [imagePreview, setImagePreview] = useState('/placeholder.svg');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showCropper, setShowCropper] = useState(false);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  
  // Estado para o modal de vincular acesso
  const [showLinkAccountModal, setShowLinkAccountModal] = useState(false);
  
  // Estado para credenciais pendentes (para modo de criação)
  const [pendingCredentials, setPendingCredentials] = useState<{
    email: string;
    password: string;
    token?: string;
  } | null>(null);
  
  // Hook para gerenciar contas de jogos (apenas para modo de edição)
  const { hasLinkedAccount, loading: accountLoading, updateAccountStatus } = useGameAccount(
    isEditMode ? id || null : null
  );
  useEffect(() => {
    const loadExistingItem = async () => {
      logger.log('loadExistingItem called:', { isEditMode, id });

      if (isEditMode && id) {
        setLoadingItem(true);
        setHasTriedToLoad(false);

        const item = await getItemWithSensitiveData(id);

        logger.log('Item loaded for editing:', { id: item?.id, name: item?.name });

        if (item) {
          setExistingItem(item);
          setFormData({
            name: item.name,
            image_path: item.image_path,
            rl_price: item.rl_price.toString(),
            parcelado_price: item.parcelado_price.toString(),
            kks_price: item.kks_price.toString(),
            purchased_value: item.purchased_value.toString(),
            quantity: item.quantity.toString(),
            external_link: item.external_link || '',
            description: item.description || '',
            category: item.category,
          });
          setImagePreview(item.image_url);
          logger.log('Item loaded and form data set:', item);
        } else {
          logger.log('Failed to load item or item not found');
        }

        setLoadingItem(false);
        setHasTriedToLoad(true);
      } else {
        // Not in edit mode, mark as tried
        setHasTriedToLoad(true);
      }
    };

    loadExistingItem();
  }, [isEditMode, id, getItemWithSensitiveData]);// Redirect if not authenticated
  if (!user) {
    return <Navigate to="/auth/admin" />;
  }

  // Show loading while fetching item in edit mode
  if (isEditMode && loadingItem) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  // Redirect if in edit mode but item doesn't exist or user doesn't own it
  if (isEditMode && id && !loadingItem && hasTriedToLoad && !existingItem) {
    logger.log('Redirecting to create because item not found');
    return <Navigate to="/create" />;
  }
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target; if (name === 'rl_price' || name === 'parcelado_price' || name === 'kks_price' || name === 'purchased_value' || name === 'quantity') {
      // Allow empty string or valid number
      if (value === '' || (!isNaN(parseFloat(value)) && parseFloat(value) >= 0)) {
        setFormData({
          ...formData,
          [name]: value,
        });
      }
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
  };
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setOriginalFile(file);
      const url = URL.createObjectURL(file);
      setOriginalImageUrl(url);
      setShowCropper(true);
    }
  };

  const handleCropComplete = (croppedImageBlob: Blob) => {
    // Convert blob to file
    const croppedFile = new File([croppedImageBlob], 'cropped-image.jpg', {
      type: 'image/jpeg'
    });

    setSelectedFile(croppedFile);
    const url = URL.createObjectURL(croppedImageBlob);
    setImagePreview(url);
    setShowCropper(false);
  };

  const handleCropCancel = () => {
    setShowCropper(false);
  };

  const handleRecropImage = () => {
    if (originalImageUrl) {
      setShowCropper(true);
    }
  };  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check photo limit for new items (not for edits)
    if (!isEditMode && !canCreate) {
      toast.error(`Limite de fotos atingido! Você pode criar no máximo ${photoLimit} itens. Atualmente tem ${currentCount} itens.`);
      return;
    }

    setUploading(true);

    logger.log('handleSubmit called:', { isEditMode, id, existingItem });

    try {
      let imagePath = formData.image_path; // Keep existing image path in edit mode

      // Only upload new image if a file was selected
      if (selectedFile) {
        const uploadedPath = await uploadImage(selectedFile);
        if (!uploadedPath) {
          setUploading(false);
          return;
        }
        imagePath = uploadedPath;
      }

      const baseItemData = {
        name: formData.name,
        image_path: imagePath,
        rl_price: parseFloat(formData.rl_price) || 0,
        parcelado_price: parseFloat(formData.parcelado_price) || 0,
        kks_price: parseFloat(formData.kks_price) || 0,
        purchased_value: parseFloat(formData.purchased_value) || 0,
        quantity: parseInt(formData.quantity) || 1,
        external_link: formData.external_link || null,
        category: formData.category,
        description: null as string | null,
      };

      // Only include description if it has content and category supports it
      if (formData.description && formData.description.trim() &&
        (formData.category === 'freefire' || formData.category === 'supercell')) {
        baseItemData.description = formData.description.trim();
      }

      const itemData = baseItemData;

      logger.log('Prepared item data:', { name: itemData.name, category: itemData.category });

      if (isEditMode && id) {
        // Update existing item
        logger.log('Calling updateItem with ID:', id);
        await updateItem(id, itemData);
        toast.success('Item atualizado com sucesso!');
        // Redirect to home page after successful update
        navigate('/');
      } else {
        // Create new item
        logger.log('Calling addItem for new item:', itemData.name);
        const newItem = await addItem(itemData);
        
        // Se há credenciais pendentes, tentar vinculá-las após um breve delay para garantir que o item foi criado
        if (pendingCredentials) {
          // Aguardar um pouco e depois tentar buscar o item criado pela data mais recente
          setTimeout(async () => {
            try {
              // Buscar o item mais recente do usuário pela data de criação
              const { data: recentItems, error: fetchError } = await supabase
                .from('items')
                .select('id')
                .eq('user_id', user?.id)
                .eq('name', itemData.name) // Filtrar pelo nome para mais precisão
                .order('created_at', { ascending: false })
                .limit(1);

              if (fetchError || !recentItems || recentItems.length === 0) {
                console.error('Error fetching recent item:', fetchError);
                toast.success('Item criado com sucesso! Para vincular credenciais, edite o item.');
                return;
              }

              const recentItemId = recentItems[0].id;
              
              await GameAccountService.createAccount({
                item_id: recentItemId,
                email: pendingCredentials.email,
                password: pendingCredentials.password,
                token: pendingCredentials.token
              });
              
              // Não mostrar toast aqui pois o usuário já foi redirecionado
            } catch (error) {
              console.error('Error linking credentials to new item:', error);
              // Não mostrar toast de erro pois o usuário já foi redirecionado
            }
          }, 1000);
          
          toast.success('Item criado com sucesso! Credenciais serão vinculadas automaticamente.');
        } else {
          toast.success('Item criado com sucesso!');
        }
        
        // Refresh photo limit after creating item
        refreshPhotoLimit();
        
        // Redirect to home page after successful creation
        navigate('/');
      }

      // Reset form (this code will execute but won't be visible due to redirect)
      if (!isEditMode) {
        setFormData({
          name: '',
          image_path: null,
          rl_price: '',
          parcelado_price: '',
          kks_price: '',
          purchased_value: '',
          quantity: '1',
          external_link: '',
          description: '',
          category: 'geral' as Category,
        });
        setImagePreview('/placeholder.svg');
        setSelectedFile(null);
        setShowCropper(false);
        setOriginalImageUrl(null);
        setOriginalFile(null);
      }
    } finally {
      setUploading(false);
    }
  };  return (<div className="max-w-xl mx-auto">
    <h1 className="text-3xl font-bold mb-8">
      {isEditMode ? `Editar ${existingItem?.name || 'Item'}` : 'Criar Novo Item'}
    </h1>      {/* Photo Limit Status */}
      {!isEditMode && !photoLimitLoading && (
        <div className={`mb-6 p-4 rounded-lg border ${
          canCreate 
            ? 'bg-green-50 border-green-200 text-green-800' 
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <div className="flex items-center gap-2">
            {canCreate ? (
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            ) : (
              <AlertCircle className="h-4 w-4 text-red-500" />
            )}
            <span className="font-medium">
              {photoLimit === -1 
                ? 'Acesso ilimitado (Admin principal)' 
                : canCreate 
                  ? `Você pode criar mais ${photoLimit - currentCount} itens` 
                  : 'Limite de fotos atingido'
              }
            </span>
          </div>
          <p className="text-sm mt-1">
            {photoLimit === -1 
              ? `Items criados: ${currentCount} (sem limite)`
              : `Items criados: ${currentCount} de ${photoLimit} permitidos`
            }
          </p>
        </div>
      )}

      {/* Botão Vincular Acesso - apenas para o admin support@example.com */}
      {isSuperAdmin && (
        <div className="mb-6">
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border">
            <div className="flex items-center gap-3">
              <Key className="h-5 w-5 text-muted-foreground" />
              <div>
                <h3 className="font-medium">Credenciais do Jogo</h3>
                <p className="text-sm text-muted-foreground">
                  {isEditMode ? (
                    hasLinkedAccount ? 'Acesso já vinculado a este item' : 'Nenhum acesso vinculado'
                  ) : (
                    pendingCredentials ? 'Credenciais preparadas para vinculação' : 'Nenhum acesso preparado'
                  )}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowLinkAccountModal(true)}
              disabled={accountLoading}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                (isEditMode ? hasLinkedAccount : pendingCredentials)
                  ? 'bg-green-100 text-green-700 border border-green-300 hover:bg-green-200'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {accountLoading ? (
                <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <>  
                  {(isEditMode ? hasLinkedAccount : pendingCredentials) ? (
                    <>
                      <Link className="h-4 w-4" />
                      <span className="relative">
                        {isEditMode ? 'Editar Acesso' : 'Editar Credenciais'}
                        <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      </span>
                    </>
                  ) : (
                    <>
                      <Key className="h-4 w-4" />
                      {isEditMode ? 'Vincular Acesso' : 'Preparar Credenciais'}
                    </>
                  )}
                </>
              )}
            </button>
          </div>
        </div>
      )}

    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="name" className="block text-sm font-medium mb-2">
          Nome do Produto
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleInputChange}
          className="w-full px-3 py-2 bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
          placeholder="Digite o nome do produto"
          required
        />
      </div>        <div>
        <label className="block text-sm font-medium mb-2">
          Prévia
        </label>
        <div className="border border-border rounded-lg overflow-hidden mb-4 aspect-square w-full max-w-xs mx-auto bg-muted">
          <SmartImage
            src={imagePreview}
            alt="Prévia"
            className="w-full h-full object-cover"
            enableModal={false}
            onError={() => setImagePreview('/placeholder.svg')}
          />
        </div>
        {selectedFile && (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={handleRecropImage}
              className="px-3 py-2 text-sm bg-muted hover:bg-muted/80 border border-border rounded-md flex items-center gap-2 transition-colors"
            >
              <Crop className="h-4 w-4" />
              Recortar Novamente
            </button>
          </div>
        )}
      </div>

      <div>
        <label htmlFor="image" className="block text-sm font-medium mb-2">
          Enviar Imagem
        </label>
        <div className="flex items-center gap-2">
          <input
            type="file"
            id="image"
            accept="image/*"
            onChange={handleImageChange}
            className="flex-1 px-3 py-2 bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary file:mr-4 file:py-1 file:px-2 file:rounded file:border-0 file:text-sm file:bg-primary file:text-primary-foreground"
          />
          <ImageIcon className="h-5 w-5 text-muted-foreground" />
        </div>
      </div>

      <div>          <label htmlFor="category" className="block text-sm font-medium mb-2">
        Categoria
      </label>          <select
        id="category"
        name="category"
        value={formData.category}
        onChange={handleInputChange}
        className="w-full px-3 py-2 bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
        required
      >
          <option value="kina">Kina</option>
          <option value="mage">Mage</option>
          <option value="pally">Pally</option>
          <option value="geral">Geral</option>
          <option value="outros">Outros</option>
          <option value="supercell">Supercell</option>
          <option value="freefire">Free Fire</option>
          <option value="itens">Itens</option>
          {isSuperAdmin && <option value="promocoes">Divulgações</option>}
        </select></div>
      <div>
        <label htmlFor="external_link" className="block text-sm font-medium mb-2">
          Vídeo (Opcional)
        </label>
        <input
          type="url"
          id="external_link"
          name="external_link"
          value={formData.external_link}
          onChange={handleInputChange}
          placeholder="https://exemplo.com"
          className="w-full px-3 py-2 bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Este link será exibido acima do botão do WhatsApp quando preenchido
        </p>
      </div>

      {/* Description field - only for Free Fire and Supercell */}
      {(formData.category === 'freefire' || formData.category === 'supercell') && (
        <div>
          <label htmlFor="description" className="block text-sm font-medium mb-2">
            Descrição
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            placeholder="Descreva detalhes sobre esta conta..."
            rows={3}
            className="w-full px-3 py-2 bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary resize-vertical"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Esta descrição será exibida quando o usuário clicar no botão de informações
          </p>
        </div>
      )}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>            <label htmlFor="rl_price" className="block text-sm font-medium mb-2">
          Preço RL
        </label>
          <input
            type="number"
            id="rl_price"
            name="rl_price"
            min="0"
            step="0.01"
            value={formData.rl_price}
            onChange={handleInputChange}
            placeholder="0.00"
            className="w-full px-3 py-2 bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div>            <label htmlFor="parcelado_price" className="block text-sm font-medium mb-2">
          Preço Parcelado
        </label>
          <input
            type="number"
            id="parcelado_price"
            name="parcelado_price"
            min="0"
            step="0.01"
            value={formData.parcelado_price}
            onChange={handleInputChange}
            placeholder="0.00"
            className="w-full px-3 py-2 bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div>            <label htmlFor="kks_price" className="block text-sm font-medium mb-2">
          Preço KKS
        </label>
          <input
            type="number"
            id="kks_price"
            name="kks_price"
            min="0"
            step="0.01"
            value={formData.kks_price}
            onChange={handleInputChange}
            placeholder="0.00"
            className="w-full px-3 py-2 bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>        <div>            <label htmlFor="purchased_value" className="block text-sm font-medium mb-2">
          Valor Pago
        </label>
          <input
            type="number"
            id="purchased_value"
            name="purchased_value"
            min="0"
            step="0.01"
            value={formData.purchased_value}
            onChange={handleInputChange}
            placeholder="0.00"
            className="w-full px-3 py-2 bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div>            <label htmlFor="quantity" className="block text-sm font-medium mb-2">
          Quantidade
        </label>
          <input
            type="number"
            id="quantity"
            name="quantity"
            min="1"
            step="1"
            value={formData.quantity}
            onChange={handleInputChange}
            placeholder="1"
            className="w-full px-3 py-2 bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Para KKS, esta quantidade será acumulada quando vendida
          </p>
        </div>        </div>        <button
          type="submit"
          disabled={uploading || (!isEditMode && !canCreate)}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-2 px-4 rounded-md flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
        {uploading ? (
          <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : !isEditMode && !canCreate ? (
          <>
            <AlertCircle className="h-4 w-4" />
            Limite de Fotos Atingido
          </>
        ) : (<>
          <Upload className="h-4 w-4" />
          {isEditMode ? 'Atualizar Item' : 'Criar Item'}
        </>
        )}        </button>
    </form>

    {/* Image Cropper Modal */}
    {showCropper && originalImageUrl && (
      <ImageCropper
        src={originalImageUrl}
        onCropComplete={handleCropComplete}
        onCancel={handleCropCancel}
        aspectRatio={1} // Square crop for product images
      />
    )}

    {/* Link Account Modal */}
    <LinkAccountModal
      isOpen={showLinkAccountModal}
      onClose={() => setShowLinkAccountModal(false)}
      itemId={isEditMode ? id || null : null}
      onAccountLinked={(hasAccount) => {
        if (isEditMode) {
          updateAccountStatus(hasAccount);
        }
        // Para modo de criação, o estado visual é controlado por pendingCredentials
      }}
      pendingCredentials={!isEditMode ? pendingCredentials : undefined}
      onPendingCredentialsChange={!isEditMode ? setPendingCredentials : undefined}
    />
  </div>
  );
};

export default CreateItemPage;
