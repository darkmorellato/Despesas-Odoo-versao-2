import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAuth } from './useAuth';
import { auth, signInAnonymously, onAuthStateChanged } from '@/config/firebase';

vi.mock('@/config/firebase', () => ({
  auth: { currentUser: null },
  signInAnonymously: vi.fn(),
  onAuthStateChanged: vi.fn(() => vi.fn()),
}));
describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve inicializar com syncStatus offline', () => {
    const { result } = renderHook(() => useAuth());

    expect(result.current.syncStatus).toBe('offline');
    expect(result.current.user).toBeNull();
  });

  it('deve fazer login anônimo com sucesso', async () => {
    const mockUser = { uid: 'test-uid', email: null };
    vi.mocked(signInAnonymously).mockResolvedValue({ user: mockUser } as any);

    vi.mocked(onAuthStateChanged).mockImplementation((_auth, cb) => {
      (cb as any)(mockUser);
      return vi.fn();
    });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.syncStatus).toBe('synced');
    });

    expect(signInAnonymously).toHaveBeenCalled();
    expect(result.current.user).toEqual(mockUser);
  });

  it('deve tratar erro no login', async () => {
    vi.mocked(signInAnonymously).mockRejectedValue(new Error('Login failed'));

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.syncStatus).toBe('error');
    });

    expect(result.current.error).toBe('Erro ao conectar ao servidor.');
  });

  it('deve monitorar mudanças de autenticação', () => {
    const mockUser = { uid: 'test-uid', email: null };
    let authCallback: ((user: any) => void) | null = null;

    vi.mocked(onAuthStateChanged).mockImplementation((_auth: any, callback: any) => {
      authCallback = callback;
      return () => { };
    });

    const { result } = renderHook(() => useAuth());

    expect(onAuthStateChanged).toHaveBeenCalled();

    act(() => {
      if (authCallback) authCallback(mockUser);
    });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.syncStatus).toBe('synced');
  });
});
