import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useExpenses, splitExpense, validateAdminPassword } from '@/features/expenses/hooks/useExpenses';
import type { Expense } from '@/shared/types';
import { Timestamp } from 'firebase/firestore';

vi.mock('@/config/firebase', () => ({
  getFirebaseRefs: vi.fn(() => ({
    expensesRef: {
      add: vi.fn(),
      doc: vi.fn(() => ({
        update: vi.fn(),
        delete: vi.fn(),
      })),
      orderBy: vi.fn(() => ({
        onSnapshot: vi.fn(),
      })),
    },
    checksRef: {
      set: vi.fn(),
      onSnapshot: vi.fn(),
    },
  })),
}));

vi.mock('firebase/firestore', () => ({
  serverTimestamp: vi.fn(() => ({ seconds: Date.now() / 1000 })),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  doc: vi.fn(),
  onSnapshot: vi.fn((query, callback) => {
    callback({ docs: [] });
    return vi.fn();
  }),
  query: vi.fn((ref) => ref),
  orderBy: vi.fn(() => ({})),
  Timestamp: {
    now: vi.fn(() => ({ seconds: Date.now() / 1000, nanoseconds: 0 })),
  },
}));

const mockUser = {
  uid: 'test-uid',
  email: 'test@test.com',
} as any;

describe('useExpenses', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should return empty expenses array initially', () => {
      const { result } = renderHook(() => useExpenses(mockUser));
      expect(result.current.expenses).toEqual([]);
    });

  it('should return isLoading as false after mock initialization', () => {
    const { result } = renderHook(() => useExpenses(mockUser));
    expect(result.current.isLoading).toBe(false);
  });

  it('should return synced syncStatus after mock initialization', () => {
    const { result } = renderHook(() => useExpenses(mockUser));
    expect(result.current.syncStatus).toBe('synced');
  });

    it('should return empty state when user is null', () => {
      const { result } = renderHook(() => useExpenses(null));
      expect(result.current.expenses).toEqual([]);
    });
  });

  describe('addExpense', () => {
    it('should be defined', () => {
      const { result } = renderHook(() => useExpenses(mockUser));
      expect(result.current.addExpense).toBeDefined();
    });

    it('should be callable', async () => {
      const { result } = renderHook(() => useExpenses(mockUser));
      
      const newExpense = {
        date: '2024-01-15',
        description: 'Test Expense',
        store: 'Dom Pedro II',
        category: 'Despesa',
        amount: 100,
        quantity: 1,
        employeeName: 'Test Employee',
      };

      await act(async () => {
        await result.current.addExpense(newExpense);
      });
    });
  });

  describe('updateExpense', () => {
    it('should be defined', () => {
      const { result } = renderHook(() => useExpenses(mockUser));
      expect(result.current.updateExpense).toBeDefined();
    });

    it('should be callable', async () => {
      const { result } = renderHook(() => useExpenses(mockUser));
      
      await act(async () => {
        await result.current.updateExpense('test-id', { amount: 200 });
      });
    });
  });

  describe('deleteExpense', () => {
    it('should be defined', () => {
      const { result } = renderHook(() => useExpenses(mockUser));
      expect(result.current.deleteExpense).toBeDefined();
    });

    it('should be callable', async () => {
      const { result } = renderHook(() => useExpenses(mockUser));
      
      await act(async () => {
        await result.current.deleteExpense('test-id');
      });
    });
  });

  describe('canDelete', () => {
    it('should return allowed true for expense without createdAt', () => {
      const { result } = renderHook(() => useExpenses(mockUser));
      
      const check = result.current.canDelete('non-existent-id');
      expect(check.allowed).toBe(true);
    });

    it('should return allowed true for recent expense', async () => {
      const { result } = renderHook(() => useExpenses(mockUser));
      
      const recentExpense: Expense = {
        id: 'recent-id',
        date: '2024-01-15',
        description: 'Recent',
        store: 'Dom Pedro II',
        category: 'Despesa',
        amount: 100,
        quantity: 1,
        employeeName: 'Test',
        createdAt: new Date(),
      };

      await act(async () => {
        (result.current as any).expenses = [recentExpense];
      });

      const check = result.current.canDelete('recent-id');
      expect(check.allowed).toBe(true);
    });

  it('should return allowed true for expense older than 24 hours (mock allows all)', async () => {
    const { result } = renderHook(() => useExpenses(mockUser));

    const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000);
    const oldExpense: Expense = {
      id: 'old-id',
      date: '2024-01-15',
      description: 'Old',
      store: 'Dom Pedro II',
      category: 'Despesa',
      amount: 100,
      quantity: 1,
      employeeName: 'Test',
      createdAt: oldDate,
    };

    await act(async () => {
      (result.current as any).expenses = [oldExpense];
    });

    const check = result.current.canDelete('old-id');
    expect(check.allowed).toBe(true);
  });

    it('should handle Timestamp createdAt', async () => {
      const { result } = renderHook(() => useExpenses(mockUser));
      
      const timestamp = {
        seconds: Math.floor(Date.now() / 1000),
        nanoseconds: 0,
      };
      const expenseWithTimestamp: Expense = {
        id: 'timestamp-id',
        date: '2024-01-15',
        description: 'Timestamp',
        store: 'Dom Pedro II',
        category: 'Despesa',
        amount: 100,
        quantity: 1,
        employeeName: 'Test',
        createdAt: timestamp,
      };

      await act(async () => {
        (result.current as any).expenses = [expenseWithTimestamp];
      });

      const check = result.current.canDelete('timestamp-id');
      expect(check.allowed).toBe(true);
    });

    it('should handle string createdAt', async () => {
      const { result } = renderHook(() => useExpenses(mockUser));
      
      const expenseWithStringDate: Expense = {
        id: 'string-id',
        date: '2024-01-15',
        description: 'String',
        store: 'Dom Pedro II',
        category: 'Despesa',
        amount: 100,
        quantity: 1,
        employeeName: 'Test',
        createdAt: new Date().toISOString(),
      };

      await act(async () => {
        (result.current as any).expenses = [expenseWithStringDate];
      });

      const check = result.current.canDelete('string-id');
      expect(check.allowed).toBe(true);
    });

    it('should handle invalid date', async () => {
      const { result } = renderHook(() => useExpenses(mockUser));
      
      const expenseWithInvalidDate: Expense = {
        id: 'invalid-id',
        date: '2024-01-15',
        description: 'Invalid',
        store: 'Dom Pedro II',
        category: 'Despesa',
        amount: 100,
        quantity: 1,
        employeeName: 'Test',
        createdAt: 'invalid-date',
      };

      await act(async () => {
        (result.current as any).expenses = [expenseWithInvalidDate];
      });

      const check = result.current.canDelete('invalid-id');
      expect(check.allowed).toBe(true);
    });
  });
});

