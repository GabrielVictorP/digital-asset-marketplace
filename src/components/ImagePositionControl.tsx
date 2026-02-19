import React from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';

interface ImagePositionControlProps {
  position: { x: number; y: number };
  scale: number;
  onPositionChange: (position: { x: number; y: number }) => void;
  onScaleChange: (scale: number) => void;
}

const ImagePositionControl: React.FC<ImagePositionControlProps> = ({
  position,
  scale,
  onPositionChange,
  onScaleChange,
}) => {
  const moveStep = 10;
  const scaleStep = 0.1;
  const minScale = 0.5;
  const maxScale = 3;

  const handleMove = (direction: 'up' | 'down' | 'left' | 'right') => {
    const newPosition = { ...position };
    
    switch (direction) {
      case 'up':
        newPosition.y -= moveStep;
        break;
      case 'down':
        newPosition.y += moveStep;
        break;
      case 'left':
        newPosition.x -= moveStep;
        break;
      case 'right':
        newPosition.x += moveStep;
        break;
    }
    
    onPositionChange(newPosition);
  };

  const handleZoom = (direction: 'in' | 'out') => {
    const newScale = direction === 'in' 
      ? Math.min(scale + scaleStep, maxScale)
      : Math.max(scale - scaleStep, minScale);
    
    onScaleChange(newScale);
  };

  return (
    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-75 rounded-lg p-4">
      <div className="flex flex-col items-center space-y-4">
        {/* Position Controls */}
        <div className="text-white text-sm font-medium mb-2">Posição da Imagem</div>
        
        <div className="grid grid-cols-3 gap-2">
          {/* Top row */}
          <div></div>
          <button
            onClick={() => handleMove('up')}
            className="bg-gray-700 hover:bg-gray-600 text-white p-2 rounded transition-colors"
          >
            <ChevronUp className="h-5 w-5" />
          </button>
          <div></div>
          
          {/* Middle row */}
          <button
            onClick={() => handleMove('left')}
            className="bg-gray-700 hover:bg-gray-600 text-white p-2 rounded transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="bg-gray-800 text-white text-xs p-2 rounded text-center">
            {position.x}, {position.y}
          </div>
          <button
            onClick={() => handleMove('right')}
            className="bg-gray-700 hover:bg-gray-600 text-white p-2 rounded transition-colors"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          
          {/* Bottom row */}
          <div></div>
          <button
            onClick={() => handleMove('down')}
            className="bg-gray-700 hover:bg-gray-600 text-white p-2 rounded transition-colors"
          >
            <ChevronDown className="h-5 w-5" />
          </button>
          <div></div>
        </div>

        {/* Scale Controls */}
        <div className="flex items-center space-x-4">
          <button
            onClick={() => handleZoom('out')}
            className="bg-gray-700 hover:bg-gray-600 text-white p-2 rounded transition-colors"
            disabled={scale <= minScale}
          >
            <ZoomOut className="h-5 w-5" />
          </button>
          
          <div className="text-white text-sm font-medium min-w-20 text-center">
            {Math.round(scale * 100)}%
          </div>
          
          <button
            onClick={() => handleZoom('in')}
            className="bg-gray-700 hover:bg-gray-600 text-white p-2 rounded transition-colors"
            disabled={scale >= maxScale}
          >
            <ZoomIn className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImagePositionControl;
