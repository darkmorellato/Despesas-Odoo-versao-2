/**
 * Testes de caracterização do useTodo: fixam o comportamento observável
 * (escuta do Firestore, cache, lembretes, CRUD otimista com desfazer,
 * recorrência) para a refatoração não mudar nada sem perceber.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { TodoItem } from '../types';
import { useTodo, getNextRecurrenceDate, deduplicateTodos } from './useTodo';
import { addTodoDoc, updateTodoDoc, deleteTodoDoc, saveCachedTodos, getCachedTodos } from '../services/todoService';
import { playTodoAlertSound, playSynthesizedBeep } from '@/shared/utils/audio';
import { showNativeNotification, requestNotificationPermission } from '@/shared/utils/notifications';
import { onSnapshot } from 'firebase/firestore';

const authState = vi.hoisted(() => ({
  currentUser: null as { isAnonymous: boolean } | null,
  callbacks: [] as Array<(u: { isAnonymous: boolean } | null) => void>,
}));

vi.mock('@/config/firebase', () => ({
  db: {},
  auth: authState,
  onAuthStateChanged: vi.fn((_auth: unknown, cb: (u: { isAnonymous: boolean } | null) => void) => {
    authState.callbacks.push(cb);
    return () => { authState.callbacks = authState.callbacks.filter(c => c !== cb); };
  }),
}));
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(), doc: vi.fn(), query: vi.fn(), orderBy: vi.fn(), limit: vi.fn(), onSnapshot: vi.fn(),
}));
vi.mock('../services/todoService', () => ({
  getCachedTodos: vi.fn(() => []),
  saveCachedTodos: vi.fn(),
  addTodoDoc: vi.fn().mockResolvedValue('new-id'),
  updateTodoDoc: vi.fn().mockResolvedValue(undefined),
  deleteTodoDoc: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/shared/utils/audio', () => ({ playTodoAlertSound: vi.fn(), playSynthesizedBeep: vi.fn() }));
vi.mock('@/shared/utils/notifications', () => ({
  showNativeNotification: vi.fn(),
  requestNotificationPermission: vi.fn().mockResolvedValue(true),
}));

// 15/11/2026 14:30 (domingo)
const NOW = new Date(2026, 10, 15, 14, 30, 0);
const TODAY = '2026-11-15';

const T = (o: Partial<TodoItem> & { id: string }): TodoItem => ({
  title: o.id, completed: false, important: false, employeeName: 'Ana', userEmail: 'ana@x.com',
  createdAt: '2026-11-01T00:00:00.000Z', ...o,
});

interface Snap { forEach: (fn: (d: { id: string; data: () => Record<string, unknown> }) => void) => void }
let snapNext: ((s: Snap) => void) | null = null;
let snapError: ((e: Error) => void) | null = null;
const unsub = vi.fn();
const snapshot = (docs: Array<{ id: string; data: Record<string, unknown> }>): Snap => ({
  forEach: fn => docs.forEach(d => fn({ id: d.id, data: () => d.data })),
});
const emit = (docs: Array<{ id: string; data: Record<string, unknown> }>) => act(() => snapNext?.(snapshot(docs)));


/**
 * Executa a ação dentro do act capturando o erro. Se a ação lançasse para fora do
 * act, o React descartaria as renderizações pendentes e o estado lido depois seria
 * só o inicial — o teste de "desfazer" passaria sem provar nada.
 */
const attempt = async (fn: () => Promise<unknown>): Promise<unknown> => {
  let error: unknown;
  await act(async () => {
    try { await fn(); } catch (e) { error = e; }
  });
  return error;
};
const failsWith = (error: unknown, message: string) => expect(error).toEqual(expect.objectContaining({ message }));

