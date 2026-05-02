// ============================================
// IconButton Component
// Reusable icon button with tooltip
// ============================================

import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface IconButtonProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  badge?: number | string;
  disabled?: boolean;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon: Icon,
  label,
  onClick,
  variant = 'ghost',
  size = 'icon',
  className = '',
  badge,
  disabled = false,
}) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant={variant} 
            size={size}
            onClick={onClick}
            className={`relative ${className}`}
            disabled={disabled}
            title={label}
          >
            <Icon className="w-5 h-5 text-muted-foreground" />
            {badge !== undefined && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-accent text-accent-foreground text-xs rounded-full flex items-center justify-center">
                {badge}
              </span>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
