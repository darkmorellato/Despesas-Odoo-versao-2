import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { User } from 'firebase/auth';
import { useExpenses, HistoryLoadError, FULL_HISTORY_TIMEOUT_MS } from './useExpenses';
import { getRecentWindowStart } from '../utils/historyWindow';
import { where, orderBy, onSnapshot } from 'firebase/firestore';

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  doc: vi.fn(() => ({ id: 'x' })),
  // query() devolve um descritor para o teste inspecionar o que foi consultado
  query: vi.fn((_ref: unknown, ...constraints: unknown[]) => ({ constraints })),
  where: vi.fn((field: string, op: string, value: unknown) => ({ type: 'where', field, op, value })),
  orderBy: vi.fn((field: string, dir: string) => ({ type: 'orderBy', field, dir })),
  onSnapshot: vi.fn(),
  writeBatch: vi.fn(),
  serverTimestamp: vi.fn(() => 'TS'),
}));

vi.mock('@/config/firebase', () => ({
  getFirebaseRefs: vi.fn(() => ({ expensesRef: { firestore: {} } })),
}));
vi.mock('@/features/auth', () => ({ validateAnyAdminPassword: vi.fn() }));

interface Sub {
  q: { constraints: Array<{ type: string }> };
  options: { includeMetadataChanges?: boolean } | undefined;
  next: (snap: unknown) => void;
  error: (e: Error) => void;
  unsub: ReturnType<typeof vi.fn>;
}
let subs: Sub[] = [];

const snap = (docs: Array<Record<string, unknown> & { id: string }>, fromCache = false) => ({
  docs: docs.map(({ id, ...data }) => ({ id, data: () => data })),
  metadata: { fromCache },
});

const user = { uid: 'u1', isAnonymous: false } as unknown as User;
const E = (id: string, date: string, extra: Record<string, unknown> = {}) =>
  ({ id, date, description: id, amount: 10, category: 'c', store: 'Realme', employeeName: 'x', ...extra });

const lastSub = () => subs[subs.length - 1];

