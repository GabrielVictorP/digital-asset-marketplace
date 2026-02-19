import React, { useState, useRef } from 'react';
import { Badge } from '@/components/ui/badge';

interface VariableTooltipProps {
  variableName: string;
  description: string;
  className?: string;
}

const VariableTooltip: React.FC<VariableTooltipProps> = ({ variableName, description, className = "" }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLSpanElement>(null);

  const handleMouseEnter = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.top - 10,
        left: rect.left + rect.width / 2
      });
      setIsVisible(true);
    }
  };

  const handleMouseLeave = () => {
    setIsVisible(false);
  };

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`inline-block ${className}`}
      >
        <Badge 
          variant="secondary" 
          className="mx-0.5 bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200 font-mono text-xs transition-colors cursor-pointer"
        >
          {variableName}
        </Badge>
      </span>
      
      {isVisible && (
        <div
          className="fixed bg-gray-900 text-white text-sm px-3 py-2 rounded-md shadow-lg max-w-xs z-[99999] pointer-events-none"
          style={{
            top: position.top,
            left: position.left,
            transform: 'translate(-50%, -100%)',
            zIndex: 99999
          }}
        >
          {description}
        </div>
      )}
    </>
  );
};

export default VariableTooltip;
