// ============================================
// useDialogState Hook
// Manages multiple dialog states efficiently
// ============================================

import { useState, useCallback } from 'react';

type DialogName = string;

interface DialogState {
  isOpen: boolean;
  data?: unknown;
}

interface UseDialogStateReturn<T extends DialogName> {
  dialogs: Record<T, DialogState>;
  openDialog: (name: T, data?: unknown) => void;
  closeDialog: (name: T) => void;
  toggleDialog: (name: T) => void;
  getDialogData: <D>(name: T) => D | undefined;
  isDialogOpen: (name: T) => boolean;
}

export function useDialogState<T extends DialogName>(
  dialogNames: readonly T[]
): UseDialogStateReturn<T> {
  const initialState = dialogNames.reduce((acc, name) => {
    acc[name] = { isOpen: false };
    return acc;
  }, {} as Record<T, DialogState>);

  const [dialogs, setDialogs] = useState<Record<T, DialogState>>(initialState);

  const openDialog = useCallback((name: T, data?: unknown) => {
    setDialogs(prev => ({
      ...prev,
      [name]: { isOpen: true, data },
    }));
  }, []);

  const closeDialog = useCallback((name: T) => {
    setDialogs(prev => ({
      ...prev,
      [name]: { isOpen: false, data: undefined },
    }));
  }, []);

  const toggleDialog = useCallback((name: T) => {
    setDialogs(prev => ({
      ...prev,
      [name]: { isOpen: !prev[name].isOpen, data: prev[name].data },
    }));
  }, []);

  const getDialogData = useCallback(<D,>(name: T): D | undefined => {
    return dialogs[name]?.data as D | undefined;
  }, [dialogs]);

  const isDialogOpen = useCallback((name: T): boolean => {
    return dialogs[name]?.isOpen ?? false;
  }, [dialogs]);

  return {
    dialogs,
    openDialog,
    closeDialog,
    toggleDialog,
    getDialogData,
    isDialogOpen,
  };
}
