import type { FixedNotification } from '@/shared/types';
import type { TodoItem } from '@/features/todo/types';
import { normalizeTaskDescription } from '../hooks/useCalendar';

/**
 * Regras puras do calendário (grade, filtros, chaves de pagamento, estilos),
 * sem React — testáveis isoladamente. `month` é SEMPRE o índice 0–11 do
 * JavaScript (novembro = 10), igual às chaves de check (`ano-mês-descrição`).
 */

export const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
] as const;

export const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] as const;

const pad = (n: number): string => String(n).padStart(2, '0');

/** Dias do mês e dia da semana do dia 1 (0 = domingo) */
export const getMonthGrid = (year: number, month: number) => ({
  daysInMonth: new Date(year, month + 1, 0).getDate(),
  firstDay: new Date(year, month, 1).getDay(),
});

/** 'YYYY-MM-DD' de um dia do mês exibido */
export const toDateKey = (year: number, month: number, day: number): string =>
  `${year}-${pad(month + 1)}-${pad(day)}`;

/** Chave de check "crua": ano-mês(0–11)-descrição */
export const makeCheckKey = (year: number, month: number, description: string): string =>
  `${year}-${month}-${description}`;

/**
 * Pagamento marcado como pago? A chave normalizada (descrição canônica) tem
 * precedência; a chave "crua" (legada) entra como fallback — dados antigos.
 */
export const isPaymentChecked = (
  checkedState: Record<string, boolean>,
  year: number,
  month: number,
  description: string
): boolean => {
  const rawKey = makeCheckKey(year, month, description);
  const normKey = makeCheckKey(year, month, normalizeTaskDescription(description));
  return !!(checkedState[normKey] ?? checkedState[rawKey]);
};

/** Pagamentos que valem para o mês (sem `months` = todos os meses) */
const paymentsOfMonth = (payments: FixedNotification[], month: number): FixedNotification[] =>
  payments.filter(n => !n.months || n.months.includes(month + 1));

/** Pagamentos do mês agrupados por dia do vencimento */
export const groupPaymentsByDay = (payments: FixedNotification[], month: number): Record<number, FixedNotification[]> => {
  const map: Record<number, FixedNotification[]> = {};
  paymentsOfMonth(payments, month).forEach(n => {
    if (!map[n.day]) map[n.day] = [];
    map[n.day].push(n);
  });
  return map;
};

/** Tarefas com vencimento dentro do mês/ano exibido */
export const getMonthTodos = (todos: TodoItem[], year: number, month: number): TodoItem[] => {
  const prefix = `${year}-${pad(month + 1)}`;
  return todos.filter(t => t.dueDate && t.dueDate.startsWith(prefix));
};

/** Tarefas do mês restritas a um dia (null = o mês todo) */
export const filterTodosByDay = (monthTodos: TodoItem[], year: number, month: number, day: number | null): TodoItem[] =>
  day === null ? monthTodos : monthTodos.filter(t => t.dueDate === toDateKey(year, month, day));

/** Tarefas agrupadas por 'YYYY-MM-DD' */
export const groupTodosByDate = (monthTodos: TodoItem[]): Record<string, TodoItem[]> => {
  const map: Record<string, TodoItem[]> = {};
  monthTodos.forEach(t => {
    if (!t.dueDate) return;
    if (!map[t.dueDate]) map[t.dueDate] = [];
    map[t.dueDate].push(t);
  });
  return map;
};

/** Dias de vencimento existentes (de TODOS os pagamentos), em ordem crescente */
export const getUniqueFixedDays = (payments: FixedNotification[]): number[] =>
  [...new Set(payments.map(n => n.day))].sort((a, b) => a - b);

/**
 * Pagamentos exibidos: do mês, do dia filtrado (se houver) e SEM duplicados
 * (mesmo dia + descrição, sem diferenciar maiúsculas nem espaços nas pontas).
 */
export const getFilteredPayments = (
  payments: FixedNotification[],
  month: number,
  dayFilter: number | null
): FixedNotification[] => {
  const list = paymentsOfMonth(payments, month).filter(item => dayFilter === null || item.day === dayFilter);
  const seen = new Set<string>();
  return list.filter(item => {
    const key = `${item.day}|${item.description.trim().toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

/** Dos pagamentos exibidos, os que ainda não foram pagos */
export const getPendingPayments = (
  filtered: FixedNotification[],
  checkedState: Record<string, boolean>,
  year: number,
  month: number
): FixedNotification[] => filtered.filter(item => !isPaymentChecked(checkedState, year, month, item.description));

/** Tamanho das células da grade conforme o zoom (0 = compacto, 1 = padrão, 2 = ampliado) */
export const getZoomStyles = (zoomLevel: number): { height: string; textSize: string; padding: string } => {
  switch (zoomLevel) {
    case 0: return { height: 'h-16', textSize: 'text-[9px]', padding: 'p-1.5' };
    case 2: return { height: 'h-40', textSize: 'text-sm', padding: 'p-3' };
    default: return { height: 'h-28 md:h-36', textSize: 'text-[11px]', padding: 'p-2' };
  }
};

/** Dias de vencimento mais comuns ganham destaque na grade */
export const getDayColorStyles = (day: number): string => {
  switch (day) {
    case 5:
    case 10:
    case 15:
    case 20:
    case 25:
    case 27:
    case 29:
      return 'bg-amber-50/40 border-amber-200 hover:border-amber-400';
    default:
      return 'bg-white border-slate-200/90 hover:border-slate-300 hover:bg-slate-50/50';
  }
};

/** Cor do selo "Dia N" do pagamento (cinza se já pago) */
export const getDueDateBadgeColor = (day: number, isChecked: boolean): string => {
  if (isChecked) return 'bg-slate-100 text-slate-400 border-slate-200';
  switch (day) {
    case 5: return 'bg-purple-50 text-purple-700 border-purple-200';
    case 10: return 'bg-amber-50 text-amber-700 border-amber-200';
    case 15: return 'bg-cyan-50 text-cyan-700 border-cyan-200';
    case 20: return 'bg-purple-50 text-purple-700 border-purple-200';
    case 25: return 'bg-amber-50 text-amber-700 border-amber-200';
    case 27: return 'bg-cyan-50 text-cyan-700 border-cyan-200';
    case 29: return 'bg-purple-50 text-purple-700 border-purple-200';
    default: return 'bg-slate-100 text-slate-700 border-slate-200';
  }
};

/** Classes do botão de filtro por dia */
export const getFilterButtonClass = (isSelected: boolean): string => {
  const baseClass = 'px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1 cursor-pointer';
  if (!isSelected) return `${baseClass} bg-white text-slate-600 border border-slate-200 hover:text-slate-900 hover:bg-slate-50 shadow-xs`;
  return `${baseClass} bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-bold border border-amber-500 shadow-sm`;
};
