import { formatDateBR } from '@/shared/utils/formatters';
import type { TodoFilter, TodoItem, TodoRepeat } from '../types';

/**
 * Regras puras do To-Do (filtros, contagens, seções de "Meu Dia", rótulos),
 * sem React — testáveis isoladamente. A tela usa SEMPRE estas funções, então a
 * lista e a contagem de cada filtro não podem divergir sem os testes avisarem.
 */

export interface TodoViewContext {
  /** E-mail de quem está usando (para o filtro "Atribuídas") */
  userEmail: string;
  /** Hoje, 'YYYY-MM-DD' */
  todayStr: string;
}

/**
 * Tarefa atribuída a mim ou criada por mim (e-mail sem diferenciar maiúsculas).
 * Sem responsável (`assignedTo` indefinido) nunca "bate" — nem com e-mail vazio.
 */
export const isMine = (task: TodoItem, userEmail: string): boolean => {
  const me = userEmail.toLowerCase();
  return task.assignedTo?.toLowerCase() === me || task.userEmail.toLowerCase() === me;
};

/** Vence hoje, não tem data ou está atrasada (futuras ficam em "Planejadas") */
const isDueByToday = (task: TodoItem, todayStr: string): boolean =>
  task.dueDate === todayStr || !task.dueDate || task.dueDate < todayStr;

/** Busca por título, anotações, responsável (e-mail ou nome) e título de etapas */
export const matchesSearch = (task: TodoItem, term: string): boolean => {
  const q = term.toLowerCase();
  return (
    task.title.toLowerCase().includes(q) ||
    (!!task.notes && task.notes.toLowerCase().includes(q)) ||
    (!!task.assignedTo && task.assignedTo.toLowerCase().includes(q)) ||
    (!!task.assignedToName && task.assignedToName.toLowerCase().includes(q)) ||
    !!task.steps?.some(s => s.title.toLowerCase().includes(q))
  );
};

/**
 * Lista exibida para o filtro ativo.
 *
 * Atenção (comportamento histórico preservado): em 'today' a LISTA inclui as
 * concluídas (a tela as separa em uma seção própria), enquanto a CONTAGEM de
 * 'today' (countTodos) só considera as pendentes.
 */
export const filterTodos = (
  todos: TodoItem[],
  { filter, searchTerm, userEmail, todayStr }: TodoViewContext & { filter: TodoFilter; searchTerm: string }
): TodoItem[] => {
  const base = searchTerm ? todos.filter(t => matchesSearch(t, searchTerm)) : todos;

  switch (filter) {
    case 'today':
      return base.filter(t => isDueByToday(t, todayStr));
    case 'important':
      return base.filter(t => !t.completed && t.important);
    case 'planned':
      return base.filter(t => !t.completed && !!t.dueDate);
    case 'assigned':
      return base.filter(t => !t.completed && isMine(t, userEmail));
    case 'completed':
      return base.filter(t => t.completed);
    case 'all':
    default:
      return base.filter(t => !t.completed);
  }
};

/** Contagem exibida em cada lista da barra lateral (sem considerar a busca) */
export const countTodos = (todos: TodoItem[], { userEmail, todayStr }: TodoViewContext): Record<TodoFilter, number> => {
  const pending = todos.filter(t => !t.completed);
  return {
    today: pending.filter(t => isDueByToday(t, todayStr)).length,
    important: pending.filter(t => t.important).length,
    planned: pending.filter(t => !!t.dueDate).length,
    assigned: pending.filter(t => isMine(t, userEmail)).length,
    all: pending.length,
    completed: todos.length - pending.length,
  };
};

export interface MyDaySections {
  overdue: TodoItem[];
  today: TodoItem[];
  completed: TodoItem[];
  /** Pendentes agendadas para datas futuras (todas, sem considerar a busca) */
  upcomingCount: number;
}

/** Divide a lista de "Meu Dia" em atrasadas, de hoje/sem data e concluídas */
export const splitMyDay = (filtered: TodoItem[], allTodos: TodoItem[], todayStr: string): MyDaySections => ({
  overdue: filtered.filter(t => !t.completed && !!t.dueDate && t.dueDate < todayStr),
  today: filtered.filter(t => !t.completed && (t.dueDate === todayStr || !t.dueDate)),
  completed: filtered.filter(t => t.completed),
  upcomingCount: allTodos.filter(t => !t.completed && !!t.dueDate && t.dueDate > todayStr).length,
});

/** Rótulo da repetição (null = não repete) */
export const getRepeatLabel = (repeat?: TodoRepeat): string | null => {
  switch (repeat) {
    case 'daily': return 'Diária';
    case 'weekdays': return 'Dias Úteis (Seg-Sex)';
    case 'weekly': return 'Semanal';
    case 'monthly': return 'Mensal';
    default: return null;
  }
};

/**
 * Título da tarefa. Documentos antigos guardavam o texto em outros campos
 * (description, text, name, nome) — o fallback evita cartão sem título.
 */
export const getTaskTitle = (task: TodoItem, fallback = ''): string => {
  const legacy = task as unknown as Record<string, unknown>;
  const pick = [task.title, legacy.description, legacy.text, legacy.name, legacy.nome].find(
    v => typeof v === 'string' && v
  ) as string | undefined;
  return pick ?? fallback;
};

export interface DueBadge {
  tone: 'today' | 'overdue' | 'upcoming';
  label: string;
}

/** Selo de vencimento do cartão: "Hoje", "Atrasada: …" ou "Agendada: …" (+ horário) */
export const getDueBadge = (task: TodoItem, todayStr: string): DueBadge | null => {
  if (!task.dueDate) return null;
  const time = task.dueTime ? ` @ ${task.dueTime}` : '';
  if (task.dueDate === todayStr) return { tone: 'today', label: `Hoje${time}` };
  if (task.dueDate < todayStr) return { tone: 'overdue', label: `Atrasada: ${formatDateBR(task.dueDate)}${time}` };
  return { tone: 'upcoming', label: `Agendada: ${formatDateBR(task.dueDate)}${time}` };
};

/** Título e subtítulo do cabeçalho de cada lista ('today' usa a data por extenso) */
export const getFilterHeaderText = (
  filter: TodoFilter,
  todayFormatted: string
): { title: string; subtitle: string } => {
  switch (filter) {
    case 'today': return { title: 'Meu Dia', subtitle: todayFormatted };
    case 'important': return { title: 'Importantes', subtitle: 'Tarefas de alta prioridade' };
    case 'planned': return { title: 'Planejadas', subtitle: 'Tarefas com data de vencimento agendada' };
    case 'assigned': return { title: 'Atribuídas / Gmail', subtitle: 'Tarefas vinculadas a contas de e-mail reais do Gmail' };
    case 'completed': return { title: 'Concluídas', subtitle: 'Histórico de tarefas finalizadas' };
    case 'all':
    default: return { title: 'Todas as Tarefas', subtitle: 'Visão geral de todas as tarefas ativas' };
  }
};
