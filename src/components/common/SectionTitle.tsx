// ============================================
// SectionTitle Component
// Reusable section header with icon and badge
// ============================================

import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface SectionTitleProps {
  icon?: LucideIcon;
  title: string;
  count?: number;
  className?: string;
}

export const SectionTitle: React.FC<SectionTitleProps> = ({
  icon: Icon,
  title,
  count,
  className = '',
}) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {Icon && <Icon className="w-6 h-6 text-primary" />}
      <h2 className="text-xl font-bold text-foreground">{title}</h2>
      {count !== undefined && (
        <Badge variant="secondary">{count}</Badge>
      )}
    </div>
  );
};
