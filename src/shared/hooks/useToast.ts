import { useState, useCallback, useEffect, useRef } from 'react';
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
// Contador monotônico em escopo de módulo: `Date.now()` colidia quando dois
// toasts saíam no mesmo milissegundo — o timeout do primeiro removia OS DOIS
// e a chave React ficava duplicada.
let toastIdCounter = 0;
const MAX_VISIBLE_TOASTS = 5;

export const useToast = (): UseToastReturn => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const removeToast = useCallback((id: number) => {
    const timer = timersRef.current.get(id);
    if (timer !== undefined) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = ++toastIdCounter;
    // Limite de toasts simultâneos: descarta o mais antigo (o timer órfão
    // dele dispara um removeToast inofensivo depois)
    setToasts(prev =>
      prev.length >= MAX_VISIBLE_TOASTS
        ? [...prev.slice(1), { id, message, type }]
        : [...prev, { id, message, type }]
    );

    const timer = setTimeout(() => removeToast(id), 4000);
    timersRef.current.set(id, timer);
  }, [removeToast]);

  // Cancela timers pendentes ao desmontar — sem setState pós-unmount
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach(t => clearTimeout(t));
      timers.clear();
    };
  }, []);

  return { toasts, showToast, removeToast };
};
