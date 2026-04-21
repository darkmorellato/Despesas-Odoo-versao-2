import { useState, useCallback } from 'react';
import type { Toast, ToastType } from '@/shared/types';

/**
 * Return type for useToast hook
 * @interface UseToastReturn
 */
interface UseToastReturn {
  /** Current active toasts */
  toasts: Toast[];
  /** Show a new toast notification */
  showToast: (message: string, type?: ToastType) => void;
  /** Remove a toast by ID */
  removeToast: (id: number) => void;
}

/**
 * Hook para gerenciar notificações toast
 * 
 * Exibe mensagens temporárias de sucesso, erro ou informação
 * que desaparecem automaticamente após 4 segundos.
 * 
 * @returns Objeto com toasts e funções de controle
 * 
 * @example
 * ```tsx
 * const { showToast, toasts } = useToast();
 * 
 * // Mostrar toast de sucesso
 * showToast('Despesa salva com sucesso!', 'success');
 * 
 * // Mostrar toast de erro
 * showToast('Erro ao salvar', 'error');
 * ```
 */
export const useToast = (): UseToastReturn => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return { toasts, showToast, removeToast };
};
