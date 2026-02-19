
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Item } from '@/contexts/SupabaseItemsContext';
import { WhatsappIcon } from './icons/WhatsappIcon';
import { Info, Edit, ShoppingCart } from 'lucide-react';
import { formatCurrencyForUser } from '@/lib/locale-utils';
import SmartImage from './SmartImage';
import InfoModal from './InfoModal';
import SellerBlockModal from './SellerBlockModal';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { useUserPhoneNumber } from '@/hooks/useUserPhoneNumber';
import { useSellerProfile } from '@/hooks/useSellerProfile';
import logger from '@/lib/logger';

interface ItemCardProps {
  item: Item;
}

const ItemCard = ({ item }: ItemCardProps) => {
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showSellerBlockModal, setShowSellerBlockModal] = useState(false);
  const { user } = useSupabaseAuth();
  const { getWhatsAppNumber } = useUserPhoneNumber(item.user_id || undefined);
  const { isSeller, loading: sellerLoading } = useSellerProfile();
  const navigate = useNavigate();
  
  // Check if this item belongs to the admin
  const isAdminItem = item.user_id === import.meta.env.VITE_ADMIN_USER_ID;
  
  // Check if current user is Suport (owner)
  const isSuportOwner = user?.email === 'support@example.com';

  const formatPrice = (price: number): string => {
    if (price === 0) return "Grátis";
    return formatCurrencyForUser(price);
  };

  const formatKKSPrice = (price: number): string => {
    if (price === 0) return "Grátis";
    return price.toFixed(2);
  };
  // Function to get category-specific styling
  const getCategoryStyles = (category: string) => {
    switch (category) {
      case 'pally':
        return 'bg-pally-bg border-pally-primary text-pally-light';
      case 'kina':
        return 'bg-kina-bg border-kina-primary text-kina-light';
      case 'mage':
        return 'bg-mage-bg border-mage-primary text-mage-light';
      case 'itens':
        return 'bg-itens-bg border-itens-primary text-itens-light';
      case 'geral':
        return 'bg-geral-bg border-geral-primary text-geral-light';
      case 'supercell':
        return 'bg-brawlstars-bg border-brawlstars-primary text-black';
      case 'freefire':
        return 'bg-freefire-bg border-freefire-primary text-freefire-light';
      case 'promocoes':
        return 'bg-divulgacoes-bg border-divulgacoes-primary text-divulgacoes-light';
      default:
        return 'bg-gaming-primary/90 text-white';
    }
  };  const handleWhatsAppClick = () => {
    const phoneNumber = getWhatsAppNumber();
    if (!phoneNumber) {
      logger.error('WhatsApp number not configured');
      return;
    }// Include image link and item details in the message
    const baseMessage = `Gostaria de saber sobre o anúncio de ${item.name}`;

    // Add image link to the message (without localhost)
    const imageMessage = `${baseMessage}\n\n📸 Imagem: ${item.image_url}`;    // Add prices for context (only show non-zero values)
    const priceArray = [];
    if (item.rl_price > 0) {
      priceArray.push(`- RL: R$ ${item.rl_price.toFixed(2)}`);
    }
    if (item.parcelado_price > 0) {
      priceArray.push(`- Parcelado: R$ ${item.parcelado_price.toFixed(2)}`);
    }
    if (item.kks_price > 0) {
      priceArray.push(`- KKS: ${item.kks_price.toFixed(2)}`);
    }

    const priceInfo = priceArray.length > 0 ? `\n💰 Preços:\n${priceArray.join('\n')}` : '';

    const fullMessage = `${imageMessage}${priceInfo}`;

    const whatsappLink = `https://api.whatsapp.com/send?phone=${encodeURIComponent(phoneNumber)}&text=${encodeURIComponent(fullMessage)}`;
    window.open(whatsappLink, '_blank');
  };
  
  const handleBuyClick = () => {
    // Check if user is a seller first
    if (isSeller) {
      setShowSellerBlockModal(true);
      return;
    }
    
    if (item.quantity <= 0) {
      logger.error('Item out of stock');
      return;
    }
    navigate(`/checkout/${item.id}`);
  };
  return (<div className="bg-card border border-gaming-primary/20 rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-all duration-300 flex flex-col h-full hover:border-gaming-accent/40">
    <div className="relative aspect-square bg-muted">
      <SmartImage
        src={item.image_url}
        alt={item.name}
        className="w-full h-full object-cover"
        enableModal={true}
        onError={(e) => {
          // Fallback to placeholder if image fails to load
          const target = e.target as HTMLImageElement;
          target.src = '/placeholder.svg';
        }}
      />        <div className={`absolute top-2 left-2 backdrop-blur-sm px-2 py-1 rounded-md text-xs font-semibold border ${getCategoryStyles(item.category)}`}>
        {item.category === 'promocoes' ? 'DIVULGAÇÕES' : item.category.toUpperCase()}
      </div>      {/* Edit button - only show for items owned by current user */}
      {user && user.id === item.user_id && (
        <div className="absolute top-2 right-2">
          <Link
            to={`/edit/${item.id}`}
            className="inline-flex items-center justify-center w-8 h-8 bg-gaming-accent/90 backdrop-blur-sm rounded-md hover:bg-gaming-accent transition-colors duration-200"
            title="Editar item"
          >
            <Edit className="h-4 w-4 text-gaming-background" />
          </Link>
        </div>
      )}
    </div>    <div className="p-4 flex flex-col flex-1">
      <div className="flex-1">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-lg truncate" title={item.name}>
            {item.name}
          </h3>          {/* Show quantity for all items */}
          <span className="text-xs font-medium bg-gaming-primary/20 text-gaming-primary px-2 py-1 rounded-md">
            {item.quantity}x
          </span>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {item.rl_price > 0 && (
            <span className="price-rl">
              RL: {formatPrice(item.rl_price)}
            </span>
          )}
          {item.parcelado_price > 0 && (
            <span className="price-parcelado">
              Parcelado: {formatPrice(item.parcelado_price)}
            </span>
          )}
          {item.kks_price > 0 && (
            <span className="price-kks">
              KKS: {formatKKSPrice(item.kks_price)}
            </span>
          )}

          {/* Info button - only for Free Fire and Supercell with description */}
          {(item.category === 'freefire' || item.category === 'supercell') && item.description && (
            <button
              onClick={() => setShowInfoModal(true)}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-md transition-colors duration-200 text-xs font-medium ${item.category === 'freefire'
                ? 'bg-gaming-accent/20 hover:bg-gaming-accent/30 text-gaming-accent'
                : 'bg-gaming-primary/20 hover:bg-gaming-primary/30 text-gaming-primary'
                }`}
              title="Ver informações"
            >
              <Info className="h-3 w-3" />
              <span>Descrição</span>
            </button>
          )}
        </div>

        {/* Show special badge for KKS */}
        {item.name.toLowerCase() === 'kks' && (
          <div className="mb-4">
            <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-md px-3 py-2 text-center">
              <span className="text-sm font-medium text-yellow-200">
                🪙 Moeda KKS do Rucoy
              </span>
            </div>
          </div>
        )}

        {/* External Link - show if link exists (any category) */}
        {item.external_link && (
          <div className="mb-4">
            <a
              href={item.external_link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center w-full px-3 py-2 text-sm font-medium text-gaming-accent bg-gaming-accent/20 border border-gaming-accent/30 rounded-md hover:bg-gaming-accent/30 transition-colors duration-200"
            >
              🔗 Vídeo
            </a>
          </div>
        )}
      </div>{/* Buttons section */}
      <div className="space-y-2">
        {/* WhatsApp button */}
        <button
          onClick={handleWhatsAppClick}
          className="whatsapp-button w-full"
        >
          <WhatsappIcon className="h-5 w-5" />
          WhatsApp
        </button>
        
        {/* Buy button - only for admin items with available stock, valid prices (minimum R$ 5,00), is_active and not owner */}
        {/* Special case for KKS: allow purchase even if unit price < R$ 5,00, since minimum quantity will be 3 */}
        {/* Don't show buy button if current user is Suport (the owner) */}
        {/* REMOVED: Hide buy button for specific items: 'Diamantes - 100 unidades' and 'Kks' */}
        {isAdminItem && item.quantity > 0 && (
          // Special case for KKS (moeda do Rucoy) - allow purchase with minimum 3 units to reach R$ 5,00
          (item.name.toLowerCase() === 'kks' && ((item.rl_price > 0 && item.rl_price * 3 >= 5.00) || (item.parcelado_price > 0 && item.parcelado_price * 3 >= 5.00))) ||
          // Regular validation for other items
          (item.name.toLowerCase() !== 'kks' && ((item.rl_price >= 5.00) || (item.parcelado_price >= 5.00)))
        ) && (item.is_active !== false) && !isSuportOwner && 
        // Hide buy button for specific items by ID
        item.id !== '75f26a4b-be05-4dbd-a24f-f5aee6480b16' && // Diamantes - 100 unidades
        item.id !== '43fc052c-9089-4f7c-86fb-e49b888c7699' && ( // Kks
          <button
            onClick={handleBuyClick}
            disabled={sellerLoading}
            className="w-full bg-gradient-to-r from-gaming-accent to-gaming-primary hover:from-gaming-accent/90 hover:to-gaming-primary/90 text-gaming-background font-semibold py-2 px-4 rounded-md transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ShoppingCart className="h-4 w-4" />
            {sellerLoading ? 'Carregando...' : 'Comprar'}
          </button>
        )}
      </div>
    </div>

    {/* Info Modal */}
    {item.description && (
      <InfoModal
        isOpen={showInfoModal}
        onClose={() => setShowInfoModal(false)}
        title={`Informações sobre ${item.name}`}
        description={item.description}
      />
    )}
    
    {/* Seller Block Modal */}
    <SellerBlockModal
      isOpen={showSellerBlockModal}
      onClose={() => setShowSellerBlockModal(false)}
    />
  </div>
  );
};

export default ItemCard;
