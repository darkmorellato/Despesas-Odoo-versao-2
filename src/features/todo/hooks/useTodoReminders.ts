import { useState, useEffect } from 'react';
import type { TodoItem } from '../types';
import { playTodoAlertSound } from '@/shared/utils/audio';
import { showNativeNotification, requestNotificationPermission } from '@/shared/utils/notifications';
import { getTodayLocal } from '@/shared/utils/formatters';
import {
  buildReminderNotification,
  formatCurrentTime,
  isReminderDue,
  loadNotifiedForToday,
  saveNotifiedForToday,
} from '../utils/todoReminders';

/**
 * Lembretes das tarefas com horário: toca o alerta e mostra a notificação nativa
 * UMA vez por tarefa por dia (os já notificados ficam salvos), verificando a
 * cada 15 segundos. Também pede a permissão de notificação no primeiro gesto.
 */
export const useTodoReminders = (todos: TodoItem[], enabled: boolean): void => {
  const [notifiedTasks, setNotifiedTasks] = useState<Set<string>>(() => loadNotifiedForToday().ids);

  // Permissão de notificação só pode ser pedida dentro de um GESTO do usuário
  // (regra dos navegadores — no carregamento o navegador bloqueia e ignora).
  // Pedimos no primeiro clique/toque da sessão; se já concedida, é no-op.
  useEffect(() => {
    if (!enabled) return;
    const requestOnGesture = () => {
      requestNotificationPermission().catch(() => {});
    };
    document.addEventListener('pointerdown', requestOnGesture, { once: true, passive: true });
    return () => document.removeEventListener('pointerdown', requestOnGesture);
  }, [enabled]);

  // Monitora horários de vencimento/lembrete e dispara Bip sonoro + Notificação nativa
  useEffect(() => {
    if (!enabled) return;

    const checkReminders = () => {
      const now = new Date();
      const todayStr = getTodayLocal();
      const currentTimeStr = formatCurrentTime(now);

      todos.forEach((task) => {
        if (isReminderDue(task, todayStr, currentTimeStr) && !notifiedTasks.has(task.id)) {
          playTodoAlertSound();
          const { title, body } = buildReminderNotification(task, currentTimeStr);
          showNativeNotification(title, { body });
          setNotifiedTasks((prev) => {
            const next = new Set(prev).add(task.id);
            saveNotifiedForToday(todayStr, next);
            return next;
          });
        }
      });
    };

    const interval = setInterval(checkReminders, 15000);
    checkReminders();
    return () => clearInterval(interval);
  }, [todos, notifiedTasks, enabled]);
};
