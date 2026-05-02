// ============================================
// NotebookCard Component
// Atomic component for displaying a notebook
// ============================================

import React, { memo, useMemo } from 'react';
import { ChevronRight, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ICON_MAP, NOTEBOOK_COLORS } from '@/lib/constants';
import type { Notebook } from '@/types/notebook';

interface NotebookCardProps {
  notebook: Notebook;
  onClick: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  showActions?: boolean;
}

export const NotebookCard: React.FC<NotebookCardProps> = memo(({
  notebook,
  onClick,
  onEdit,
  onDelete,
  showActions = false,
}) => {
  
  // 🚀 Caching للـ Icon والـ Color عشان نسرع الريندر
  const { IconComponent, colorClass } = useMemo(() => {
    return {
      IconComponent: ICON_MAP[notebook.icon as keyof typeof ICON_MAP] || ICON_MAP.book,
      colorClass: NOTEBOOK_COLORS.find(c => c.value === notebook.color)?.class || NOTEBOOK_COLORS[0].class
    };
  }, [notebook.icon, notebook.color]);

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.();
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.();
  };

  // 🚀 دعم الكيبورد (Accessibility)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className={`group relative p-6 rounded-2xl border bg-gradient-to-br ${colorClass} hover:scale-[1.02] transition-all duration-300 text-right cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2`}
      onClick={onClick}
    >
      {/* Admin Actions Menu */}
      {showActions && (onEdit || onDelete) && (
        <div className="absolute top-3 left-3 z-10">
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 bg-background/50 hover:bg-background/80 backdrop-blur-sm"
              >
                <MoreVertical className="w-4 h-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="bg-card border-border">
              {onEdit && (
                <DropdownMenuItem 
                  onClick={handleEditClick}
                  className="cursor-pointer"
                >
                  <Pencil className="w-4 h-4 ml-2" />
                  تعديل الدفتر
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem 
                  onClick={handleDeleteClick}
                  className="cursor-pointer text-accent focus:text-accent"
                >
                  <Trash2 className="w-4 h-4 ml-2" />
                  حذف الدفتر
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Glow Effect */}
      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-primary/5 blur-xl pointer-events-none" />
      
      {/* Content */}
      <div className="relative">
        {/* Icon */}
        <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center mb-4 border border-primary/30">
          <IconComponent className="w-7 h-7 text-primary" />
        </div>

        {/* Title */}
        <h3 className="text-lg font-bold text-foreground mb-2 line-clamp-1">
          {notebook.name}
        </h3>

        {/* Description */}
        {notebook.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
            {notebook.description}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-border/30">
          <Badge variant="secondary" className="text-xs">
            {notebook.fields?.length || 0} حقول
          </Badge>
          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-[-4px] transition-all" />
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // 🚀 شرط الـ Memo: الكارت مش هيرندر تاني إلا لو الداتا دي اتغيرت
  return prevProps.notebook.id === nextProps.notebook.id &&
         prevProps.notebook.name === nextProps.notebook.name &&
         prevProps.notebook.fields?.length === nextProps.notebook.fields?.length &&
         prevProps.showActions === nextProps.showActions;
});

// عشان اسم الكومبوننت يظهر صح في أدوات الـ Debugging
NotebookCard.displayName = 'NotebookCard';