/** Renderiza já "logado" e com a lista inicial vinda do cache */
const setup = (cache: TodoItem[] = [], opts: { enabled?: boolean; loggedIn?: boolean } = {}) => {
  authState.currentUser = opts.loggedIn === false ? null : { isAnonymous: false };
  vi.mocked(getCachedTodos).mockReturnValue(cache);
  return renderHook(() => useTodo('Ana', 'ana@x.com', opts.enabled ?? true));
};

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  authState.callbacks = [];
  snapNext = null; snapError = null;
  vi.mocked(onSnapshot).mockImplementation(((_q: unknown, next: (s: Snap) => void, err: (e: Error) => void) => {
    snapNext = next; snapError = err; return unsub;
  }) as never);
  vi.mocked(addTodoDoc).mockResolvedValue('new-id');
  vi.mocked(updateTodoDoc).mockResolvedValue(undefined);
  vi.mocked(deleteTodoDoc).mockResolvedValue(undefined);
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe('getNextRecurrenceDate', () => {
  it.each([
    ['2026-11-15', 'daily', '2026-11-16'], ['2026-11-30', 'daily', '2026-12-01'], ['2026-12-31', 'daily', '2027-01-01'],
    ['2026-11-13', 'weekdays', '2026-11-16'], // sexta → segunda
    ['2026-11-14', 'weekdays', '2026-11-16'], // sábado → segunda
    ['2026-11-12', 'weekdays', '2026-11-13'], // quinta → sexta
    ['2026-11-15', 'weekly', '2026-11-22'], ['2026-12-28', 'weekly', '2027-01-04'],
    ['2026-11-15', 'monthly', '2026-12-15'], ['2026-01-31', 'monthly', '2026-02-28'], ['2028-01-31', 'monthly', '2028-02-29'],
    ['2026-12-31', 'monthly', '2027-01-31'], ['2026-03-31', 'monthly', '2026-04-30'],
  ] as const)('%s + %s → %s', (from, repeat, expected) => {
    expect(getNextRecurrenceDate(from, repeat)).toBe(expected);
  });

  it('sem repetição devolve a mesma data; sem data parte de hoje', () => {
    expect(getNextRecurrenceDate('2026-11-15', 'none')).toBe('2026-11-15');
    vi.useFakeTimers(); vi.setSystemTime(NOW);
    expect(getNextRecurrenceDate(undefined, 'daily')).toBe('2026-11-16');
    expect(getNextRecurrenceDate('lixo', 'daily')).toBe('2026-11-16'); // data inválida: parte de hoje
  });
});

describe('deduplicateTodos', () => {
  it('mantém a primeira ocorrência de cada id e descarta sem id', () => {
    const list = [T({ id: 'a', title: '1' }), T({ id: 'a', title: '2' }), T({ id: 'b' }), { ...T({ id: 'c' }), id: '' }];
    expect(deduplicateTodos(list).map(t => `${t.id}:${t.title}`)).toEqual(['a:1', 'b:b']);
  });
});