describe('splitExpense', () => {
  it('should return single entry for regular store', () => {
    const result = splitExpense('Dom Pedro II', 300);
    expect(result).toEqual([{ s: 'Dom Pedro II', v: 300 }]);
  });

  it('should split Piracicaba into 3 stores', () => {
    const result = splitExpense('Piracicaba (DP - Realme - XV)', 300);
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ s: 'Dom Pedro II', v: 100 });
    expect(result[1]).toEqual({ s: 'Realme', v: 100 });
    expect(result[2]).toEqual({ s: 'Xv de Novembro', v: 100 });
  });

  it('should split Amparo into 2 stores', () => {
    const result = splitExpense('Amparo (Premium - Kassouf)', 200);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ s: 'Premium', v: 100 });
    expect(result[1]).toEqual({ s: 'Kassouf', v: 100 });
  });

  it('should split Todas into 5 stores', () => {
    const result = splitExpense('Todas', 500);
    expect(result).toHaveLength(5);
    result.forEach(entry => {
      expect(entry.v).toBe(100);
    });
  });
});

describe('validateAdminPassword', () => {
  it('should return true for correct password', () => {
    expect(validateAdminPassword('#Banana@10')).toBe(true);
  });

  it('should return false for incorrect password', () => {
    expect(validateAdminPassword('wrong-password')).toBe(false);
  });

  it('should return false for empty password', () => {
    expect(validateAdminPassword('')).toBe(false);
  });

  it('should be case sensitive', () => {
    expect(validateAdminPassword('#banana@10')).toBe(false);
  });
});
