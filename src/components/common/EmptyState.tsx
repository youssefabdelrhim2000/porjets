// ============================================
// EmptyState Component
// Reusable empty/no-results state
// ============================================

import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    icon?: LucideIcon;
    onClick: () => void;
  };
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
}) => {
  return (
    <div className="text-center py-16 bg-card/30 rounded-2xl border border-border/30">
      <Icon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
      <h3 className="text-xl font-bold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground mb-6">{description}</p>
      {action && (
        <Button
          onClick={action.onClick}
          style={{ 
            background: 'var(--gradient-gold)',
            boxShadow: 'var(--shadow-gold)' 
          }}
        >
          {action.icon && <action.icon className="w-5 h-5 ml-2" />}
          {action.label}
        </Button>
      )}
    </div>
  );
};
