// ============================================
// useEntries Hook
// Manages notebook entries state and operations
// ============================================

import { useState, useCallback, useMemo } from 'react';
import { storageService } from '@/services';
import { useAuth } from '@/contexts/AuthContext';
import type { NotebookEntry, EntryData, EntryUserInfo } from '@/types/notebook';

export function useEntries(notebookId: string) {
  const { user } = useAuth();
  const [entries, setEntries] = useState<NotebookEntry[]>(() => 
    storageService.getEntries(notebookId)
  );

  const refreshEntries = useCallback(() => {
    setEntries(storageService.getEntries(notebookId));
  }, [notebookId]);

  const filterEntries = useCallback((searchQuery: string) => {
    if (!searchQuery.trim()) return entries;
    const query = searchQuery.toLowerCase();
    return entries.filter(entry =>
      Object.values(entry.data).some(value =>
        String(value).toLowerCase().includes(query)
      )
    );
  }, [entries]);

  const createEntry = useCallback((data: EntryData) => {
    const currentUserInfo: EntryUserInfo = {
      userId: user?.id || '',
      username: user?.username || '',
      displayName: user?.displayName || '',
    };

    const entry: NotebookEntry = {
      id: crypto.randomUUID(),
      notebookId,
      data,
      createdBy: currentUserInfo,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = storageService.saveEntry(entry);
    if (result.success) {
      refreshEntries();
    }
    return result;
  }, [notebookId, user, refreshEntries]);

  const updateEntry = useCallback((entryId: string, data: EntryData) => {
    const existingEntry = entries.find(e => e.id === entryId);
    if (!existingEntry) {
      return { success: false, error: 'السجل غير موجود' };
    }

    const currentUserInfo: EntryUserInfo = {
      userId: user?.id || '',
      username: user?.username || '',
      displayName: user?.displayName || '',
    };

    const updatedEntry: NotebookEntry = {
      ...existingEntry,
      data,
      updatedAt: new Date().toISOString(),
      updatedBy: currentUserInfo,
    };

    const result = storageService.saveEntry(updatedEntry);
    if (result.success) {
      refreshEntries();
    }
    return result;
  }, [entries, user, refreshEntries]);

  const deleteEntry = useCallback((id: string) => {
    const result = storageService.deleteEntry(id);
    if (result.success) {
      refreshEntries();
    }
    return result;
  }, [refreshEntries]);

  return {
    entries,
    refreshEntries,
    filterEntries,
    createEntry,
    updateEntry,
    deleteEntry,
  };
}
