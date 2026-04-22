import { useCallback } from 'react';
import { toast as sonnerToast } from 'sonner';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

type Toast = {
  id: string;
  message: string;
  type: ToastType;
};

const EMPTY_TOASTS: Toast[] = [];

export const useToast = () => {
  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const toastMethods = {
      success: sonnerToast.success,
      error: sonnerToast.error,
      info: sonnerToast.info,
      warning: sonnerToast.warning,
    };

    return String(toastMethods[type](message));
  }, []);

  const removeToast = useCallback((id: string) => {
    sonnerToast.dismiss(id);
  }, []);

  const success = useCallback((message: string) => showToast(message, 'success'), [showToast]);
  const error = useCallback((message: string) => showToast(message, 'error'), [showToast]);
  const info = useCallback((message: string) => showToast(message, 'info'), [showToast]);
  const warning = useCallback((message: string) => showToast(message, 'warning'), [showToast]);

  return {
    toasts: EMPTY_TOASTS,
    showToast,
    removeToast,
    success,
    error,
    info,
    warning,
  };
};
