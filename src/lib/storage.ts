// ============================================
// Local Storage utilities for Demo mode
// DEPRECATED: Use src/services/storage/StorageService.ts instead
// This file is kept for backward compatibility
// ============================================

import { storageService } from '@/services';
import { NOTEBOOK_COLORS, NOTEBOOK_ICONS } from '@/lib/constants';
import type { Notebook, NotebookEntry, RegisteredUser, UserPermission } from '@/types/notebook';

// Re-export constants for backward compatibility
export { NOTEBOOK_COLORS, NOTEBOOK_ICONS };

// ========== User Management (Deprecated - use storageService) ==========

export const getRegisteredUsers = (): RegisteredUser[] => {
  return storageService.getUsers();
};

export const registerUser = (
  username: string, 
  password: string, 
  displayName: string,
  role: 'admin' | 'user' = 'user',
  permissions: UserPermission[] = []
): { success: boolean; error?: string } => {
  const newUser: RegisteredUser = {
    id: crypto.randomUUID(),
    username,
    password,
    displayName,
    createdAt: new Date().toISOString(),
    role,
    permissions,
  };
  return storageService.saveUser(newUser);
};

export const updateUserRole = (userId: string, role: 'admin' | 'user'): void => {
  storageService.updateUser(userId, { role });
};

export const updateUserPermissions = (userId: string, permissions: UserPermission[]): void => {
  storageService.updateUser(userId, { permissions });
};

export const authenticateUser = (username: string, password: string): RegisteredUser | null => {
  const users = storageService.getUsers();
  return users.find(u => u.username === username && u.password === password) || null;
};

export const deleteUser = (userId: string): void => {
  storageService.deleteUser(userId);
};

// ========== Notebook Management (Deprecated - use storageService) ==========

export const getNotebooks = (): Notebook[] => {
  return storageService.getNotebooks();
};

export const saveNotebook = (notebook: Notebook): void => {
  storageService.saveNotebook(notebook);
};

export const deleteNotebook = (notebookId: string): void => {
  storageService.deleteNotebook(notebookId);
};

export const getNotebookById = (notebookId: string): Notebook | undefined => {
  return storageService.getNotebookById(notebookId);
};

// ========== Entry Management (Deprecated - use storageService) ==========

export const getEntries = (): NotebookEntry[] => {
  return storageService.getEntries();
};

export const getEntriesByNotebook = (notebookId: string): NotebookEntry[] => {
  return storageService.getEntries(notebookId);
};

export const saveEntry = (entry: NotebookEntry): void => {
  storageService.saveEntry(entry);
};

export const deleteEntry = (entryId: string): void => {
  storageService.deleteEntry(entryId);
};
