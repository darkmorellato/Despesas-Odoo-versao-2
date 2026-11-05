import { describe, it, expect } from 'vitest';
import { filterExpenses, groupAndSortExpenses, totalsByStore, sumAmounts } from './expenseFilters';
import type { Expense } from '@/shared/types';

const mk = (id: string, over: Partial<Expense> = {}): Expense => ({
  id, date: '2026-08-20', description: 'Item', category: 'Despesa',
  store: 'Realme', amount: 10, quantity: 1, employeeName: 'Dark', ...over,
});

const data: Expense[] = [
  mk('1', { date: '2026-08-20', description: 'Salário Maria', category: 'Salário', store: 'Premium', amount: 1000 }),
  mk('2', { date: '2026-08-21', description: 'Internet', store: 'Dom Pedro II', amount: 100, notes: 'Fibra ótica' }),
  mk('3', { date: '2026-07-05', description: 'Aluguel', store: 'Realme', amount: 500 }),
  mk('4', { date: '2026-08-20', description: 'Energia', store: 'Realme', amount: 200, employeeName: 'João' }),
];
const crit = (o = {}) => ({ searchTerm: '', filterMode: 'day' as const, selectedDate: '', selectedMonth: '', ...o });

describe('filterExpenses', () => {
  it('filtra por dia', () => {
    expect(filterExpenses(data, crit({ selectedDate: '2026-08-20' })).map(e => e.id)).toEqual(['1', '4']);
  });
  it('filtra por mês', () => {
    expect(filterExpenses(data, crit({ filterMode: 'month', selectedMonth: '2026-08' })).map(e => e.id)).toEqual(['1', '2', '4']);
  });
  it('sem dia/mês selecionado devolve tudo', () => {
    expect(filterExpenses(data, crit())).toHaveLength(4);
  });
  it('busca ignora acentos e maiúsculas ("salario" acha "Salário")', () => {
    expect(filterExpenses(data, crit({ searchTerm: 'SALARIO' })).map(e => e.id)).toEqual(['1']);
  });
  it('busca vale para todo o período, ignorando o filtro de dia', () => {
    const r = filterExpenses(data, crit({ searchTerm: 'aluguel', selectedDate: '2026-08-20' }));
    expect(r.map(e => e.id)).toEqual(['3']);
  });
  it('busca em loja, funcionário e observações', () => {
    expect(filterExpenses(data, crit({ searchTerm: 'dom pedro' })).map(e => e.id)).toEqual(['2']);
    expect(filterExpenses(data, crit({ searchTerm: 'joão' })).map(e => e.id)).toEqual(['4']);
    expect(filterExpenses(data, crit({ searchTerm: 'otica' })).map(e => e.id)).toEqual(['2']);
  });
  it('tolera documentos sem campos (descrição/categoria ausentes)', () => {
    const broken = [{ ...mk('9'), description: undefined, category: undefined } as unknown as Expense];
    expect(() => filterExpenses(broken, crit({ searchTerm: 'x' }))).not.toThrow();
  });
});

describe('groupAndSortExpenses', () => {
  it('agrupa por data, mais recente primeiro, com total do grupo', () => {
    const g = groupAndSortExpenses(data, 'date', 'amount', 'desc');
    expect(g.map(b => b.key)).toEqual(['2026-08-21', '2026-08-20', '2026-07-05']);
    expect(g[1].total).toBe(1200);
    expect(g[1].items.map(i => i.id)).toEqual(['1', '4']); // 1000, 200 (desc)
  });
  it('agrupa por loja na ordem de exibição (Dom Pedro, Realme, ..., Premium)', () => {
    const g = groupAndSortExpenses(data, 'store', 'amount', 'asc');
    expect(g.map(b => b.key)).toEqual(['Dom Pedro II', 'Realme', 'Premium']);
  });
  it('ordem crescente x decrescente', () => {
    const asc = groupAndSortExpenses(data, 'store', 'amount', 'asc').find(b => b.key === 'Realme')!;
    const desc = groupAndSortExpenses(data, 'store', 'amount', 'desc').find(b => b.key === 'Realme')!;
    expect(asc.items.map(i => i.amount)).toEqual([200, 500]);
    expect(desc.items.map(i => i.amount)).toEqual([500, 200]);
  });
  it('empate desempata pela descrição', () => {
    const tie = [mk('a', { description: 'Zeta', amount: 5 }), mk('b', { description: 'Alfa', amount: 5 })];
    const g = groupAndSortExpenses(tie, 'date', 'amount', 'asc');
    expect(g[0].items.map(i => i.id)).toEqual(['b', 'a']);
  });
  it('lista vazia → nenhum grupo', () => {
    expect(groupAndSortExpenses([], 'date', 'date', 'asc')).toEqual([]);
  });
});

describe('totais', () => {
  it('soma por loja e total geral', () => {
    expect(totalsByStore(data)).toEqual({ Premium: 1000, 'Dom Pedro II': 100, Realme: 700 });
    expect(sumAmounts(data)).toBe(1800);
  });
});
