import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFixedPayments } from './useFixedPayments';
import { FIXED_NOTIFICATIONS_DEFAULT } from '@/config/constants';

const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  clear: vi.fn(),
  removeItem: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

const mockUser = {
  uid: 'test-user-id',
  isAnonymous: true,
};

vi.mock('@/config/firebase', () => ({
  getFirebaseRefs: () => ({
    fixedPaymentsRef: {}
  })
}));

import { onSnapshot, addDoc, setDoc, deleteDoc } from 'firebase/firestore';

vi.mock('firebase/firestore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('firebase/firestore')>();
  return {
    ...actual,
    onSnapshot: vi.fn(() => vi.fn()),
    addDoc: vi.fn(),
    setDoc: vi.fn(),
    deleteDoc: vi.fn(),
    doc: vi.fn(() => ({ id: 'mock-doc-id' })),
    serverTimestamp: vi.fn(() => new Date())
  };
});

describe('useFixedPayments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    localStorageMock.getItem.mockReturnValue(null);
  });

  it('deve carregar pagamentos fixos do localStorage', () => {
    const mockPayments = [
      { id: '1', day: 10, description: 'Aluguel' },
      { id: '2', day: 15, description: 'Energia' }
    ];

    localStorageMock.getItem.mockReturnValue(JSON.stringify(mockPayments));

    const { result } = renderHook(() => useFixedPayments(mockUser as any));

    expect(result.current.payments).toEqual(mockPayments);
  });

  it('deve usar pagamentos padrão quando localStorage está vazio', () => {
    localStorageMock.getItem.mockReturnValue(null);

    const { result } = renderHook(() => useFixedPayments(mockUser as any));

    expect(result.current.payments).toEqual([]);
  });

  it('deve adicionar pagamento fixo com dia válido', async () => {
    localStorageMock.getItem.mockReturnValue(JSON.stringify([]));

    const { result } = renderHook(() => useFixedPayments(mockUser as any));

    await act(async () => {
      await result.current.addPayment({
        day: 10,
        description: 'Novo pagamento'
      });
    });

    expect(result.current.payments).toHaveLength(1);

    const newPayment = result.current.payments.find(
      (p: any) => p.description === 'Novo pagamento'
    );

    expect(newPayment).toBeDefined();
    expect(newPayment?.day).toBe(10);
    expect(newPayment?.id).toBeDefined();

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'fixed_payments_v1',
      expect.any(String)
    );
  });

  it('deve atualizar pagamento fixo', async () => {
    const mockPayments = [
      { id: '1', day: 10, description: 'Aluguel' },
      { id: '2', day: 15, description: 'Energia' }
    ];

    localStorageMock.getItem.mockReturnValue(JSON.stringify(mockPayments));

    const { result } = renderHook(() => useFixedPayments(mockUser as any));

    await act(async () => {
      await result.current.updatePayment('1', {
        description: 'Aluguel Atualizado'
      });
    });

    const updatedPayment = result.current.payments.find(
      (p: any) => p.id === '1'
    );

    expect(updatedPayment?.description).toBe('Aluguel Atualizado');
    expect(updatedPayment?.day).toBe(10);

    expect(localStorageMock.setItem).toHaveBeenCalled();
  });

  it('deve atualizar dia do pagamento fixo', async () => {
    const mockPayments = [
      { id: '1', day: 10, description: 'Aluguel' }
    ];

    localStorageMock.getItem.mockReturnValue(JSON.stringify(mockPayments));

    const { result } = renderHook(() => useFixedPayments(mockUser as any));

    await act(async () => {
      await result.current.updatePayment('1', {
        day: 15
      });
    });

    const updatedPayment = result.current.payments.find(
      (p: any) => p.id === '1'
    );

    expect(updatedPayment?.day).toBe(15);
  });

  it('deve excluir pagamento fixo', async () => {
    const mockPayments = [
      { id: '1', day: 10, description: 'Aluguel' },
      { id: '2', day: 15, description: 'Energia' }
    ];

    localStorageMock.getItem.mockReturnValue(JSON.stringify(mockPayments));

    const { result } = renderHook(() => useFixedPayments(mockUser as any));

    await act(async () => {
      await result.current.deletePayment('1');
    });

    expect(result.current.payments).toHaveLength(1);
    expect(result.current.payments[0].id).toBe('2');

    expect(localStorageMock.setItem).toHaveBeenCalled();
  });

  it('deve obter pagamentos para dia específico', () => {
    const mockPayments = [
      { id: '1', day: 10, description: 'Aluguel' },
      { id: '2', day: 15, description: 'Energia' },
      { id: '3', day: 10, description: 'Internet' }
    ];

    localStorageMock.getItem.mockReturnValue(JSON.stringify(mockPayments));

    const { result } = renderHook(() => useFixedPayments(mockUser as any));

    const payments = result.current.getPaymentsByDay(10);

    expect(payments).toHaveLength(2);
    expect(payments.every((p: any) => p.day === 10)).toBe(true);
  });

  it('deve retornar array vazio quando não há pagamentos no dia', () => {
    const mockPayments = [
      { id: '1', day: 10, description: 'Aluguel' },
      { id: '2', day: 15, description: 'Energia' }
    ];

    localStorageMock.getItem.mockReturnValue(JSON.stringify(mockPayments));

    const { result } = renderHook(() => useFixedPayments(mockUser as any));

    const payments = result.current.getPaymentsByDay(20);

    expect(payments).toHaveLength(0);
  });

  it('deve obter dias únicos', () => {
    const mockPayments = [
      { id: '1', day: 10, description: 'Aluguel' },
      { id: '2', day: 15, description: 'Energia' },
      { id: '3', day: 10, description: 'Internet' }
    ];

    localStorageMock.getItem.mockReturnValue(JSON.stringify(mockPayments));

    const { result } = renderHook(() => useFixedPayments(mockUser as any));

    const uniqueDays = result.current.getUniqueDays();

    expect(uniqueDays).toEqual([10, 15]);
  });

  it('deve refresh pagamentos', () => {
    const mockPayments = [
      { id: '1', day: 10, description: 'Aluguel' }
    ];

    localStorageMock.getItem.mockReturnValue(JSON.stringify(mockPayments));

    const { result } = renderHook(() => useFixedPayments(mockUser as any));

    act(() => {
      result.current.refresh();
    });

    expect(result.current.payments).toEqual(mockPayments);
  });

  it('deve mostrar status offline quando não há usuário', () => {
    const { result } = renderHook(() => useFixedPayments(null));

    expect(result.current.syncStatus).toBe('offline');
  });

  it('deve mostrar status synced quando sincronizado', () => {
    vi.mocked(onSnapshot).mockImplementation((ref: any, callback: any) => {
      callback({
        docs: [{ id: 'mock-sync', data: () => ({ day: 1, description: 'Sync' }) }],
        forEach: vi.fn()
      });
      return vi.fn();
    });

    const { result } = renderHook(() => useFixedPayments(mockUser as any));

    expect(result.current.syncStatus).toBe('synced');
  });
});