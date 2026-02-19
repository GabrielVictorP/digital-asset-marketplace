
import { WhatsappIcon } from './icons/WhatsappIcon';
import { useUserPhoneNumber } from '@/hooks/useUserPhoneNumber';
import logger from '@/lib/logger';

interface WhatsAppButtonProps {
  itemName: string;
  itemImageUrl?: string;
  itemPrices?: {
    rl_price: number;
    parcelado_price: number;
    kks_price: number;
  };
  itemUserId?: string; // Add user ID to get their phone number
  className?: string;
}

const WhatsAppButton = ({ itemName, itemImageUrl, itemPrices, itemUserId, className = "" }: WhatsAppButtonProps) => {
  const { getWhatsAppNumber } = useUserPhoneNumber(itemUserId);

  const handleWhatsAppClick = () => {
    const phoneNumber = getWhatsAppNumber();

    if (!phoneNumber) {
      logger.error('WhatsApp number not configured');
      return;
    }

    let message = `Gostaria de saber sobre o anúncio de ${itemName}`;

    // Add image link if provided (without localhost)
    if (itemImageUrl) {
      message += `\n\n📸 Imagem: ${itemImageUrl}`;
    }

    // Add prices if provided
    if (itemPrices) {
      const priceInfo = `\n💰 Preços:\n- RL: ${itemPrices.rl_price === 0 ? 'Grátis' : `R$ ${itemPrices.rl_price.toFixed(2)}`}\n- Parcelado: ${itemPrices.parcelado_price === 0 ? 'Grátis' : `R$ ${itemPrices.parcelado_price.toFixed(2)}`}\n- KKS: ${itemPrices.kks_price === 0 ? 'Grátis' : itemPrices.kks_price.toFixed(2)}`;
      message += priceInfo;
    }

    const whatsappLink = `https://api.whatsapp.com/send?phone=${encodeURIComponent(phoneNumber)}&text=${encodeURIComponent(message)}`;
    window.open(whatsappLink, '_blank');
  };

  return (
    <button
      onClick={handleWhatsAppClick}
      className={`bg-gaming-accent hover:bg-gaming-accent/90 text-gaming-background px-4 py-2 rounded-md flex items-center gap-2 transition-colors font-semibold shadow-lg border border-gaming-gold/30 ${className}`}
    >
      <WhatsappIcon className="h-5 w-5" />
      WhatsApp
    </button>
  );
};

export default WhatsAppButton;
