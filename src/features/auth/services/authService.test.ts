import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  authenticateUser,
  validateAnyAdminPassword,
  logoutUser,
  getStoredUserSession,
} from './authService';
import { getDocs, getDoc } from 'firebase/firestore';
import { signInWithEmailAndPassword, signOut } from '@/config/firebase';

vi.mock('@/config/firebase', () => ({
  auth: {},
  db: {},
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn().mockResolvedValue(undefined),
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
    beforeEach(() => {
      vi.mocked(signInWithEmailAndPassword).mockResolvedValue({ user: { uid: 'u' } } as never);
    });

    it('autentica no Firebase Auth e carrega o perfil do Firestore', async () => {
      vi.mocked(getDocs).mockResolvedValueOnce(usersSnapshot([
        {
          id: 'user_abner_morais',
          data: { email: 'miplaceabner@miplace.com', name: 'Abner Morais', role: 'Administrador' },
        },
      ]) as never);

      const user = await authenticateUser({
        email: ' MiplaceAbner@Miplace.com ',
        password: ' senha-secreta-123 ',
      });

      // e-mail normalizado e senha aparada antes de ir ao Firebase
      expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
        expect.anything(), 'miplaceabner@miplace.com', 'senha-secreta-123'
      );
      expect(user.id).toBe('user_abner_morais');
      expect(user.name).toBe('Abner Morais');
      expect(user.role).toBe('Administrador');
      expect(getStoredUserSession()?.name).toBe('Abner Morais');
    });

    it.each([
      ['auth/invalid-credential', 'E-mail ou senha incorretos.'],
      ['auth/wrong-password', 'E-mail ou senha incorretos.'],
      ['auth/user-not-found', 'E-mail ou senha incorretos.'],
      ['auth/too-many-requests', 'Muitas tentativas'],
      ['auth/network-request-failed', 'Verifique sua conexão'],
      ['auth/algo-inesperado', 'Não foi possível entrar'],
    ])('traduz o erro %s', async (code, message) => {
      vi.mocked(signInWithEmailAndPassword).mockRejectedValueOnce(
        Object.assign(new Error('firebase'), { code })
      );

      await expect(
        authenticateUser({ email: 'a@miplace.com', password: 'x' })
      ).rejects.toThrow(message);
      expect(getStoredUserSession()).toBeNull();
      expect(getDocs).not.toHaveBeenCalled();
    });

    it('não revela se o e-mail existe (mesma mensagem para senha errada e usuário inexistente)', async () => {
      vi.mocked(signInWithEmailAndPassword)
        .mockRejectedValueOnce(Object.assign(new Error('x'), { code: 'auth/wrong-password' }))
        .mockRejectedValueOnce(Object.assign(new Error('x'), { code: 'auth/user-not-found' }));

      const a = await authenticateUser({ email: 'a@miplace.com', password: 'x' }).catch(e => e.message);
      const b = await authenticateUser({ email: 'b@miplace.com', password: 'x' }).catch(e => e.message);
      expect(a).toBe(b);
    });

    it('login funciona mesmo se o perfil estiver inacessível (usa o e-mail como nome)', async () => {
      vi.mocked(getDocs).mockRejectedValueOnce(new Error('permission-denied'));

      const user = await authenticateUser({ email: 'alguem@miplace.com', password: 'x' });
      expect(user.name).toBe('alguem@miplace.com');
      expect(user.id).toBe('alguem@miplace.com');
    });

    it('não inventa identidade: sem `name` no doc usa o e-mail', async () => {
      vi.mocked(getDocs).mockResolvedValueOnce(usersSnapshot([
        { id: 'u_novo', data: { email: 'novo@miplace.com' } },
      ]) as never);

      const user = await authenticateUser({ email: 'novo@miplace.com', password: 'abc123' });
      expect(user.name).toBe('novo@miplace.com');
    });

    it('valida e-mail/senha vazios sem chamar o Firebase', async () => {
      await expect(authenticateUser({ email: '  ', password: 'x' })).rejects.toThrow(
        'Informe o e-mail e a senha.'
      );
      expect(signInWithEmailAndPassword).not.toHaveBeenCalled();
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
    it('limpa a sessão local e desloga do Firebase', async () => {
      localStorage.setItem(
        'miplace_auth_session_user',
        JSON.stringify({ id: 'u1', name: 'A', email: 'a@b.com' })
      );
      expect(getStoredUserSession()).not.toBeNull();

      await logoutUser();
      expect(getStoredUserSession()).toBeNull();
      expect(signOut).toHaveBeenCalled();
    });

    it('limpa a sessão local mesmo se o signOut falhar', async () => {
      localStorage.setItem(
        'miplace_auth_session_user',
        JSON.stringify({ id: 'u1', name: 'A', email: 'a@b.com' })
      );
      vi.mocked(signOut).mockRejectedValueOnce(new Error('offline'));

      await logoutUser();
      expect(getStoredUserSession()).toBeNull();
    });
  });
});