describe('useTodo — lista inicial e escuta do Firestore', () => {
  it('começa pelo cache (sem duplicados) e ainda carregando', () => {
    const { result } = setup([T({ id: 'a' }), T({ id: 'a' }), T({ id: 'b' })]);
    expect(result.current.todos.map(t => t.id)).toEqual(['a', 'b']);
    expect(result.current.isLoading).toBe(true);
  });

  it('assina a coleção quando habilitado e logado', () => {
    setup();
    expect(onSnapshot).toHaveBeenCalledTimes(1);
  });

  it('não assina se desabilitado', () => {
    setup([], { enabled: false });
    expect(onSnapshot).not.toHaveBeenCalled();
  });

  it('espera o login: sem usuário não assina; ao logar, assina', () => {
    setup([], { loggedIn: false });
    expect(onSnapshot).not.toHaveBeenCalled();
    act(() => authState.callbacks.forEach(cb => cb({ isAnonymous: false })));
    expect(onSnapshot).toHaveBeenCalledTimes(1);
  });

  it('sessão anônima NÃO conta como login', () => {
    setup([], { loggedIn: false });
    act(() => authState.callbacks.forEach(cb => cb({ isAnonymous: true })));
    expect(onSnapshot).not.toHaveBeenCalled();
  });

  it('traduz os documentos, ordena do mais novo ao mais antigo, salva o cache e para de carregar', async () => {
    const { result } = setup();
    await emit([
      { id: 'velha', data: { title: 'Velha', createdAt: { seconds: Date.UTC(2026, 0, 1) / 1000 } } },
      { id: 'nova', data: { title: 'Nova', completed: true, important: true, dueDate: '2026-11-20', dueTime: '10:00', repeat: 'weekly',
        notes: 'n', steps: [{ id: 's', title: 'x', completed: false }], assignedTo: 'm@x.com', assignedToName: 'Maria',
        employeeName: 'Bia', userEmail: 'bia@x.com', createdAt: { toDate: () => new Date('2026-06-01T00:00:00Z') }, completedAt: '2026-11-02' } },
      { id: 'texto', data: { title: 'Texto', createdAt: '2026-03-01T00:00:00.000Z' } },
    ]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.todos.map(t => t.id)).toEqual(['nova', 'texto', 'velha']);
    const nova = result.current.todos[0];
    expect(nova).toMatchObject({
      title: 'Nova', completed: true, important: true, dueDate: '2026-11-20', dueTime: '10:00', repeat: 'weekly', notes: 'n',
      assignedTo: 'm@x.com', assignedToName: 'Maria', employeeName: 'Bia', userEmail: 'bia@x.com', completedAt: '2026-11-02',
      createdAt: '2026-06-01T00:00:00.000Z',
    });
    expect(saveCachedTodos).toHaveBeenLastCalledWith(result.current.todos);
  });

  it('valores padrão para documentos incompletos / legados', async () => {
    const { result } = setup();
    await emit([
      { id: 'a', data: {} },
      { id: 'b', data: { description: 'Do campo antigo' } },
      { id: 'c', data: { nome: 'Só nome' } },
    ]);
    const byId = Object.fromEntries(result.current.todos.map(t => [t.id, t]));
    expect(byId.a).toMatchObject({ title: 'Tarefa sem título', completed: false, important: false, repeat: 'none', steps: [], employeeName: 'Funcionário', userEmail: '' });
    expect(byId.a.createdAt).toBeNull(); // sem createdAt NÃO vira "agora" a cada snapshot
    expect(byId.b.title).toBe('Do campo antigo');
    expect(byId.c.title).toBe('Só nome');
    expect(byId.a.dueDate).toBeUndefined();
  });

  it('documentos duplicados no snapshot viram um só', async () => {
    const { result } = setup();
    await emit([{ id: 'a', data: { title: '1' } }, { id: 'a', data: { title: '2' } }]);
    expect(result.current.todos).toHaveLength(1);
  });

  it('erro na escuta: volta ao cache local e para de carregar', () => {
    const { result } = setup([T({ id: 'cache1' })]);
    act(() => snapError?.(new Error('permission-denied')));
    expect(result.current.isLoading).toBe(false);
    expect(result.current.todos.map(t => t.id)).toEqual(['cache1']);
  });

  it('cancela a assinatura ao desmontar', () => {
    const { unmount } = setup();
    unmount();
    expect(unsub).toHaveBeenCalled();
  });
});

