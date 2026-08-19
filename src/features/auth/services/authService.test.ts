import { describe, it, expect, beforeEach, vi } from 'vitest';
import { authenticateUser, INITIAL_DATABASE_USERS, logoutUser, getStoredUserSession } from './authService';

vi.mock('@/config/firebase', () => ({
  db: {},
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn().mockResolvedValue({ exists: () => false }),
  getDocs: vi.fn().mockResolvedValue({ empty: true, docs: [] }),
  setDoc: vi.fn().mockResolvedValue(undefined),
  query: vi.fn(),
  where: vi.fn(),
  serverTimestamp: vi.fn()
}));

describe('authService', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('deve autenticar com sucesso o usuário Abner Morais', async () => {
    const user = await authenticateUser({
      email: 'miplaceabner@miplace.com',
      password: '#Banana@343390'
    });

    expect(user.name).toBe('Abner Morais');
    expect(user.email).toBe('miplaceabner@miplace.com');
    expect(getStoredUserSession()?.name).toBe('Abner Morais');
  });

  it('deve autenticar com sucesso o usuário Dark Morellato', async () => {
    const user = await authenticateUser({
      email: 'darkmorelato@miplace.com',
      password: '#Ark343390'
    });

    expect(user.name).toBe('Dark Morellato');
    expect(user.email).toBe('darkmorelato@miplace.com');
    expect(getStoredUserSession()?.name).toBe('Dark Morellato');
  });

  it('deve rejeitar senha incorreta', async () => {
    await expect(authenticateUser({
      email: 'miplaceabner@miplace.com',
      password: 'senha_errada'
    })).rejects.toThrow('Senha incorreta.');
  });

  it('deve rejeitar usuário inexistente', async () => {
    await expect(authenticateUser({
      email: 'desconhecido@miplace.com',
      password: 'qualquer_senha'
    })).rejects.toThrow('Usuário não encontrado.');
  });

  it('deve limpar sessão no logout', async () => {
    await authenticateUser({
      email: 'darkmorelato@miplace.com',
      password: '#Ark343390'
    });

    expect(getStoredUserSession()).not.toBeNull();
    logoutUser();
    expect(getStoredUserSession()).toBeNull();
  });
});
