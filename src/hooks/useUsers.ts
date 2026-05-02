// ============================================
// useUsers Hook
// Manages users state and operations
// ============================================

import { useState, useCallback } from 'react';
import { storageService } from '@/services';
import type { RegisteredUser, UserPermission } from '@/types/notebook';

export function useUsers() {
  const [users, setUsers] = useState<RegisteredUser[]>(() => 
    storageService.getUsers()
  );

  const refreshUsers = useCallback(() => {
    setUsers(storageService.getUsers());
  }, []);

  const updateUserRole = useCallback((userId: string, role: 'admin' | 'user') => {
    const result = storageService.updateUser(userId, { role });
    if (result.success) {
      refreshUsers();
    }
    return result;
  }, [refreshUsers]);

  const updateUserPermissions = useCallback((userId: string, permissions: UserPermission[]) => {
    const result = storageService.updateUser(userId, { permissions });
    if (result.success) {
      refreshUsers();
    }
    return result;
  }, [refreshUsers]);

  const deleteUser = useCallback((userId: string) => {
    const result = storageService.deleteUser(userId);
    if (result.success) {
      refreshUsers();
    }
    return result;
  }, [refreshUsers]);

  return {
    users,
    refreshUsers,
    updateUserRole,
    updateUserPermissions,
    deleteUser,
  };
}
