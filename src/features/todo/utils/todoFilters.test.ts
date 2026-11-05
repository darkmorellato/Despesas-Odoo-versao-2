import { describe, it, expect } from 'vitest';
import type { TodoItem } from '../types';
import {
  countTodos, filterTodos, getDueBadge, getFilterHeaderText, getRepeatLabel, getTaskTitle,
  isMine, matchesSearch, splitMyDay,
} from './todoFilters';

const TODAY = '2026-11-05';
const ME = 'eu@miplace.com';
const t = (over: Partial<TodoItem> & { id: string }): TodoItem => ({
  title: over.id, completed: false, important: false, employeeName: 'Ana',
  userEmail: 'outro@miplace.com', createdAt: '2026-01-01T00:00:00.000Z', ...over,
});

const todos: TodoItem[] = [
  t({ id: 'atrasada', dueDate: '2026-11-03' }),
  t({ id: 'hoje', dueDate: TODAY, important: true, assignedTo: 'EU@miplace.com' }),
  t({ id: 'semData', notes: 'Ligar fornecedor' }),
  t({ id: 'futura', dueDate: '2026-11-08', dueTime: '10:30', assignedTo: 'maria@gmail.com', assignedToName: 'Maria' }),
  t({ id: 'feitaHoje', completed: true, dueDate: TODAY }),
  t({ id: 'feitaAntiga', completed: true, dueDate: '2026-10-25' }),
  t({ id: 'minha', dueDate: '2026-11-06', userEmail: ME }),
];
const ctx = { userEmail: ME, todayStr: TODAY };
const ids = (list: TodoItem[]) => list.map(x => x.id);

describe('filterTodos', () => {
  const f = (filter: Parameters<typeof filterTodos>[1]['filter'], searchTerm = '') =>
    ids(filterTodos(todos, { ...ctx, filter, searchTerm }));

  it('today: vence hoje, sem data ou atrasada — INCLUI concluídas (a tela as separa em seção)', () => {
    expect(f('today')).toEqual(['atrasada', 'hoje', 'semData', 'feitaHoje', 'feitaAntiga']);
  });
  it('important / planned / assigned / all / completed', () => {
    expect(f('important')).toEqual(['hoje']);
    expect(f('planned')).toEqual(['atrasada', 'hoje', 'futura', 'minha']);
    expect(f('assigned')).toEqual(['hoje', 'minha']);
    expect(f('all')).toEqual(['atrasada', 'hoje', 'semData', 'futura', 'minha']);
    expect(f('completed')).toEqual(['feitaHoje', 'feitaAntiga']);
  });
  it('a busca restringe a lista ativa', () => {
    expect(f('all', 'maria')).toEqual(['futura']);
    expect(f('completed', 'atrasada')).toEqual([]);
  });
});

describe('countTodos', () => {
  it('conta só pendentes (exceto concluídas), sem considerar a busca', () => {
    expect(countTodos(todos, ctx)).toEqual({ today: 3, important: 1, planned: 4, assigned: 2, all: 5, completed: 2 });
  });
  it('today: a CONTAGEM exclui concluídas mesmo que a LISTA as inclua', () => {
    const list = filterTodos(todos, { ...ctx, filter: 'today', searchTerm: '' });
    expect(list.length).toBe(5);
    expect(countTodos(todos, ctx).today).toBe(3);
  });
  it('lista vazia', () => {
    expect(countTodos([], ctx)).toEqual({ today: 0, important: 0, planned: 0, assigned: 0, all: 0, completed: 0 });
  });
});

describe('isMine', () => {
  it('compara e-mails sem diferenciar maiúsculas (responsável ou criador)', () => {
    expect(isMine(t({ id: 'a', assignedTo: 'EU@MIPLACE.com' }), ME)).toBe(true);
    expect(isMine(t({ id: 'b', userEmail: 'Eu@Miplace.com' }), ME)).toBe(true);
    expect(isMine(t({ id: 'c' }), ME)).toBe(false);
  });
  it('com e-mail vazio, tarefa sem responsável NÃO é "minha"', () => {
    expect(isMine(t({ id: 'd' }), '')).toBe(false);
    expect(isMine(t({ id: 'e', userEmail: '' }), '')).toBe(true); // criador vazio coincide (igual ao original)
  });
});