describe('useExpenses — janela recente e histórico completo', () => {
  beforeEach(() => {
    subs = [];
    vi.clearAllMocks();
    vi.mocked(onSnapshot).mockImplementation(((q: Sub['q'], a: unknown, b: unknown, c?: unknown) => {
      const hasOptions = typeof a !== 'function';
      const unsub = vi.fn();
      subs.push({
        q,
        options: hasOptions ? (a as Sub['options']) : undefined,
        next: (hasOptions ? b : a) as Sub['next'],
        error: (hasOptions ? c : b) as Sub['error'],
        unsub,
      });
      return unsub;
    }) as never);
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

  it('por padrão consulta só a janela recente (where date >= início) ordenando por data', () => {
    const { result } = renderHook(() => useExpenses(user));
    const start = getRecentWindowStart();

    expect(where).toHaveBeenCalledWith('date', '>=', start);
    expect(orderBy).toHaveBeenCalledWith('date', 'desc');
    expect(subs).toHaveLength(1);
    expect(subs[0].options).toBeUndefined(); // listener normal (sem metadados)
    expect(result.current.recentWindowStart).toBe(start);
    expect(result.current.isFullHistory).toBe(false);
    expect(result.current.isLoadingHistory).toBe(false);
  });

  it('expõe as despesas ativas da janela e separa as excluídas', () => {
    const { result } = renderHook(() => useExpenses(user));
    act(() => subs[0].next(snap([E('a', '2026-11-01'), E('b', '2026-10-01', { deleted: true })])));
    expect(result.current.expenses.map(e => e.id)).toEqual(['a']);
    expect(result.current.deletedExpenses.map(e => e.id)).toEqual(['b']);
  });

  it('loadFullHistory troca para a consulta sem where e só resolve com confirmação do servidor', async () => {
    const { result } = renderHook(() => useExpenses(user));
    act(() => subs[0].next(snap([E('a', '2026-11-01')])));

    let resolved: unknown = null;
    let promise!: Promise<unknown>;
    act(() => { promise = result.current.loadFullHistory().then(r => { resolved = r; }); });

    // Novo listener: sem filtro de data, com metadados
    expect(subs).toHaveLength(2);
    expect(subs[0].unsub).toHaveBeenCalled();
    expect(lastSub().q.constraints.some(c => c.type === 'where')).toBe(false);
    expect(lastSub().options).toEqual({ includeMetadataChanges: true });
    expect(result.current.isLoadingHistory).toBe(true);

    // 1º evento: vem do cache local (pode estar incompleto) — NÃO pode resolver
    await act(async () => { lastSub().next(snap([E('a', '2026-11-01')], true)); });
    expect(resolved).toBeNull();
    expect(result.current.isFullHistory).toBe(false);

    // 2º evento: confirmado pelo servidor — resolve com TODAS as ativas
    await act(async () => {
      lastSub().next(snap([E('a', '2026-11-01'), E('old', '2026-02-05'), E('del', '2026-03-01', { deleted: true })], false));
      await promise;
    });
    expect((resolved as Array<{ id: string }>).map(e => e.id)).toEqual(['a', 'old']);
    expect(result.current.isFullHistory).toBe(true);
    expect(result.current.isLoadingHistory).toBe(false);
    expect(result.current.expenses.map(e => e.id)).toEqual(['a', 'old']);
  });

  it('com o histórico já carregado, resolve na hora sem nova assinatura', async () => {
    const { result } = renderHook(() => useExpenses(user));
    let p!: Promise<unknown>;
    act(() => { p = result.current.loadFullHistory(); });
    await act(async () => { lastSub().next(snap([E('a', '2026-11-01')], false)); await p; });
    const before = subs.length;

    const again = await result.current.loadFullHistory();
    expect((again as Array<{ id: string }>).map(e => e.id)).toEqual(['a']);
    expect(subs).toHaveLength(before);
  });

  it('pedidos simultâneos recebem o mesmo resultado', async () => {
    const { result } = renderHook(() => useExpenses(user));
    let p1!: Promise<unknown>, p2!: Promise<unknown>;
    act(() => { p1 = result.current.loadFullHistory(); p2 = result.current.loadFullHistory(); });
    await act(async () => { lastSub().next(snap([E('a', '2026-11-01')], false)); });
    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1).toEqual(r2);
  });

  it('offline: aceita o cache em vez de ficar esperando para sempre', async () => {
    const online = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    const { result } = renderHook(() => useExpenses(user));
    let p!: Promise<unknown>;
    act(() => { p = result.current.loadFullHistory(); });
    await act(async () => { lastSub().next(snap([E('a', '2026-01-01')], true)); await p; });
    expect(result.current.isFullHistory).toBe(true);
    online.mockRestore();
  });

  it('erro de leitura rejeita com HistoryLoadError (nunca devolve lista parcial)', async () => {
    const { result } = renderHook(() => useExpenses(user));
    let p!: Promise<unknown>;
    act(() => { p = result.current.loadFullHistory(); });
    const assertion = expect(p).rejects.toBeInstanceOf(HistoryLoadError);
    await act(async () => { lastSub().error(new Error('permission-denied')); });
    await assertion;
    expect(result.current.isFullHistory).toBe(false);
  });

  it('sem resposta do servidor, rejeita depois do tempo limite', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useExpenses(user));
    let p!: Promise<unknown>;
    act(() => { p = result.current.loadFullHistory(); });
    const assertion = expect(p).rejects.toBeInstanceOf(HistoryLoadError);
    await act(async () => { await vi.advanceTimersByTimeAsync(FULL_HISTORY_TIMEOUT_MS + 10); });
    await assertion;
  });

  it('sem usuário não carrega nada e o pedido é recusado', async () => {
    const { result } = renderHook(() => useExpenses(null));
    expect(subs).toHaveLength(0);
    await expect(result.current.loadFullHistory()).rejects.toBeInstanceOf(HistoryLoadError);
  });

  it('logout volta para a janela recente e invalida o histórico carregado', async () => {
    const { result, rerender } = renderHook(({ u }) => useExpenses(u), { initialProps: { u: user as User | null } });
    let p!: Promise<unknown>;
    act(() => { p = result.current.loadFullHistory(); });
    await act(async () => { lastSub().next(snap([E('a', '2026-11-01')], false)); await p; });
    expect(result.current.isFullHistory).toBe(true);

    rerender({ u: null });
    expect(result.current.isFullHistory).toBe(false);
    expect(result.current.expenses).toEqual([]);

    // novo login: consulta recente de novo (com where)
    rerender({ u: user });
    const sub = lastSub();
    expect(sub.q.constraints.some(c => c.type === 'where')).toBe(true);
    expect(result.current.isFullHistory).toBe(false);
  });
});
