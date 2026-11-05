import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useExpenses, detectExpenseGroup } from './useExpenses';
import { writeBatch, onSnapshot } from 'firebase/firestore';
import type { User } from 'firebase/auth';

// Cada doc(...) devolve uma referência rastreável; sem id => id automático
let autoId = 0;
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  doc: vi.fn((_coll: unknown, id?: string) => ({ id: id ?? `auto-${++autoId}` })),
  query: vi.fn(),
  orderBy: vi.fn(),
  onSnapshot: vi.fn(),
  writeBatch: vi.fn(),
  serverTimestamp: vi.fn(() => 'SERVER_TS'),
}));

vi.mock('@/config/firebase', () => ({
  getFirebaseRefs: vi.fn(() => ({ expensesRef: { firestore: { __db: true } } })),
}));

vi.mock('@/features/auth', () => ({ validateAnyAdminPassword: vi.fn() }));

const makeBatch = () => ({
  set: vi.fn(),
  update: vi.fn(),
  commit: vi.fn().mockResolvedValue(undefined),
});

const user = { uid: 'u1', isAnonymous: false } as unknown as User;

const base = {
  date: '2026-08-20',
  description: 'Internet Fibra',
  category: 'Despesa',
  quantity: 1,
  employeeName: 'Teste',
};

describe('rateio atômico (writeBatch + groupId)', () => {
  let batch: ReturnType<typeof makeBatch>;

  beforeEach(() => {
    vi.clearAllMocks();
    autoId = 0;
    batch = makeBatch();
    vi.mocked(writeBatch).mockReturnValue(batch as never);
    vi.mocked(onSnapshot).mockImplementation((() => vi.fn()) as never);
  });

  describe('addExpenseGroup', () => {
    it('grava todas as parcelas num único commit, com o mesmo groupId', async () => {
      const { result } = renderHook(() => useExpenses(user));
      const entries = [
        { ...base, store: 'Dom Pedro II', amount: 100, originalTotal: 400 },
        { ...base, store: 'Realme', amount: 100, originalTotal: 400 },
        { ...base, store: 'Xv de Novembro', amount: 100, originalTotal: 400 },
        { ...base, store: 'Premium', amount: 100, originalTotal: 400 },
      ];

      let groupId = '';
      await act(async () => { groupId = await result.current.addExpenseGroup(entries); });

      expect(writeBatch).toHaveBeenCalledTimes(1);
      expect(batch.set).toHaveBeenCalledTimes(4);
      expect(batch.commit).toHaveBeenCalledTimes(1);
      expect(groupId).toBeTruthy();
      for (const call of batch.set.mock.calls) {
        expect(call[1]).toMatchObject({ groupId, deleted: false, createdAt: 'SERVER_TS' });
      }
      // ids de documento distintos por parcela
      const ids = batch.set.mock.calls.map(c => (c[0] as { id: string }).id);
      expect(new Set(ids).size).toBe(4);
      expect(result.current.syncStatus).toBe('synced');
    });

    it('se o commit falha, propaga o erro e marca sync como erro (nada parcial)', async () => {
      batch.commit.mockRejectedValueOnce(new Error('offline'));
      const { result } = renderHook(() => useExpenses(user));

      await act(async () => {
        await expect(
          result.current.addExpenseGroup([{ ...base, store: 'Realme', amount: 50 }])
        ).rejects.toThrow('offline');
      });
      expect(result.current.syncStatus).toBe('error');
    });
  });

  describe('saveExpenseGroup', () => {
    it('atualiza, adiciona e remove na MESMA operação atômica', async () => {
      const { result } = renderHook(() => useExpenses(user));

      await act(async () => {
        await result.current.saveExpenseGroup({
          groupId: 'g1',
          updates: [{ id: 'a', data: { amount: 150 } }],
          adds: [{ ...base, store: 'Premium', amount: 150 }],
          removes: [{ id: 'c', reason: 'Saiu do grupo', deletedBy: 'Dark' }],
        });
      });

      expect(batch.commit).toHaveBeenCalledTimes(1);
      expect(batch.update).toHaveBeenNthCalledWith(1, { id: 'a' }, expect.objectContaining({ amount: 150, groupId: 'g1' }));
      expect(batch.set).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ store: 'Premium', groupId: 'g1', deleted: false }));
      expect(batch.update).toHaveBeenNthCalledWith(2, { id: 'c' }, expect.objectContaining({
        deleted: true, deleteReason: 'Saiu do grupo', deletedBy: 'Dark',
      }));
    });

    it('groupId undefined gera um novo (lançamento antigo ganha id ao ser editado)', async () => {
      const { result } = renderHook(() => useExpenses(user));
      await act(async () => {
        await result.current.saveExpenseGroup({ updates: [{ id: 'a', data: {} }], adds: [], removes: [] });
      });
      const written = batch.update.mock.calls[0][1] as { groupId: string };
      expect(typeof written.groupId).toBe('string');
      expect(written.groupId).toBeTruthy();
    });

    it('groupId null desagrupa a parcela mantida', async () => {
      const { result } = renderHook(() => useExpenses(user));
      await act(async () => {
        await result.current.saveExpenseGroup({
          groupId: null,
          updates: [{ id: 'a', data: { originalTotal: null } }],
          adds: [],
          removes: [{ id: 'b' }],
        });
      });
      expect(batch.update.mock.calls[0][1]).toMatchObject({ groupId: null, originalTotal: null });
      expect(batch.update.mock.calls[1][1]).toMatchObject({ deleted: true, deleteReason: 'Excluído pelo usuário' });
    });

    it('falha no commit propaga o erro', async () => {
      batch.commit.mockRejectedValueOnce(new Error('permission-denied'));
      const { result } = renderHook(() => useExpenses(user));
      await act(async () => {
        await expect(
          result.current.saveExpenseGroup({ updates: [], adds: [], removes: [] })
        ).rejects.toThrow('permission-denied');
      });
      expect(result.current.syncStatus).toBe('error');
    });
  });
});

