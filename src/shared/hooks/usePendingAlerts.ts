import { useState, useEffect, useRef } from 'react';
import { getTodayLocal } from '@/shared/utils/formatters';
import { playCalendarAlertSound, playTodoAlertSound } from '@/shared/utils/audio';
import type { FixedNotification } from '@/shared/types';

const APP_TITLE = 'Relatório de Despesas Miplace';
const pendingKeyOf = (p: { day?: number; description?: string }) => `${p.day}§${p.description}`;

interface UsePendingAlertsParams {
  /** Alertas só funcionam com sessão ativa */
  enabled: boolean;
  /** Mudam quando os dados chegam/são pagos → força o recálculo */
  checks: unknown;
  fixedPayments: FixedNotification[];
  getPendingPayments: (payments: FixedNotification[]) => FixedNotification[];
  todos: Array<{ completed: boolean; dueDate?: string | undefined }>;
}

/**
 * Alertas periódicos:
 *  - Contas pendentes do calendário (a cada 15 min, com som) + aviso na aba;
 *  - Tarefas do To-Do vencidas (a cada 30 min, intercalado aos 5 min).
 */
export const usePendingAlerts = ({
  enabled,
  checks,
  fixedPayments,
  getPendingPayments,
  todos,
}: UsePendingAlertsParams) => {
  const [showReminder, setShowReminder] = useState(false);
  const [pendingItems, setPendingItems] = useState<FixedNotification[]>([]);

  // O efeito depende de `checks` e `fixedPayments` para RECALCULAR quando os
  // dados chegam do Firestore ou quando o usuário paga uma conta — antes ele
  // só rodava a cada 15min e o alerta podia exibir um snapshot obsoleto
  // (ex.: "45 pendentes" calculado antes do sync, com tudo já em dia).
  // A lista de chaves anteriores garante que:
  //   - fechar o alerta não é desfeito por recálculos (sem mudança → nada);
  //   - pagar contas (remoções) NÃO reabre nem bipa de novo;
  //   - uma NOVA pendência (adição) reabre e bipa.
  const prevPendingKeysRef = useRef<string[]>([]);
  const pendingFirstRunRef = useRef(true);

  useEffect(() => {
    if (!enabled) return;

    const checkPending = () => {
      const pending = getPendingPayments(fixedPayments);
      const keys = pending.map(pendingKeyOf);

      if (pending.length === 0) {
        // Tudo em dia → esconde e reseta o histórico (nova pendência futura reabre)
        prevPendingKeysRef.current = [];
        setPendingItems([]);
        setShowReminder(false);
        return;
      }

      const prevKeys = prevPendingKeysRef.current;
      const changed = keys.join('||') !== prevKeys.join('||');
      if (!changed) return; // mesmo conteúdo → não re-render, não reabre, não bipa

      const prevSet = new Set(prevKeys);
      const hasNew = keys.some(k => !prevSet.has(k)); // adição real (nova pendência)
      prevPendingKeysRef.current = keys;
      setPendingItems(pending); // sempre atualizado (remove as pagas)

      if (hasNew) {
        setShowReminder(true);
        playCalendarAlertSound();
      }
    };

    // 1ª execução com delay curto (evita som logo no boot); recálculos
    // disparados por mudança de dados rodam imediatamente.
    const delay = pendingFirstRunRef.current ? 2000 : 0;
    pendingFirstRunRef.current = false;
    const timer = setTimeout(checkPending, delay);
    const interval = setInterval(checkPending, 15 * 60 * 1000);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [enabled, checks, fixedPayments, getPendingPayments]);

  // Tarefas pendentes (To-Do): a cada 30 minutos, começando aos 5
  const todosRef = useRef(todos);
  useEffect(() => { todosRef.current = todos; }, [todos]);

  useEffect(() => {
    if (!enabled) return;

    const checkPendingTodos = () => {
      const todayStr = getTodayLocal();
      // Somente tarefas COM data (hoje ou atrasadas) disparam o alerta —
      // tarefas sem dueDate bipariam para sempre.
      const pending = todosRef.current.filter(
        t => !t.completed && t.dueDate && t.dueDate <= todayStr
      );
      if (pending.length > 0) playTodoAlertSound();
    };

    // 5 minutos de offset para nunca coincidir com o alerta do calendário
    let interval: ReturnType<typeof setInterval> | undefined;
    const initialOffsetTimer = setTimeout(() => {
      checkPendingTodos();
      interval = setInterval(checkPendingTodos, 30 * 60 * 1000);
    }, 5 * 60 * 1000);

    return () => {
      clearTimeout(initialOffsetTimer);
      if (interval) clearInterval(interval);
    };
  }, [enabled]);

  // Título da aba piscando enquanto há pendências visíveis
  useEffect(() => {
    if (!enabled) return;
    let titleInterval: ReturnType<typeof setInterval> | undefined;
    if (showReminder && pendingItems.length > 0) {
      let isAlert = true;
      titleInterval = setInterval(() => {
        document.title = isAlert ? `(${pendingItems.length}) 🔴 PAGAR AGORA!` : '🔔 Atenção - Despesas';
        isAlert = !isAlert;
      }, 1000);
    } else {
      document.title = APP_TITLE;
    }

    return () => {
      clearInterval(titleInterval);
      document.title = APP_TITLE;
    };
  }, [showReminder, pendingItems.length, enabled]);

  return { showReminder, setShowReminder, pendingItems };
};
