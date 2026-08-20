import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useExpenses, isGroupStore, detectExpenseGroup } from './useExpenses';
import { addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy } from 'firebase/firestore';
import type { User } from 'firebase/auth';

// Mock do Firebase
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  doc: vi.fn(() => ({ id: 'mock-doc' })),
  query: vi.fn(),
  where: vi.fn(),
  onSnapshot: vi.fn(),
  orderBy: vi.fn(),
  getDocs: vi.fn(),
  serverTimestamp: vi.fn(() => new Date())
}));

vi.mock('@/config/firebase', () => ({
  getFirebaseRefs: vi.fn(() => ({
    expensesRef: {}
  }))
}));

describe('useExpenses', () => {
  const mockUser: User = {
    uid: 'test-uid',
    email: null,
    displayName: null,
    photoURL: null,
    emailVerified: false,
    isAnonymous: true,
    providerId: 'anonymous',
    tenantId: null,
    metadata: {},
    refreshToken: '',
    delete: () => Promise.resolve(),
    getIdToken: () => Promise.resolve(''),
    getIdTokenResult: () => Promise.resolve({
      token: '',
      authTime: '',
      issuedAtTime: '',
      expirationTime: '',
      signInProvider: '',
      signInSecondFactor: null,
      claims: {}
    }),
    toJSON: () => ({}),
    updateProfile: () => Promise.resolve()
  } as any;

  const mockExpenses = [
    {
      id: '1',
      description: 'Aluguel',
      amount: 1500,
      category: 'Despesa Fixa',
      store: 'Piracicaba (DP - Realme - XV)',
      date: '2024-01-15',
      quantity: 1,
      employeeName: 'João',
      createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
    },
    {
      id: '2',
      description: 'Energia',
      amount: 200,
      category: 'Despesa',
      store: 'Amparo (Premium - Kassouf)',
      date: '2024-01-10',
      quantity: 1,
      employeeName: 'Maria',
      createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    // Configure onSnapshot to always return a function
    (onSnapshot as any).mockImplementation(() => vi.fn());
  });

  it('deve inicializar com isLoading true e syncStatus syncing', () => {
    const { result } = renderHook(() => useExpenses(mockUser));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.syncStatus).toBe('syncing');
    expect(result.current.expenses).toEqual([]);
  });

  it('deve carregar despesas com sucesso', async () => {
    let snapshotCallback: ((snapshot: any) => void) | null = null;

    (onSnapshot as any).mockImplementation((_query: any, callback: any, _errorCallback: any) => {
      snapshotCallback = callback;
      return vi.fn(); // Return a mock function instead of undefined
    });

    const { result } = renderHook(() => useExpenses(mockUser));

    const mockSnapshot = {
      docs: mockExpenses.map(exp => ({
        id: exp.id,
        data: () => exp
      }))
    };

    act(() => {
      if (snapshotCallback) snapshotCallback(mockSnapshot);
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.syncStatus).toBe('synced');
    expect(result.current.expenses).toEqual(mockExpenses);
  });

  it('deve adicionar despesa com sucesso', async () => {
    const mockDocRef = { id: '3' };
    (addDoc as any).mockResolvedValue(mockDocRef);

    const { result } = renderHook(() => useExpenses(mockUser));

    const newExpense = {
      description: 'Internet',
      amount: 100,
      category: 'Despesa',
      store: 'Piracicaba (DP - Realme - XV)',
      date: '2024-01-20',
      quantity: 1,
      employeeName: 'Pedro'
    };

    await act(async () => {
      await result.current.addExpense(newExpense);
    });

    expect(addDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        ...newExpense,
        createdAt: expect.any(Object)
      })
    );
  });

  it('deve atualizar despesa com sucesso', async () => {
    (updateDoc as any).mockResolvedValue(undefined);

    const { result } = renderHook(() => useExpenses(mockUser));

    await act(async () => {
      await result.current.updateExpense('1', { amount: 1600 });
    });

    expect(updateDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        amount: 1600
      })
    );
  });

  it('deve realizar soft-delete de despesa dentro de 24h', async () => {
    let snapshotCallback: ((snapshot: any) => void) | null = null;

    (onSnapshot as any).mockImplementation((_query: any, callback: any) => {
      snapshotCallback = callback;
      return () => { };
    });

    (updateDoc as any).mockResolvedValue(undefined);

    const { result } = renderHook(() => useExpenses(mockUser));

    const mockSnapshot = {
      docs: [mockExpenses[0]].map(exp => ({
        id: exp.id,
        data: () => exp
      }))
    };

    act(() => {
      if (snapshotCallback) snapshotCallback(mockSnapshot);
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.deleteExpense('1', 'Motivo de teste', 'Administrador');
    });

    expect(updateDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        deleted: true,
        deleteReason: 'Motivo de teste',
        deletedBy: 'Administrador'
      })
    );
  });

  it('deve realizar hard-delete definitivo de despesa', async () => {
    let snapshotCallback: ((snapshot: any) => void) | null = null;

    (onSnapshot as any).mockImplementation((_query: any, callback: any) => {
      snapshotCallback = callback;
      return () => { };
    });

    (deleteDoc as any).mockResolvedValue(undefined);

    const { result } = renderHook(() => useExpenses(mockUser));

    const mockSnapshot = {
      docs: [mockExpenses[0]].map(exp => ({
        id: exp.id,
        data: () => exp
      }))
    };

    act(() => {
      if (snapshotCallback) snapshotCallback(mockSnapshot);
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.hardDeleteExpense('1');
    });

    expect(deleteDoc).toHaveBeenCalled();
  });

  it('deve verificar que pode excluir despesa dentro de 24h', async () => {
    let snapshotCallback: ((snapshot: any) => void) | null = null;

    (onSnapshot as any).mockImplementation((_query: any, callback: any) => {
      snapshotCallback = callback;
      return () => { };
    });

    const { result } = renderHook(() => useExpenses(mockUser));

    const mockSnapshot = {
      docs: [mockExpenses[0]].map(exp => ({
        id: exp.id,
        data: () => exp
      }))
    };

    act(() => {
      if (snapshotCallback) snapshotCallback(mockSnapshot);
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const { allowed, reason } = result.current.canDelete('1');

    expect(allowed).toBe(true);
    expect(reason).toBeUndefined();
  });

  it('deve verificar que não pode excluir despesa após 24h', async () => {
    let snapshotCallback: ((snapshot: any) => void) | null = null;

    (onSnapshot as any).mockImplementation((_query: any, callback: any) => {
      snapshotCallback = callback;
      return () => { };
    });

    const { result } = renderHook(() => useExpenses(mockUser));

    const mockSnapshot = {
      docs: [mockExpenses[1]].map(exp => ({
        id: exp.id,
        data: () => exp
      }))
    };

    act(() => {
      if (snapshotCallback) snapshotCallback(mockSnapshot);
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const { allowed, reason } = result.current.canDelete('2');

    expect(allowed).toBe(false);
    expect(reason).toBeDefined();
  });

  it('deve retornar syncStatus error quando ocorre erro', async () => {
    let snapshotCallback: ((snapshot: any) => void) | null = null;
    let errorCallback: ((error: any) => void) | null = null;

    (onSnapshot as any).mockImplementation((_query: any, callback: any, errCallback: any) => {
      snapshotCallback = callback;
      errorCallback = errCallback;
      return () => { };
    });

    const { result } = renderHook(() => useExpenses(mockUser));

    act(() => {
      if (errorCallback) {
        const error = new Error('Test error');
        errorCallback(error);
      }
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.syncStatus).toBe('error');
  });

  it('deve não carregar despesas quando user é null', () => {
    const { result } = renderHook(() => useExpenses(null));

    expect(result.current.expenses).toEqual([]);
    expect(onSnapshot).not.toHaveBeenCalled();
  });
});

describe('detectExpenseGroup & isGroupStore', () => {
  it('deve identificar isGroupStore corretamente', () => {
    expect(isGroupStore('Todas')).toBe(true);
    expect(isGroupStore('Piracicaba (DP - Realme - XV)')).toBe(true);
    expect(isGroupStore('Amparo (Premium - Kassouf)')).toBe(true);
    expect(isGroupStore('Dom Pedro II')).toBe(false);
  });

  it('deve detectar grupo "Todas" com 5 lojas irmãs', () => {
    const allExpenses = [
      { id: '1', date: '2026-08-20', description: 'Internet Fibra', category: 'Despesa', store: 'Dom Pedro II', amount: 100, originalTotal: 500 },
      { id: '2', date: '2026-08-20', description: 'Internet Fibra', category: 'Despesa', store: 'Realme', amount: 100, originalTotal: 500 },
      { id: '3', date: '2026-08-20', description: 'Internet Fibra', category: 'Despesa', store: 'Xv de Novembro', amount: 100, originalTotal: 500 },
      { id: '4', date: '2026-08-20', description: 'Internet Fibra', category: 'Despesa', store: 'Premium', amount: 100, originalTotal: 500 },
      { id: '5', date: '2026-08-20', description: 'Internet Fibra', category: 'Despesa', store: 'Kassouf', amount: 100, originalTotal: 500 },
    ];

    const result = detectExpenseGroup(allExpenses[0] as any, allExpenses as any);
    expect(result.isGroup).toBe(true);
    expect(result.groupName).toBe('Todas');
    expect(result.totalAmount).toBe(500);
    expect(result.siblings.length).toBe(5);
  });

  it('deve detectar grupo "Piracicaba" com 3 lojas irmãs', () => {
    const allExpenses = [
      { id: '1', date: '2026-08-20', description: 'Limpeza Pira', category: 'Despesa', store: 'Dom Pedro II', amount: 100 },
      { id: '2', date: '2026-08-20', description: 'Limpeza Pira', category: 'Despesa', store: 'Realme', amount: 100 },
      { id: '3', date: '2026-08-20', description: 'Limpeza Pira', category: 'Despesa', store: 'Xv de Novembro', amount: 100 },
    ];

    const result = detectExpenseGroup(allExpenses[1] as any, allExpenses as any);
    expect(result.isGroup).toBe(true);
    expect(result.groupName).toBe('Piracicaba (DP - Realme - XV)');
    expect(result.totalAmount).toBe(300);
    expect(result.siblings.length).toBe(3);
  });

  it('deve detectar grupo "Amparo" com 2 lojas irmãs', () => {
    const allExpenses = [
      { id: '1', date: '2026-08-20', description: 'Manutenção Amparo', category: 'Despesa', store: 'Premium', amount: 150 },
      { id: '2', date: '2026-08-20', description: 'Manutenção Amparo', category: 'Despesa', store: 'Kassouf', amount: 150 },
    ];

    const result = detectExpenseGroup(allExpenses[0] as any, allExpenses as any);
    expect(result.isGroup).toBe(true);
    expect(result.groupName).toBe('Amparo (Premium - Kassouf)');
    expect(result.totalAmount).toBe(300);
    expect(result.siblings.length).toBe(2);
  });

  it('deve retornar não-grupo para despesa individual', () => {
    const allExpenses = [
      { id: '1', date: '2026-08-20', description: 'Material Exclusivo', category: 'Despesa', store: 'Dom Pedro II', amount: 75 }
    ];

    const result = detectExpenseGroup(allExpenses[0] as any, allExpenses as any);
    expect(result.groupName).toBeNull();
    expect(result.totalAmount).toBe(75);
    expect(result.siblings.length).toBe(1);
  });
});

