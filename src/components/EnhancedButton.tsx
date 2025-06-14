
import React from 'react';
import { Button, ButtonProps } from '@/components/ui/button';

interface EnhancedButtonProps extends ButtonProps {
  animationType?: 'scale' | 'pulse' | 'bounce';
}

const EnhancedButton: React.FC<EnhancedButtonProps> = ({
  children,
  onClick,
  animationType = 'scale',
  className = '',
  ...props
}) => {
  const getAnimationClass = () => {
    switch (animationType) {
      case 'pulse':
        return 'hover:animate-pulse active:scale-95';
      case 'bounce':
        return 'hover:animate-bounce active:scale-95';
      default:
        return 'hover:scale-105 active:scale-95';
    }
  };

  return (
    <Button
      {...props}
      onClick={onClick}
      className={`transition-all duration-200 ${getAnimationClass()} ${className}`}
    >
      {children}
    </Button>
  );
};

export default EnhancedButton;
