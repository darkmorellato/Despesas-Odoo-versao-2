import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App from './App';
import { onAuthStateChanged } from '@/config/firebase';

// Fumaça de integração: o App monta com todos os hooks extraídos conectados.
// (Firebase já é simulado em src/__tests__/setup.ts.)
vi.mock('@/features/auth', async (orig) => ({
  ...(await orig<typeof import('@/features/auth')>()),
  logoutUser: vi.fn().mockResolvedValue(undefined),
}));

const SESSION_KEY = 'miplace_auth_session_user';
const emitAuth = (user: unknown) => {
  vi.mocked(onAuthStateChanged).mockImplementation(((_a: unknown, cb: (u: unknown) => void) => {
    cb(user);
    return vi.fn();
  }) as never);
};

describe('App (fumaça)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('sem sessão: mostra a tela de login', () => {
    emitAuth(null);
    render(<App />);
    expect(screen.getByText('Acesso Restrito a Usuários Autorizados')).toBeInTheDocument();
  });

  it('com sessão e Firebase autenticado: monta o painel com a barra lateral', async () => {
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      id: 'u1', name: 'Dark Morellato', email: 'darkmorelato@miplace.com', role: 'Administrador',
    }));
    emitAuth({ uid: 'u1', isAnonymous: false, email: 'darkmorelato@miplace.com' });

    render(<App />);

    await waitFor(() => expect(screen.getByText('Visão Geral')).toBeInTheDocument());
    expect(screen.getByText('Dark Morellato')).toBeInTheDocument();
    // admin enxerga a aba de auditoria
    expect(screen.getByText('Registros')).toBeInTheDocument();
  });

  it('sessão salva mas Firebase sem usuário (expirou): volta ao login', async () => {
    const { logoutUser } = await import('@/features/auth');
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      id: 'u1', name: 'Dark', email: 'dark@miplace.com',
    }));
    emitAuth(null);

    render(<App />);

    await waitFor(() => expect(logoutUser).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByText('Acesso Restrito a Usuários Autorizados')).toBeInTheDocument());
  });
});
