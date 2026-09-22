import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  authenticateUser,
  validateAnyAdminPassword,
  logoutUser,
  getStoredUserSession,
} from './authService';
import { getDocs, getDoc } from 'firebase/firestore';

vi.mock('@/config/firebase', () => ({
  db: {},
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn((_parent?: unknown, ...ids: string[]) => ({ path: ids.join('/') })),
  doc: vi.fn((...args: unknown[]) => ({ path: args.map(String).join('/') })),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  setDoc: vi.fn().mockResolvedValue(undefined),
  deleteField: vi.fn(() => 'DELETE_FIELD'),
  query: vi.fn((...args: unknown[]) => ({ __query: args })),
  where: vi.fn((...args: unknown[]) => ({ __where: args })),
  serverTimestamp: vi.fn(() => 'SERVER_TS'),
}));

// Helper: monta um snapshot no formato do SDK a partir de docs simples
const usersSnapshot = (docs: Array<{ id: string; data: Record<string, unknown> }>) => ({
  empty: docs.length === 0,
  docs: docs.map(d => ({ id: d.id, data: () => d.data })),
});

describe('authService', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('authenticateUser', () => {
    it('autentica com sucesso (doc legado com senha em texto plano)', async () => {
      vi.mocked(getDocs).mockResolvedValueOnce(usersSnapshot([
        {
          id: 'user_abner_morais',
          data: {
            email: 'miplaceabner@miplace.com',
            name: 'Abner Morais',
            role: 'Administrador',
            password: 'senha-secreta-123',
          },
        },
      ]) as never);

      const user = await authenticateUser({
        email: 'miplaceabner@miplace.com',
        password: 'senha-secreta-123',
      });

      expect(user.name).toBe('Abner Morais');
      expect(user.email).toBe('miplaceabner@miplace.com');
      expect(user.role).toBe('Administrador');
      expect(getStoredUserSession()?.name).toBe('Abner Morais');
    });

    it('rejeita senha incorreta', async () => {
      vi.mocked(getDocs).mockResolvedValueOnce(usersSnapshot([
        {
          id: 'user_1',
          data: { email: 'miplaceabner@miplace.com', name: 'Abner', password: 'certa' },
        },
      ]) as never);

      await expect(
        authenticateUser({ email: 'miplaceabner@miplace.com', password: 'senha_errada' })
      ).rejects.toThrow('Senha incorreta.');
    });

    it('rejeita usuário inexistente', async () => {
      vi.mocked(getDocs).mockResolvedValueOnce(usersSnapshot([]) as never);

      await expect(
        authenticateUser({ email: 'desconhecido@miplace.com', password: 'qualquer' })
      ).rejects.toThrow('Usuário não encontrado.');
    });

    it('mensagem amigável quando o Firestore está inacessível (sem fallback offline)', async () => {
      vi.mocked(getDocs).mockRejectedValueOnce(new Error('Failed to fetch'));

      await expect(
        authenticateUser({ email: 'alguem@miplace.com', password: 'x' })
      ).rejects.toThrow('Não foi possível conectar ao servidor de autenticação');
    });

    it('não inventa identidade: sem `name` no doc usa o e-mail', async () => {
      vi.mocked(getDocs).mockResolvedValueOnce(usersSnapshot([
        { id: 'u_novo', data: { email: 'novo@miplace.com', password: 'abc123' } },
      ]) as never);

      const user = await authenticateUser({ email: 'novo@miplace.com', password: 'abc123' });

      expect(user.name).toBe('novo@miplace.com');
    });

    it('valida e-mail/senha vazios', async () => {
      await expect(authenticateUser({ email: '  ', password: 'x' })).rejects.toThrow(
        'Informe o e-mail e a senha.'
      );
      expect(getDocs).not.toHaveBeenCalled();
    });
  });

  describe('validateAnyAdminPassword', () => {
    it('retorna false para senha vazia sem consultar o Firestore', async () => {
      expect(await validateAnyAdminPassword('   ')).toBe(false);
      expect(getDocs).not.toHaveBeenCalled();
    });

    it('aceita a senha de um administrador (formato legado)', async () => {
      vi.mocked(getDoc).mockResolvedValueOnce({ exists: () => false } as never);
      vi.mocked(getDocs).mockResolvedValueOnce(usersSnapshot([
        {
          id: 'user_dark',
          data: {
            email: 'darkmorelato@miplace.com',
            role: 'Administrador',
            password: 'minha-senha-admin',
          },
        },
      ]) as never);

      expect(await validateAnyAdminPassword('minha-senha-admin')).toBe(true);
    });

    it('rejeita senha de administrador incorreta', async () => {
      vi.mocked(getDoc).mockResolvedValueOnce({ exists: () => false } as never);
      vi.mocked(getDocs).mockResolvedValueOnce(usersSnapshot([
        { id: 'user_dark', data: { role: 'Administrador', password: 'certa' } },
      ]) as never);

      expect(await validateAnyAdminPassword('errada')).toBe(false);
    });

    it('ignora usuários sem role de administrador', async () => {
      vi.mocked(getDoc).mockResolvedValueOnce({ exists: () => false } as never);
      vi.mocked(getDocs).mockResolvedValueOnce(usersSnapshot([
        { id: 'u_func', data: { role: 'Funcionario', password: 'senha-dela' } },
      ]) as never);

      expect(await validateAnyAdminPassword('senha-dela')).toBe(false);
    });

    it('neg por segurança quando o Firestore falha (nunca libera em erro)', async () => {
      vi.mocked(getDoc).mockRejectedValueOnce(new Error('rede fora') as never);
      vi.mocked(getDocs).mockRejectedValueOnce(new Error('rede fora') as never);

      expect(await validateAnyAdminPassword('qualquer-coisa')).toBe(false);
    });
  });

  describe('getStoredUserSession', () => {
    it('retorna null para JSON inválido', () => {
      localStorage.setItem('miplace_auth_session_user', '{invalid json');
      expect(getStoredUserSession()).toBeNull();
    });

    it('retorna null para sessão sem e-mail (shape inválido)', () => {
      localStorage.setItem('miplace_auth_session_user', JSON.stringify({ name: 'X' }));
      expect(getStoredUserSession()).toBeNull();
    });

    it('retorna a sessão válida', () => {
      localStorage.setItem(
        'miplace_auth_session_user',
        JSON.stringify({ id: 'u1', name: 'X', email: 'x@y.com' })
      );
      expect(getStoredUserSession()?.email).toBe('x@y.com');
    });
  });

  describe('logoutUser', () => {
    it('limpa a sessão no logout', async () => {
      vi.mocked(getDocs).mockResolvedValueOnce(usersSnapshot([
        { id: 'u1', data: { email: 'a@b.com', name: 'A', password: 'p' } },
      ]) as never);

      await authenticateUser({ email: 'a@b.com', password: 'p' });
      expect(getStoredUserSession()).not.toBeNull();

      logoutUser();
      expect(getStoredUserSession()).toBeNull();
    });
  });
});
