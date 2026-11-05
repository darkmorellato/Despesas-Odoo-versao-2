import type { TodoItem, TodoRepeat } from '../types';

/**
 * Regras puras de recorrência das tarefas, sem React.
 */

/**
 * Próxima data de uma tarefa recorrente ('YYYY-MM-DD').
 * - diária: +1 dia; dias úteis: próximo dia de segunda a sexta; semanal: +7 dias;
 * - mensal: mesmo dia do mês seguinte, limitado ao último dia (31/01 → 28 ou 29/02).
 * Sem data (ou data inválida) parte de hoje; sem repetição devolve a própria data.
 */
export const getNextRecurrenceDate = (currentDateStr?: string, repeat?: TodoRepeat): string => {
  let baseDate = new Date();
  if (currentDateStr) {
    const parts = currentDateStr.split('-');
    if (parts.length === 3) {
      baseDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    }
  }

  if (repeat === 'daily') {
    baseDate.setDate(baseDate.getDate() + 1);
  } else if (repeat === 'weekdays') {
    do {
      baseDate.setDate(baseDate.getDate() + 1);
    } while (baseDate.getDay() === 0 || baseDate.getDay() === 6);
  } else if (repeat === 'weekly') {
    baseDate.setDate(baseDate.getDate() + 7);
  } else if (repeat === 'monthly') {
    const targetDay = baseDate.getDate();
    baseDate.setMonth(baseDate.getMonth() + 1, 1);
    const daysInNextMonth = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0).getDate();
    baseDate.setDate(Math.min(targetDay, daysInNextMonth));
  }

  const year = baseDate.getFullYear();
  const month = String(baseDate.getMonth() + 1).padStart(2, '0');
  const day = String(baseDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const ownerOf = (task: TodoItem): string => (task.userEmail || task.assignedTo || '').trim().toLowerCase();

/**
 * A próxima ocorrência já existe? Mesmo título (sem diferenciar caixa nem
 * espaços), mesma data e mesmo dono (criador ou, na falta, responsável).
 */
export const hasNextOccurrence = (todos: TodoItem[], target: TodoItem, nextDueDate: string): boolean => {
  const ownerKey = ownerOf(target);
  return todos.some(t =>
    t.title.trim().toLowerCase() === target.title.trim().toLowerCase() &&
    t.dueDate === nextDueDate &&
    ownerOf(t) === ownerKey
  );
};