describe('useTodo — lembretes', () => {
  const dueNow = (over: Partial<TodoItem> = {}) => T({ id: 'r1', title: 'Reunião', dueDate: TODAY, dueTime: '14:30', ...over });

  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(NOW); });

  it('toca o alerta e notifica quando a hora do lembrete chega (uma vez só)', () => {
    setup([dueNow({ notes: 'Levar contrato' })]);
    expect(playTodoAlertSound).toHaveBeenCalledTimes(1);
    expect(showNativeNotification).toHaveBeenCalledWith('🔔 Lembrete To-Do: Reunião', { body: 'Levar contrato' });
    act(() => { vi.advanceTimersByTime(45000); }); // 3 verificações seguintes no mesmo minuto
    expect(playTodoAlertSound).toHaveBeenCalledTimes(1);
  });

  it('o texto da notificação usa o responsável ou o horário quando não há anotação', () => {
    const a = setup([dueNow({ assignedTo: 'm@x.com', assignedToName: 'Maria' })]);
    expect(showNativeNotification).toHaveBeenLastCalledWith('🔔 Lembrete To-Do: Reunião', { body: 'Atribuído a: Maria' });
    a.unmount(); localStorage.clear(); vi.clearAllMocks();
    setup([dueNow()]);
    expect(showNativeNotification).toHaveBeenLastCalledWith('🔔 Lembrete To-Do: Reunião', { body: 'Horário agendado: 14:30' });
  });

  it('não dispara para concluída, outro horário, outro dia ou sem hora', () => {
    setup([dueNow({ id: 'a', completed: true }), dueNow({ id: 'b', dueTime: '14:31' }), dueNow({ id: 'c', dueDate: '2026-11-16' }), T({ id: 'd', dueDate: TODAY })]);
    expect(playTodoAlertSound).not.toHaveBeenCalled();
  });

  it('não dispara se o hook está desabilitado', () => {
    setup([dueNow()], { enabled: false });
    expect(playTodoAlertSound).not.toHaveBeenCalled();
  });

  it('guarda quem já foi notificado hoje (sobrevive a recarregar)', () => {
    const a = setup([dueNow()]);
    expect(JSON.parse(localStorage.getItem('miplace_todo_notified') || '{}')).toEqual({ day: TODAY, ids: ['r1'] });
    a.unmount(); vi.clearAllMocks();
    setup([dueNow()]);
    expect(playTodoAlertSound).not.toHaveBeenCalled(); // já notificada hoje
  });

  it('ignora a lista de notificados de outro dia', () => {
    localStorage.setItem('miplace_todo_notified', JSON.stringify({ day: '2026-11-14', ids: ['r1'] }));
    setup([dueNow()]);
    expect(playTodoAlertSound).toHaveBeenCalledTimes(1);
  });

  it('cache de notificados corrompido não quebra', () => {
    localStorage.setItem('miplace_todo_notified', '{lixo');
    setup([dueNow()]);
    expect(playTodoAlertSound).toHaveBeenCalledTimes(1);
  });

  it('pede permissão de notificação só no primeiro toque/clique', async () => {
    setup();
    expect(requestNotificationPermission).not.toHaveBeenCalled();
    act(() => { document.dispatchEvent(new Event('pointerdown')); document.dispatchEvent(new Event('pointerdown')); });
    expect(requestNotificationPermission).toHaveBeenCalledTimes(1); // { once: true }
  });
});

describe('useTodo — adicionar', () => {
  it('grava com os dados do usuário e só toca o bipe depois de gravar', async () => {
    const { result } = setup();
    const order: string[] = [];
    vi.mocked(addTodoDoc).mockImplementationOnce(async () => { order.push('grava'); return 'id'; });
    vi.mocked(playSynthesizedBeep).mockImplementationOnce(() => { order.push('bipe'); });
    await act(async () => { await result.current.addTodo('  Comprar café  ', '2026-11-20', '09:00', true, 'nota', 'weekly', ' m@x.com ', ' Maria '); });
    expect(order).toEqual(['grava', 'bipe']);
    expect(addTodoDoc).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Comprar café', completed: false, important: true, dueDate: '2026-11-20', dueTime: '09:00', repeat: 'weekly', notes: 'nota',
      steps: [], assignedTo: 'm@x.com', assignedToName: 'Maria', employeeName: 'Ana', userEmail: 'ana@x.com',
    }));
  });

  it('campos vazios viram indefinidos; título só com espaços é ignorado', async () => {
    const { result } = setup();
    await act(async () => { await result.current.addTodo('   '); });
    expect(addTodoDoc).not.toHaveBeenCalled();
    await act(async () => { await result.current.addTodo('Simples', '', '', false, '', 'none', '', ''); });
    const payload = vi.mocked(addTodoDoc).mock.calls[0][0];
    expect(payload).toMatchObject({ title: 'Simples', dueDate: undefined, dueTime: undefined, notes: undefined, assignedTo: undefined, assignedToName: undefined, repeat: 'none' });
  });

  it('falha ao gravar: propaga o erro e NÃO toca o bipe', async () => {
    vi.mocked(addTodoDoc).mockRejectedValueOnce(new Error('sem permissão'));
    const { result } = setup();
    failsWith(await attempt(() => result.current.addTodo('Vai falhar')), 'sem permissão');
    expect(playSynthesizedBeep).not.toHaveBeenCalled();
  });
});

