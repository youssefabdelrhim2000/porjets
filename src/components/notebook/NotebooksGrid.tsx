// ============================================
// NotebooksGrid Component
// Grid layout for displaying notebooks
// ============================================

import React from 'react';
import { Book, Plus } from 'lucide-react';
import { NotebookCard } from './NotebookCard';
import { EmptyState } from '@/components/common/EmptyState';
import type { Notebook } from '@/types/notebook';

interface NotebooksGridProps {
  notebooks: Notebook[];
  searchQuery?: string;
  isAdmin?: boolean;
  onOpenNotebook: (notebookId: string) => void;
  onEditNotebook?: (notebook: Notebook) => void;
  onDeleteNotebook?: (notebook: Notebook) => void;
  onCreateNotebook?: () => void;
}

export const NotebooksGrid: React.FC<NotebooksGridProps> = ({
  notebooks,
  searchQuery = '',
  isAdmin = false,
  onOpenNotebook,
  onEditNotebook,
  onDeleteNotebook,
  onCreateNotebook,
}) => {
  if (notebooks.length === 0) {
    return (
      <EmptyState
        icon={Book}
        title={searchQuery ? 'لا توجد نتائج' : 'لا توجد دفاتر'}
        description={searchQuery ? 'جرب البحث بكلمات مختلفة' : 'ابدأ بإنشاء دفتر جديد لتنظيم بياناتك'}
        action={!searchQuery && isAdmin && onCreateNotebook ? {
          label: 'إنشاء أول دفتر',
          icon: Plus,
          onClick: onCreateNotebook,
        } : undefined}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {notebooks.map((notebook) => (
        <NotebookCard
          key={notebook.id}
          notebook={notebook}
          onClick={() => onOpenNotebook(notebook.id)}
          onEdit={onEditNotebook ? () => onEditNotebook(notebook) : undefined}
          onDelete={onDeleteNotebook ? () => onDeleteNotebook(notebook) : undefined}
          showActions={isAdmin}
        />
      ))}
    </div>
  );
};