describe('matchesSearch', () => {
  it('título, anotações, responsável, nome e etapas', () => {
    expect(matchesSearch(t({ id: 'x', title: 'Pagar Aluguel' }), 'aluguel')).toBe(true);
    expect(matchesSearch(t({ id: 'x', notes: 'Fornecedor X' }), 'fornecedor')).toBe(true);
    expect(matchesSearch(t({ id: 'x', assignedTo: 'a@b.com' }), 'a@b')).toBe(true);
    expect(matchesSearch(t({ id: 'x', assignedToName: 'Maria' }), 'mar')).toBe(true);
    expect(matchesSearch(t({ id: 'x', steps: [{ id: 's', title: 'Ligar', completed: false }] }), 'ligar')).toBe(true);
    expect(matchesSearch(t({ id: 'x' }), 'inexistente')).toBe(false);
  });
});

describe('splitMyDay', () => {
  it('separa atrasadas, hoje/sem data e concluídas; conta as futuras de TODAS as tarefas', () => {
    const filtered = filterTodos(todos, { ...ctx, filter: 'today', searchTerm: '' });
    const s = splitMyDay(filtered, todos, TODAY);
    expect(ids(s.overdue)).toEqual(['atrasada']);
    expect(ids(s.today)).toEqual(['hoje', 'semData']);
    expect(ids(s.completed)).toEqual(['feitaHoje', 'feitaAntiga']);
    expect(s.upcomingCount).toBe(2); // futura + minha
  });
  it('a busca reduz as seções, mas não as futuras', () => {
    const filtered = filterTodos(todos, { ...ctx, filter: 'today', searchTerm: 'hoje' });
    const s = splitMyDay(filtered, todos, TODAY);
    expect(ids(s.today)).toEqual(['hoje']);
    expect(s.upcomingCount).toBe(2);
  });
});

describe('rótulos', () => {
  it('getRepeatLabel', () => {
    expect(getRepeatLabel('daily')).toBe('Diária');
    expect(getRepeatLabel('weekdays')).toBe('Dias Úteis (Seg-Sex)');
    expect(getRepeatLabel('weekly')).toBe('Semanal');
    expect(getRepeatLabel('monthly')).toBe('Mensal');
    expect(getRepeatLabel('none')).toBeNull();
    expect(getRepeatLabel(undefined)).toBeNull();
  });

  it('getTaskTitle: usa o título; documentos antigos usam outros campos', () => {
    expect(getTaskTitle(t({ id: 'a', title: 'Novo' }))).toBe('Novo');
    expect(getTaskTitle({ ...t({ id: 'b' }), title: '', description: 'Antigo' } as TodoItem)).toBe('Antigo');
    expect(getTaskTitle({ ...t({ id: 'c' }), title: '', nome: 'Só nome' } as TodoItem)).toBe('Só nome');
    expect(getTaskTitle({ ...t({ id: 'd' }), title: '' } as TodoItem)).toBe('');
    expect(getTaskTitle({ ...t({ id: 'e' }), title: '' } as TodoItem, 'Tarefa sem título')).toBe('Tarefa sem título');
  });

  it('getDueBadge', () => {
    expect(getDueBadge(t({ id: 'a' }), TODAY)).toBeNull();
    expect(getDueBadge(t({ id: 'b', dueDate: TODAY }), TODAY)).toEqual({ tone: 'today', label: 'Hoje' });
    expect(getDueBadge(t({ id: 'c', dueDate: TODAY, dueTime: '09:00' }), TODAY)?.label).toBe('Hoje @ 09:00');
    expect(getDueBadge(t({ id: 'd', dueDate: '2026-11-03' }), TODAY)).toEqual({ tone: 'overdue', label: 'Atrasada: 03/11/2026' });
    expect(getDueBadge(t({ id: 'e', dueDate: '2026-11-08', dueTime: '10:30' }), TODAY))
      .toEqual({ tone: 'upcoming', label: 'Agendada: 08/11/2026 @ 10:30' });
  });

  it('getFilterHeaderText: "Meu Dia" usa a data por extenso', () => {
    expect(getFilterHeaderText('today', 'quinta-feira, 5 de novembro')).toEqual({ title: 'Meu Dia', subtitle: 'quinta-feira, 5 de novembro' });
    expect(getFilterHeaderText('completed', 'x').title).toBe('Concluídas');
    expect(getFilterHeaderText('all', 'x').title).toBe('Todas as Tarefas');
  });
});