describe('useTodo — concluir e recorrência', () => {
  const run = async (hook: ReturnType<typeof setup>, id: string) => { await act(async () => { await hook.result.current.toggleComplete(id); }); };

  it('conclui de forma otimista, grava, toca o alerta e salva o cache', async () => {
    const h = setup([T({ id: 'a' })]);
    await run(h, 'a');
    expect(h.result.current.todos[0].completed).toBe(true);
    expect(h.result.current.todos[0].completedAt).toEqual(expect.any(String));
    expect(updateTodoDoc).toHaveBeenCalledWith('a', { completed: true, completedAt: expect.any(String) });
    expect(playTodoAlertSound).toHaveBeenCalled();
    expect(saveCachedTodos).toHaveBeenCalled();
  });

  it('reabrir toca o bipe e limpa completedAt', async () => {
    const h = setup([T({ id: 'a', completed: true, completedAt: '2026-11-01' })]);
    await run(h, 'a');
    expect(h.result.current.todos[0]).toMatchObject({ completed: false, completedAt: undefined });
    expect(updateTodoDoc).toHaveBeenCalledWith('a', { completed: false, completedAt: undefined });
    expect(playSynthesizedBeep).toHaveBeenCalled();
    expect(playTodoAlertSound).not.toHaveBeenCalled();
  });

  it('falha ao gravar: desfaz, propaga o erro e não toca som', async () => {
    vi.mocked(updateTodoDoc).mockRejectedValueOnce(new Error('offline'));
    const h = setup([T({ id: 'a' })]);
    failsWith(await attempt(() => h.result.current.toggleComplete('a')), 'offline');
    expect(h.result.current.todos[0].completed).toBe(false);
    expect(playTodoAlertSound).not.toHaveBeenCalled();
  });

  it('id inexistente não faz nada', async () => {
    const h = setup([T({ id: 'a' })]);
    await run(h, 'zzz');
    expect(updateTodoDoc).not.toHaveBeenCalled();
  });

  it('duplo clique enquanto grava não conclui duas vezes', async () => {
    let release!: () => void;
    vi.mocked(updateTodoDoc).mockReturnValueOnce(new Promise<void>(r => { release = r; }));
    const h = setup([T({ id: 'a' })]);
    let p1!: Promise<void>;
    act(() => { p1 = h.result.current.toggleComplete('a'); void h.result.current.toggleComplete('a'); });
    release();
    await act(async () => { await p1; });
    expect(updateTodoDoc).toHaveBeenCalledTimes(1);
  });

  it('tarefa recorrente: ao concluir cria a próxima ocorrência com etapas zeradas', async () => {
    const h = setup([T({
      id: 'r', title: 'Backup', repeat: 'weekly', dueDate: '2026-11-15', dueTime: '08:00', important: true, notes: 'n',
      assignedTo: 'm@x.com', assignedToName: 'Maria',
      steps: [{ id: 's1', title: 'a', completed: true }, { id: 's2', title: 'b', completed: false }],
    })]);
    await run(h, 'r');
    expect(addTodoDoc).toHaveBeenCalledTimes(1);
    expect(addTodoDoc).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Backup', dueDate: '2026-11-22', dueTime: '08:00', important: true, notes: 'n', repeat: 'weekly',
      assignedTo: 'm@x.com', assignedToName: 'Maria',
      steps: [{ id: 's1', title: 'a', completed: false }, { id: 's2', title: 'b', completed: false }],
    }));
  });

  it('não duplica a próxima ocorrência se ela já existe (mesmo título, data e dono)', async () => {
    const h = setup([
      T({ id: 'r', title: 'Backup', repeat: 'daily', dueDate: '2026-11-15' }),
      T({ id: 'prox', title: ' BACKUP ', dueDate: '2026-11-16' }),
    ]);
    await run(h, 'r');
    expect(addTodoDoc).not.toHaveBeenCalled();
  });

  it('a próxima ocorrência de OUTRO dono não impede a criação', async () => {
    const h = setup([
      T({ id: 'r', title: 'Backup', repeat: 'daily', dueDate: '2026-11-15', userEmail: 'ana@x.com' }),
      T({ id: 'outro', title: 'Backup', dueDate: '2026-11-16', userEmail: 'bia@x.com' }),
    ]);
    await run(h, 'r');
    expect(addTodoDoc).toHaveBeenCalledTimes(1);
  });

  it('reabrir uma recorrente NÃO cria nova ocorrência; sem repetição também não', async () => {
    const a = setup([T({ id: 'r', repeat: 'daily', dueDate: '2026-11-15', completed: true })]);
    await run(a, 'r');
    const b = setup([T({ id: 'x', repeat: 'none', dueDate: '2026-11-15' })]);
    await run(b, 'x');
    expect(addTodoDoc).not.toHaveBeenCalled();
  });
});

