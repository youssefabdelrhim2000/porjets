// ============================================
// useNotebooks Hook
// Manages notebook state and operations
// ============================================

import { useState, useCallback, useMemo } from 'react';
import { storageService } from '@/services';
import type { Notebook } from '@/types/notebook';

export function useNotebooks(searchQuery: string = '') {
  const [notebooks, setNotebooks] = useState<Notebook[]>(() => 
    storageService.getNotebooks()
  );

  const refreshNotebooks = useCallback(() => {
    setNotebooks(storageService.getNotebooks());
  }, []);

  const filteredNotebooks = useMemo(() => {
    if (!searchQuery.trim()) return notebooks;
    const query = searchQuery.toLowerCase();
    return notebooks.filter(n => 
      n.name.toLowerCase().includes(query) ||
      n.description?.toLowerCase().includes(query)
    );
  }, [notebooks, searchQuery]);

  const createNotebook = useCallback((notebook: Notebook) => {
    const result = storageService.saveNotebook(notebook);
    if (result.success) {
      refreshNotebooks();
    }
    return result;
  }, [refreshNotebooks]);

  const updateNotebook = useCallback((notebook: Notebook) => {
    const result = storageService.saveNotebook(notebook);
    if (result.success) {
      refreshNotebooks();
    }
    return result;
  }, [refreshNotebooks]);

  const deleteNotebook = useCallback((id: string) => {
    const result = storageService.deleteNotebook(id);
    if (result.success) {
      refreshNotebooks();
    }
    return result;
  }, [refreshNotebooks]);

  const getNotebookById = useCallback((id: string) => {
    return storageService.getNotebookById(id);
  }, []);

  return {
    notebooks,
    filteredNotebooks,
    refreshNotebooks,
    createNotebook,
    updateNotebook,
    deleteNotebook,
    getNotebookById,
  };
}
