import { getTodayLocal } from '@/shared/utils/formatters';
import type { TodoItem } from '../types';

/**
 * Regras e armazenamento dos lembretes sonoros das tarefas, sem React.
 */

const NOTIFIED_KEY = 'miplace_todo_notified';

/** Hora atual no formato 'HH:MM' (o mesmo do campo dueTime) */
export const formatCurrentTime = (now: Date): string =>
  `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

/** Lembrete devido agora: pendente, vence hoje e na hora exata (minuto) */
export const isReminderDue = (task: TodoItem, todayStr: string, currentTimeStr: string): boolean =>
  !task.completed && task.dueDate === todayStr && task.dueTime === currentTimeStr;

/** Título e corpo da notificação nativa */
export const buildReminderNotification = (task: TodoItem, currentTimeStr: string): { title: string; body: string } => ({
  title: `🔔 Lembrete To-Do: ${task.title}`,
  body: task.notes || (task.assignedTo ? `Atribuído a: ${task.assignedToName || task.assignedTo}` : `Horário agendado: ${currentTimeStr}`),
});

/** Carrega o Set de tarefas já notificadas (apenas as do dia salvo). */
export const loadNotifiedForToday = (): { day: string; ids: Set<string> } => {
  const today = getTodayLocal();
  try {
    const raw = localStorage.getItem(NOTIFIED_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.day === today && Array.isArray(parsed.ids)) {
        return { day: today, ids: new Set(parsed.ids) };
      }
    }
  } catch {
    // cache inválido, começa do zero
  }
  return { day: today, ids: new Set<string>() };
};

export const saveNotifiedForToday = (day: string, ids: Set<string>): void => {
  try {
    localStorage.setItem(NOTIFIED_KEY, JSON.stringify({ day, ids: Array.from(ids) }));
  } catch {
    // ignora falha de persistência
  }
};