describe('useTodo — importante, editar e excluir', () => {
  it('toggleImportant: otimista, grava e toca o bipe', async () => {
    const h = setup([T({ id: 'a' })]);
    await act(async () => { await h.result.current.toggleImportant('a'); });
    expect(h.result.current.todos[0].important).toBe(true);
    expect(updateTodoDoc).toHaveBeenCalledWith('a', { important: true });
    expect(playSynthesizedBeep).toHaveBeenCalled();
  });

  it('toggleImportant: falha desfaz e propaga', async () => {
    vi.mocked(updateTodoDoc).mockRejectedValueOnce(new Error('x'));
    const h = setup([T({ id: 'a', important: true })]);
    failsWith(await attempt(() => h.result.current.toggleImportant('a')), 'x');
    expect(h.result.current.todos[0].important).toBe(true);
    expect(playSynthesizedBeep).not.toHaveBeenCalled();
  });

  it('updateTodo: aplica e grava; falha restaura os campos', async () => {
    const h = setup([T({ id: 'a', title: 'Original', notes: 'velha' })]);
    await act(async () => { await h.result.current.updateTodo('a', { title: 'Novo', notes: 'nova' }); });
    expect(h.result.current.todos[0]).toMatchObject({ title: 'Novo', notes: 'nova' });
    expect(updateTodoDoc).toHaveBeenCalledWith('a', { title: 'Novo', notes: 'nova' });

    vi.mocked(updateTodoDoc).mockRejectedValueOnce(new Error('falhou'));
    failsWith(await attempt(() => h.result.current.updateTodo('a', { title: 'Quebra' })), 'falhou');
    expect(h.result.current.todos[0].title).toBe('Novo');
  });

  it('updateTodo de id inexistente não faz nada', async () => {
    const h = setup([T({ id: 'a' })]);
    await act(async () => { await h.result.current.updateTodo('zzz', { title: 'x' }); });
    expect(updateTodoDoc).not.toHaveBeenCalled();
  });

  it('deleteTodo: remove e apaga; falha recoloca o item NO INÍCIO da lista', async () => {
    const h = setup([T({ id: 'a' }), T({ id: 'b' }), T({ id: 'c' })]);
    await act(async () => { await h.result.current.deleteTodo('b'); });
    expect(h.result.current.todos.map(t => t.id)).toEqual(['a', 'c']);
    expect(deleteTodoDoc).toHaveBeenCalledWith('b');

    vi.mocked(deleteTodoDoc).mockRejectedValueOnce(new Error('sem permissão'));
    failsWith(await attempt(() => h.result.current.deleteTodo('c')), 'sem permissão');
    expect(h.result.current.todos.map(t => t.id)).toEqual(['c', 'a']);
  });
});

