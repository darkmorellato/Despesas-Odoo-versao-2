import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAuth } from './useAuth';
import { signOut, onAuthStateChanged } from '@/config/firebase';

vi.mock('@/config/firebase', () => ({
  auth: { currentUser: null },
  signOut: vi.fn().mockResolvedValue(undefined),
  onAuthStateChanged: vi.fn(() => vi.fn()),
}));

type AuthCb = (user: unknown) => void;

/** Captura o callback registrado pelo hook para disparar mudanças de sessão. */
const captureAuthCallback = () => {
  let cb: AuthCb | null = null;
  vi.mocked(onAuthStateChanged).mockImplementation(((_auth: unknown, callback: AuthCb) => {
    cb = callback;
    return () => { };
  }) as never);
  return (user: unknown) => act(() => { cb?.(user); });
};

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('começa offline, sem usuário e sem estado inicial resolvido', () => {
    captureAuthCallback();
    const { result } = renderHook(() => useAuth());

    expect(result.current.syncStatus).toBe('offline');
    expect(result.current.user).toBeNull();
    expect(result.current.authReady).toBe(false);
  });

  it('nunca faz login anônimo por conta própria', () => {
    captureAuthCallback();
    renderHook(() => useAuth());
    expect(signOut).not.toHaveBeenCalled();
  });

  it('reflete a sessão de e-mail/senha como sincronizada', () => {
    const emit = captureAuthCallback();
    const { result } = renderHook(() => useAuth());
    const realUser = { uid: 'u1', email: 'a@miplace.com', isAnonymous: false };

    emit(realUser);

    expect(result.current.user).toEqual(realUser);
    expect(result.current.syncStatus).toBe('synced');
    expect(result.current.authReady).toBe(true);
  });

  it('sem sessão: authReady fica true e user null (app volta ao login)', () => {
    const emit = captureAuthCallback();
    const { result } = renderHook(() => useAuth());

    emit(null);

    expect(result.current.user).toBeNull();
    expect(result.current.syncStatus).toBe('offline');
    expect(result.current.authReady).toBe(true);
  });

  it('descarta sessão anônima legada (signOut) e não a expõe como usuário', () => {
    const emit = captureAuthCallback();
    const { result } = renderHook(() => useAuth());

    emit({ uid: 'anon', isAnonymous: true });

    expect(signOut).toHaveBeenCalledTimes(1);
    expect(result.current.user).toBeNull();
    expect(result.current.authReady).toBe(true);
  });

  it('logout posterior zera o usuário', () => {
    const emit = captureAuthCallback();
    const { result } = renderHook(() => useAuth());

    emit({ uid: 'u1', isAnonymous: false });
    expect(result.current.user).not.toBeNull();
    emit(null);
    expect(result.current.user).toBeNull();
    expect(result.current.syncStatus).toBe('offline');
  });

  it('cancela a inscrição ao desmontar', () => {
    const unsub = vi.fn();
    vi.mocked(onAuthStateChanged).mockImplementation((() => unsub) as never);
    const { unmount } = renderHook(() => useAuth());
    unmount();
    expect(unsub).toHaveBeenCalled();
  });
});
