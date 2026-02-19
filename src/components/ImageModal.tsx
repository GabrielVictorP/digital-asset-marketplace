import React from 'react';
import { X } from 'lucide-react';

interface ImageModalProps {
  src: string;
  alt: string;
  isOpen: boolean;
  onClose: () => void;
}

const ImageModal: React.FC<ImageModalProps> = ({ src, alt, isOpen, onClose }) => {
  if (!isOpen) return null;
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Fechar apenas se clicar no backdrop (não na imagem)
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleImageClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Impedir que o clique na imagem propague para o backdrop
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div 
        className="relative w-full h-full flex items-center justify-center p-4"
        onClick={handleBackdropClick}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors z-10"
        >
          <X className="h-8 w-8" />
        </button>

        {/* Image Container */}
        <div 
          className="relative max-w-full max-h-full overflow-hidden"
          onClick={handleImageClick}
        >
          <img
            src={src}
            alt={alt}
            className="max-w-full max-h-full object-contain"
            draggable={false}
            onClick={handleImageClick}
          />
        </div>
      </div>
    </div>
  );
};

export default ImageModal;
