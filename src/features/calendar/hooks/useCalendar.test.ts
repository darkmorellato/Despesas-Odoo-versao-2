import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useCalendar } from './useCalendar';
import { onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
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
    setDoc: vi.fn(),
    updateDoc: vi.fn()
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

  it('deve salvar checks no Firebase com uma única escrita (updateDoc)', async () => {
    vi.mocked(onSnapshot).mockImplementation((ref: any, cb: any) => {
      cb({ exists: () => false });
      return vi.fn();
    });

    (updateDoc as any).mockResolvedValue(undefined);

    const { result } = renderHook(() => useCalendar(mockUser));

    expect(result.current.isLoading).toBe(false);

    vi.useFakeTimers();

    act(() => {
      result.current.toggleCheck('2024-0-Aluguel', true);
    });

    act(() => {
      vi.advanceTimersByTime(800);
    });

    // Uma única escrita, atualizando somente o campo da chave alterada
    expect(setDoc).not.toHaveBeenCalled();
    expect(updateDoc).toHaveBeenCalledTimes(1);
    const updatePayload = (updateDoc as any).mock.calls[0][1];
    expect(updatePayload).toEqual({ 'checks.2024-0-Aluguel': true });
    vi.useRealTimers();
  });

  it('deve aplicar vários checks com uma única escrita (setManyChecks)', async () => {
    vi.mocked(onSnapshot).mockImplementation((ref: any, cb: any) => {
      cb({ exists: () => false });
      return vi.fn();
    });

    (updateDoc as any).mockResolvedValue(undefined);

    const { result } = renderHook(() => useCalendar(mockUser));

    act(() => {
      result.current.setManyChecks([
        { key: '2024-0-Aluguel', status: true },
        { key: '2024-0-Energia', status: true }
      ]);
    });

    expect(result.current.checks['2024-0-Aluguel']).toBe(true);
    expect(result.current.checks['2024-0-Energia']).toBe(true);
    expect(updateDoc).toHaveBeenCalledTimes(1);
    const updatePayload = (updateDoc as any).mock.calls[0][1];
    expect(updatePayload).toEqual({
      'checks.2024-0-Aluguel': true,
      'checks.2024-0-Energia': true
    });
  });

  it('escapa field path de chave com ponto (ex.: "Débito aut.")', async () => {
    vi.mocked(onSnapshot).mockImplementation((ref: any, cb: any) => {
      cb({ exists: () => false });
      return vi.fn();
    });

    (updateDoc as any).mockResolvedValue(undefined);

    const { result } = renderHook(() => useCalendar(mockUser));

    act(() => {
      result.current.toggleCheck('2026-0-Contrato Sr. Paulo Ltda.', true);
    });

    expect(updateDoc).toHaveBeenCalledTimes(1);
    const updatePayload = (updateDoc as any).mock.calls[0][1];
    // Segmento com ponto entre crases — sem o escape o Firestore rejeita
    // com "Invalid field path" (chaves legadas tipo "Débito aut.")
    expect(updatePayload).toEqual({ 'checks.`2026-0-Contrato Sr. Paulo Ltda.`': true });
  });
});
