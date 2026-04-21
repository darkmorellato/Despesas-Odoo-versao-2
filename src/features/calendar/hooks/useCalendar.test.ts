import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useCalendar } from './useCalendar';
import { onSnapshot, setDoc } from 'firebase/firestore';
import { getFixedPayments } from '@/features/fixed-payments/hooks/useFixedPayments';
import type { User } from 'firebase/auth';

vi.mock('@/features/fixed-payments/hooks/useFixedPayments', () => ({
  getFixedPayments: vi.fn(() => [])
}));

vi.mock('firebase/firestore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('firebase/firestore')>();
  return {
    ...actual,
    onSnapshot: vi.fn(() => vi.fn()),
    setDoc: vi.fn()
  };
});

describe('useCalendar', () => {
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

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('deve inicializar com loading true quando há usuário', () => {
    const { result } = renderHook(() => useCalendar(mockUser));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.checks).toEqual({});
  });

  it('deve inicializar com loading false quando não há usuário', () => {
    const { result } = renderHook(() => useCalendar(null));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.checks).toEqual({});
  });

  it('deve carregar checks do Firebase', async () => {
    const mockChecks = {
      '2024-0-Aluguel': true,
      '2024-0-Energia': false
    };

    vi.mocked(onSnapshot).mockImplementation((ref: any, cb: any) => {
      cb({
        exists: () => true,
        data: () => ({ checks: mockChecks })
      });
      return vi.fn();
    });

    const { result } = renderHook(() => useCalendar(mockUser));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.checks).toEqual(mockChecks);
  });

  it('deve usar checks vazios quando documento não existe', async () => {
    vi.mocked(onSnapshot).mockImplementation((ref: any, cb: any) => {
      cb({
        exists: () => false
      });
      return vi.fn();
    });

    const { result } = renderHook(() => useCalendar(mockUser));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.checks).toEqual({});
  });

  it('deve tratar erro ao carregar checks', async () => {
    vi.mocked(onSnapshot).mockImplementation((ref: any, cb: any, errCb: any) => {
      errCb(new Error('Load failed'));
      return vi.fn();
    });

    const { result } = renderHook(() => useCalendar(mockUser));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.checks).toEqual({});
  });

  it('deve toggle check', () => {
    const { result } = renderHook(() => useCalendar(mockUser));

    act(() => {
      result.current.toggleCheck('2024-0-Aluguel', true);
    });

    expect(result.current.checks['2024-0-Aluguel']).toBe(true);
  });

  it('deve toggle check para false', () => {
    const { result } = renderHook(() => useCalendar(mockUser));

    act(() => {
      result.current.toggleCheck('2024-0-Aluguel', false);
    });

    expect(result.current.checks['2024-0-Aluguel']).toBe(false);
  });

  it('deve obter pagamentos pendentes', () => {
    const mockFixedPayments = [
      { id: '1', day: 10, description: 'Aluguel' },
      { id: '2', day: 15, description: 'Energia' }
    ];

    (getFixedPayments as any).mockReturnValue(mockFixedPayments);

    const { result } = renderHook(() => useCalendar(mockUser));

    const pendingPayments = result.current.getPendingPayments(mockFixedPayments);

    expect(pendingPayments).toBeDefined();
    expect(Array.isArray(pendingPayments)).toBe(true);
  });

  it('deve salvar checks no Firebase após delay', async () => {
    vi.mocked(onSnapshot).mockImplementation((ref: any, cb: any) => {
      cb({ exists: () => false });
      return vi.fn();
    });

    (setDoc as any).mockResolvedValue(undefined);

    const { result } = renderHook(() => useCalendar(mockUser));

    expect(result.current.isLoading).toBe(false);

    vi.useFakeTimers();

    act(() => {
      result.current.toggleCheck('2024-0-Aluguel', true);
    });

    act(() => {
      vi.advanceTimersByTime(800);
    });

    expect(setDoc).toHaveBeenCalled();
    vi.useRealTimers();
  });
});
