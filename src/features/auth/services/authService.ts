import { db } from '@/config/firebase';
import { collection, doc, getDoc, getDocs, setDoc, query, where, serverTimestamp } from 'firebase/firestore';
import { ADMIN_PASSWORD } from '@/config/constants';
import type { AuthenticatedUser, UserCredentials } from '../types';

export const INITIAL_DATABASE_USERS = [
  {
    id: 'user_abner_morais',
    name: 'Abner Morais',
    email: 'miplaceabner@miplace.com',
    password: '#Banana@343390',
    role: 'Administrador'
  },
  {
    id: 'user_dark_morellato',
    name: 'Dark Morellato',
    email: 'darkmorelato@miplace.com',
    password: '#Ark343390',
    role: 'Administrador'
  }
];

const AUTH_STORAGE_KEY = 'miplace_auth_session_user';

/**
 * Garante que os usuários padrão existam no banco de dados Firestore
 */
export const seedInitialUsersIfNotExist = async (): Promise<void> => {
  try {
    const dataDoc = doc(db, 'miplace-despesas', 'data-team_data');
    const usersColl = collection(dataDoc, 'system_users_v1');

    for (const u of INITIAL_DATABASE_USERS) {
      const userDocRef = doc(usersColl, u.id);
      const userDoc = await getDoc(userDocRef);
      if (!userDoc.exists()) {
        await setDoc(userDocRef, {
          name: u.name,
          email: u.email.toLowerCase().trim(),
          password: u.password,
          role: u.role,
          createdAt: new Date().toISOString()
        });
      }
    }
  } catch (err) {
    console.warn('Aviso: Não foi possível sincronizar usuários iniciais com o Firestore imediatamente:', err);
  }
};

/**
 * Consulta o banco de dados e autentica o usuário com login e senha
 */
export const authenticateUser = async ({ email, password }: UserCredentials): Promise<AuthenticatedUser> => {
  const normalizedEmail = email.toLowerCase().trim();
  const trimmedPassword = password.trim();

  if (!normalizedEmail || !trimmedPassword) {
    throw new Error('Informe o e-mail e a senha.');
  }

  // Tenta consultar no Firestore
  try {
    const dataDoc = doc(db, 'miplace-despesas', 'data-team_data');
    const usersColl = collection(dataDoc, 'system_users_v1');

    // Inicializa os usuários no banco se necessário
    await seedInitialUsersIfNotExist();

    const q = query(usersColl, where('email', '==', normalizedEmail));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const userDoc = snapshot.docs[0];
      const data = userDoc.data();

      if (data.password === trimmedPassword) {
        const authenticatedUser: AuthenticatedUser = {
          id: userDoc.id,
          name: data.name || (normalizedEmail.includes('dark') ? 'Dark Morellato' : 'Abner Morais'),
          email: normalizedEmail,
          role: data.role || 'Administrador',
          lastLogin: new Date().toISOString()
        };

        // Atualiza último login no banco
        setDoc(doc(usersColl, userDoc.id), { lastLogin: new Date().toISOString() }, { merge: true }).catch(() => {});

        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authenticatedUser));
        return authenticatedUser;
      } else {
        throw new Error('Senha incorreta.');
      }
    }
  } catch (error: any) {
    if (error.message === 'Senha incorreta.') {
      throw error;
    }
    console.warn('Tentando validação com credenciais do banco local:', error);
  }

  // Validação direta com os usuários cadastrados
  const localMatch = INITIAL_DATABASE_USERS.find(
    u => u.email.toLowerCase().trim() === normalizedEmail
  );

  if (!localMatch) {
    throw new Error('Usuário não encontrado.');
  }

  if (localMatch.password !== trimmedPassword) {
    throw new Error('Senha incorreta.');
  }

  const authenticatedUser: AuthenticatedUser = {
    id: localMatch.id,
    name: localMatch.name,
    email: localMatch.email,
    role: localMatch.role,
    lastLogin: new Date().toISOString()
  };

  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authenticatedUser));
  return authenticatedUser;
};

/**
 * Valida se a senha informada pertence a qualquer administrador válido do sistema
 */
export const validateAnyAdminPassword = (password: string, currentUserEmail?: string): boolean => {
  const trimmed = password.trim();
  if (!trimmed) return false;

  // Validação com a senha mestra padrão
  if (trimmed === ADMIN_PASSWORD) return true;

  // Se passou e-mail do usuário atual, prioriza conferência com ele
  if (currentUserEmail) {
    const userMatch = INITIAL_DATABASE_USERS.find(
      u => u.email.toLowerCase().trim() === currentUserEmail.toLowerCase().trim()
    );
    if (userMatch && userMatch.password === trimmed) return true;
  }

  // Validação com qualquer administrador cadastrado (ex: Abner Morais ou Dark Morellato)
  return INITIAL_DATABASE_USERS.some(u => u.password === trimmed);
};

/**
 * Retorna o usuário autenticado na sessão atual (se houver)
 */
export const getStoredUserSession = (): AuthenticatedUser | null => {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

/**
 * Realiza logout do usuário
 */
export const logoutUser = (): void => {
  localStorage.removeItem(AUTH_STORAGE_KEY);
};
