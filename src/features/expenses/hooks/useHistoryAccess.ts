import { useState, useEffect, useCallback } from 'react';
import type { Expense } from '@/shared/types';

interface UseHistoryAccessParams {
  /** A tela atual precisa do histórico completo (análises, fechamento, busca...) */
  needed: boolean;
  isFullHistory: boolean;
  loadFullHistory: () => Promise<Expense[]>;
}

/**
 * Pede o histórico completo quando alguma parte da tela precisa dele e informa
 * se o pedido falhou (ex.: sem conexão), com opção de tentar de novo.
 * Não repete sozinho em caso de falha — evita laço de tentativas.
 */
export const useHistoryAccess = ({ needed, isFullHistory, loadFullHistory }: UseHistoryAccessParams) => {
  const [failed, setFailed] = useState(false);

  const request = useCallback(() => {
    setFailed(false);
    loadFullHistory().catch(() => setFailed(true));
  }, [loadFullHistory]);

  useEffect(() => {
    if (needed && !isFullHistory) request();
  }, [needed, isFullHistory, request]);

  // Quando o histórico chega, qualquer falha anterior deixa de valer
  useEffect(() => {
    if (isFullHistory) setFailed(false);
  }, [isFullHistory]);

  return { historyFailed: failed, retryHistory: request };
};
