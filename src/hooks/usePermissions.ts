// ============================================
// usePermissions Hook
// Check user permissions
// ============================================

import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { storageService } from '@/services';
import type { UserPermission } from '@/types/notebook';

export function usePermissions() {
  const { user } = useAuth();

  const permissions = useMemo(() => {
    if (!user) return [];
    if (user.role === 'admin') return [] as UserPermission[]; // Admin has all permissions
    
    const registeredUser = storageService.getUsers().find(u => u.id === user.id);
    return registeredUser?.permissions || [];
  }, [user]);

  const isAdmin = user?.role === 'admin';

  const hasPermission = (permission: UserPermission): boolean => {
    if (isAdmin) return true;
    return permissions.includes(permission);
  };

  const canCreateNotebooks = hasPermission('create_notebooks');
  const canEditNotebooks = hasPermission('edit_notebooks');
  const canDeleteNotebooks = hasPermission('delete_notebooks');
  const canImportData = hasPermission('import_data');
  const canExportData = hasPermission('export_data');
  const canManageUsers = hasPermission('manage_users');
  const canEditEntries = hasPermission('edit_entries');
  const canDeleteEntries = hasPermission('delete_entries');
  const canViewAudit = hasPermission('view_audit');

  return {
    isAdmin,
    permissions,
    hasPermission,
    canCreateNotebooks: isAdmin || canCreateNotebooks,
    canEditNotebooks: isAdmin || canEditNotebooks,
    canDeleteNotebooks: isAdmin || canDeleteNotebooks,
    canImportData: isAdmin || canImportData,
    canExportData: isAdmin || canExportData,
    canManageUsers: isAdmin || canManageUsers,
    canEditEntries: isAdmin || canEditEntries,
    canDeleteEntries: isAdmin || canDeleteEntries,
    canViewAudit: isAdmin || canViewAudit,
  };
}