describe('useTodo — etapas', () => {
  const steps = [{ id: 's1', title: 'um', completed: false }, { id: 's2', title: 'dois', completed: true }];

  it('addStep: id gerado, título sem espaços, grava a lista e toca o bipe', async () => {
    const h = setup([T({ id: 'a', steps })]);
    await act(async () => { await h.result.current.addStep('a', '  novo passo  '); });
    const list = h.result.current.todos[0].steps!;
    expect(list).toHaveLength(3);
    expect(list[2]).toMatchObject({ title: 'novo passo', completed: false });
    expect(list[2].id).toMatch(/^step_\d+_[a-z0-9]{1,4}$/);
    expect(updateTodoDoc).toHaveBeenCalledWith('a', { steps: list });
    expect(playSynthesizedBeep).toHaveBeenCalled();
  });

  it('addStep: título vazio ou tarefa inexistente não faz nada; falha desfaz', async () => {
    const h = setup([T({ id: 'a', steps })]);
    await act(async () => { await h.result.current.addStep('a', '   '); await h.result.current.addStep('zzz', 'x'); });
    expect(updateTodoDoc).not.toHaveBeenCalled();
    vi.mocked(updateTodoDoc).mockRejectedValueOnce(new Error('x'));
    failsWith(await attempt(() => h.result.current.addStep('a', 'quebra')), 'x');
    expect(h.result.current.todos[0].steps).toEqual(steps);
  });

  it('toggleStep alterna a etapa e grava (sem bipe de... com bipe); falha desfaz', async () => {
    const h = setup([T({ id: 'a', steps })]);
    await act(async () => { await h.result.current.toggleStep('a', 's1'); });
    expect(h.result.current.todos[0].steps![0].completed).toBe(true);
    expect(updateTodoDoc).toHaveBeenCalledWith('a', { steps: expect.any(Array) });
    expect(playSynthesizedBeep).toHaveBeenCalled();
    vi.mocked(updateTodoDoc).mockRejectedValueOnce(new Error('x'));
    failsWith(await attempt(() => h.result.current.toggleStep('a', 's2')), 'x');
    expect(h.result.current.todos[0].steps![1].completed).toBe(true); // continua como estava
  });

  it('toggleStep sem etapas ou com tarefa inexistente não faz nada', async () => {
    const h = setup([T({ id: 'a' })]);
    await act(async () => { await h.result.current.toggleStep('a', 's1'); await h.result.current.toggleStep('zzz', 's1'); });
    expect(updateTodoDoc).not.toHaveBeenCalled();
  });

  it('deleteStep remove a etapa e grava SEM bipe; falha desfaz', async () => {
    const h = setup([T({ id: 'a', steps })]);
    await act(async () => { await h.result.current.deleteStep('a', 's1'); });
    expect(h.result.current.todos[0].steps!.map(s => s.id)).toEqual(['s2']);
    expect(updateTodoDoc).toHaveBeenCalledWith('a', { steps: [steps[1]] });
    expect(playSynthesizedBeep).not.toHaveBeenCalled();
    vi.mocked(updateTodoDoc).mockRejectedValueOnce(new Error('x'));
    failsWith(await attempt(() => h.result.current.deleteStep('a', 's2')), 'x');
    expect(h.result.current.todos[0].steps!.map(s => s.id)).toEqual(['s2']);
  });
});
