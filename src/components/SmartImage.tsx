import React, { useState } from 'react';
import ImageModal from './ImageModal';

interface SmartImageProps {
  src: string;
  alt: string;
  className?: string;
  enableModal?: boolean;
  onError?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
}

const SmartImage: React.FC<SmartImageProps> = ({ 
  src, 
  alt, 
  className = "", 
  enableModal = true,
  onError 
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleImageClick = () => {
    if (enableModal) {
      setIsModalOpen(true);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  return (
    <>
      <img
        src={src}
        alt={alt}
        className={`${className} ${enableModal ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''}`}
        onClick={handleImageClick}
        onError={onError}
      />
      
      {enableModal && (
        <ImageModal
          src={src}
          alt={alt}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
        />
      )}
    </>
  );
};

export default SmartImage;
