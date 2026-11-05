import { describe, it, expect } from 'vitest';
import type { FixedNotification } from '@/shared/types';
import type { TodoItem } from '@/features/todo/types';
import {
  filterTodosByDay, getDayColorStyles, getDueDateBadgeColor, getFilterButtonClass, getFilteredPayments,
  getMonthGrid, getMonthTodos, getPendingPayments, getUniqueFixedDays, getZoomStyles, groupPaymentsByDay,
  groupTodosByDate, isPaymentChecked, makeCheckKey, toDateKey, MONTH_NAMES, WEEKDAY_LABELS,
} from './calendarView';

const payments: FixedNotification[] = [
  { id: 'a', day: 5, description: 'Aluguel' },
  { id: 'b', day: 10, description: 'Internet' },
  { id: 'c', day: 10, description: ' internet ' }, // duplicado
  { id: 'd', day: 15, description: 'Seguro', months: [1, 2] },
  { id: 'e', day: 20, description: 'Energia Loja Kassouf' }, // alias → "Energia Kassouf"
];
const t = (id: string, dueDate?: string): TodoItem => ({
  id, title: id, completed: false, important: false, employeeName: 'x', userEmail: 'x', createdAt: '', dueDate,
});

describe('grade do mês', () => {
  it('novembro/2026: 30 dias, começa no domingo (índice 10)', () => {
    expect(getMonthGrid(2026, 10)).toEqual({ daysInMonth: 30, firstDay: 0 });
  });
  it('fevereiro bissexto e comum', () => {
    expect(getMonthGrid(2028, 1).daysInMonth).toBe(29);
    expect(getMonthGrid(2027, 1).daysInMonth).toBe(28);
  });
  it('constantes de rótulos', () => {
    expect(MONTH_NAMES).toHaveLength(12);
    expect(MONTH_NAMES[10]).toBe('Novembro');
    expect(WEEKDAY_LABELS).toEqual(['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']);
  });
  it('toDateKey usa mês 0–11 e completa com zeros', () => {
    expect(toDateKey(2026, 10, 5)).toBe('2026-11-05');
    expect(toDateKey(2026, 0, 31)).toBe('2026-01-31');
  });
});

describe('chaves de pagamento', () => {
  it('makeCheckKey usa o índice 0–11 do mês (sem somar 1)', () => {
    expect(makeCheckKey(2026, 10, 'Aluguel')).toBe('2026-10-Aluguel');
  });

  it('chave normalizada vale; a crua é fallback legado', () => {
    expect(isPaymentChecked({ '2026-10-Aluguel': true }, 2026, 10, 'Aluguel')).toBe(true);
    expect(isPaymentChecked({}, 2026, 10, 'Aluguel')).toBe(false);
    // alias: só a crua marcada → pago
    expect(isPaymentChecked({ '2026-10-Energia Loja Kassouf': true }, 2026, 10, 'Energia Loja Kassouf')).toBe(true);
    // normalizada = false vence a crua = true (false não é nulo)
    expect(isPaymentChecked(
      { '2026-10-Energia Kassouf': false, '2026-10-Energia Loja Kassouf': true }, 2026, 10, 'Energia Loja Kassouf'
    )).toBe(false);
    // outro mês não vaza
    expect(isPaymentChecked({ '2026-9-Aluguel': true }, 2026, 10, 'Aluguel')).toBe(false);
  });
});

describe('pagamentos', () => {
  it('groupPaymentsByDay respeita "months" e NÃO remove duplicados', () => {
    const nov = groupPaymentsByDay(payments, 10);
    expect(Object.keys(nov).map(Number).sort((a, b) => a - b)).toEqual([5, 10, 20]);
    expect(nov[10]).toHaveLength(2);
    expect(groupPaymentsByDay(payments, 0)[15]).toHaveLength(1); // janeiro (months inclui 1)
  });

  it('getFilteredPayments: mês, dia e deduplicação', () => {
    expect(getFilteredPayments(payments, 10, null).map(p => p.id)).toEqual(['a', 'b', 'e']);
    expect(getFilteredPayments(payments, 10, 10).map(p => p.id)).toEqual(['b']);
    expect(getFilteredPayments(payments, 0, null).map(p => p.id)).toEqual(['a', 'b', 'd', 'e']);
    expect(getFilteredPayments(payments, 10, 99)).toEqual([]);
  });

  it('getPendingPayments exclui os pagos (incluindo por chave legada)', () => {
    const filtered = getFilteredPayments(payments, 10, null);
    const pending = getPendingPayments(filtered, { '2026-10-Aluguel': true, '2026-10-Energia Loja Kassouf': true }, 2026, 10);
    expect(pending.map(p => p.id)).toEqual(['b']);
  });

  it('getUniqueFixedDays usa TODOS os pagamentos, ordenados', () => {
    expect(getUniqueFixedDays(payments)).toEqual([5, 10, 15, 20]);
  });
});

describe('tarefas do mês', () => {
  const todos = [t('1', '2026-11-12'), t('2', '2026-11-12'), t('3', '2026-12-01'), t('4'), t('5', '2026-11-30')];

  it('getMonthTodos filtra pelo prefixo ano-mês e ignora sem data', () => {
    expect(getMonthTodos(todos, 2026, 10).map(x => x.id)).toEqual(['1', '2', '5']);
    expect(getMonthTodos(todos, 2026, 11).map(x => x.id)).toEqual(['3']);
  });
  it('filterTodosByDay', () => {
    const month = getMonthTodos(todos, 2026, 10);
    expect(filterTodosByDay(month, 2026, 10, null)).toHaveLength(3);
    expect(filterTodosByDay(month, 2026, 10, 12).map(x => x.id)).toEqual(['1', '2']);
    expect(filterTodosByDay(month, 2026, 10, 1)).toEqual([]);
  });
  it('groupTodosByDate agrupa por data', () => {
    const g = groupTodosByDate(getMonthTodos(todos, 2026, 10));
    expect(Object.keys(g)).toEqual(['2026-11-12', '2026-11-30']);
    expect(g['2026-11-12']).toHaveLength(2);
  });
});

describe('estilos', () => {
  it('zoom', () => {
    expect(getZoomStyles(0).height).toBe('h-16');
    expect(getZoomStyles(1).height).toBe('h-28 md:h-36');
    expect(getZoomStyles(2).height).toBe('h-40');
    expect(getZoomStyles(7).height).toBe('h-28 md:h-36'); // fora do intervalo = padrão
  });
  it('destaque dos dias de vencimento comuns', () => {
    [5, 10, 15, 20, 25, 27, 29].forEach(d => expect(getDayColorStyles(d)).toContain('bg-amber-50/40'));
    expect(getDayColorStyles(7)).toContain('bg-white');
  });
  it('selo do vencimento: cinza se pago, cor por dia', () => {
    expect(getDueDateBadgeColor(5, true)).toBe('bg-slate-100 text-slate-400 border-slate-200');
    expect(getDueDateBadgeColor(5, false)).toContain('purple');
    expect(getDueDateBadgeColor(10, false)).toContain('amber');
    expect(getDueDateBadgeColor(15, false)).toContain('cyan');
    expect(getDueDateBadgeColor(3, false)).toBe('bg-slate-100 text-slate-700 border-slate-200');
  });
  it('botão de filtro por dia', () => {
    expect(getFilterButtonClass(true)).toContain('from-amber-400');
    expect(getFilterButtonClass(false)).toContain('bg-white');
  });
});