describe('detectExpenseGroup por groupId', () => {
  const mk = (id: string, store: string, extra: Record<string, unknown> = {}) => ({
    id, store, amount: 100, originalTotal: 400, groupId: 'g1', ...base, ...extra,
  });

  it('agrupa pelo groupId e identifica "Todas" (4 empresas)', () => {
    const all = [mk('1', 'Dom Pedro II'), mk('2', 'Realme'), mk('3', 'Xv de Novembro'), mk('4', 'Premium')];
    const r = detectExpenseGroup(all[1] as never, all as never);
    expect(r.groupName).toBe('Todas');
    expect(r.siblings).toHaveLength(4);
    expect(r.totalAmount).toBe(400);
  });

  it('NÃO mistura duas despesas parecidas de grupos diferentes (mesma data/descrição)', () => {
    const all = [
      mk('1', 'Dom Pedro II', { groupId: 'g1', originalTotal: 300 }),
      mk('2', 'Realme', { groupId: 'g1', originalTotal: 300 }),
      mk('3', 'Xv de Novembro', { groupId: 'g1', originalTotal: 300 }),
      mk('4', 'Premium', { groupId: 'g2', originalTotal: 200 }),
      mk('5', 'Kassouf', { groupId: 'g2', originalTotal: 200 }),
    ];
    const pira = detectExpenseGroup(all[0] as never, all as never);
    expect(pira.groupName).toBe('Piracicaba (DP - Realme - XV)');
    expect(pira.siblings.map(s => s.id)).toEqual(['1', '2', '3']);
    const amparo = detectExpenseGroup(all[3] as never, all as never);
    expect(amparo.groupName).toBe('Amparo (Premium - Kassouf)');
    expect(amparo.siblings.map(s => s.id)).toEqual(['4', '5']);
  });

  it('ignora parcelas excluídas; sobrando uma só vira individual', () => {
    const all = [
      mk('1', 'Dom Pedro II'),
      mk('2', 'Realme', { deleted: true }),
    ];
    const r = detectExpenseGroup(all[0] as never, all as never);
    expect(r.isGroup).toBe(false);
    expect(r.groupName).toBeNull();
    expect(r.siblings).toHaveLength(1);
  });

  it('parcela removida do grupo (loja saiu) re-detecta o grupo menor', () => {
    // "Todas" editado para Piracicaba: Premium excluída, sobram 3
    const all = [
      mk('1', 'Dom Pedro II'), mk('2', 'Realme'), mk('3', 'Xv de Novembro'),
      mk('4', 'Premium', { deleted: true }),
    ];
    const r = detectExpenseGroup(all[0] as never, all as never);
    expect(r.groupName).toBe('Piracicaba (DP - Realme - XV)');
  });
});
