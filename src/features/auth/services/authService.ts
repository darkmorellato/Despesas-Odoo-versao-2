import { auth, db, signInWithEmailAndPassword, signOut } from '@/config/firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
  } from 'firebase/firestore';
import type { AuthenticatedUser, UserCredentials } from '../types';

// NENHUMA senha vive neste arquivo (nem no bundle do cliente).
// LOGIN: Firebase Authentication (e-mail/senha) — a senha é verificada pelo
// servidor do Firebase e as firestore.rules só aceitam as contas da equipe.
// Contas: node scripts/create_auth_users.mjs (ver docs/SECURITY.md).
//
// SENHA DE ADMIN (confirmação de editar/excluir): continua sendo conferida
// contra o hash SHA-256 com salt guardado no Firestore (passwordHash/
// passwordSalt), gerenciado por scripts/seed_users.mjs.

const AUTH_STORAGE_KEY = 'miplace_auth_session_user';

// Caminhos — devem bater com scripts/seed_users.mjs e firestore.rules
const getDataDoc = () => doc(db, 'miplace-despesas', 'data-team_data');
const getUsersColl = () => collection(getDataDoc(), 'system_users_v1');
const getMasterDoc = () => doc(collection(getDataDoc(), 'system_settings_v1'), 'admin_master');

// Mesmo formato do script de seed:
// passwordHash = hex(sha256(`${salt}:${password}`))
const sha256Hex = async (text: string): Promise<string> => {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};

/**
 * Compara a senha com o documento do usuário.
 * - Novo formato: passwordHash + passwordSalt (SHA-256).
 * - Legado: senha ainda em texto plano (docs criados antes da migração).
 */
const verifyUserPassword = async (
  data: Record<string, unknown> | undefined | null,
  password: string
): Promise<boolean> => {
  if (!data) return false;
  if (typeof data.passwordHash === 'string' && typeof data.passwordSalt === 'string') {
    const hash = await sha256Hex(`${data.passwordSalt}:${password}`);
    return hash === data.passwordHash;
  }
  if (typeof data.password === 'string') {
    return data.password === password;
  }
  return false;
};

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  'auth/invalid-credential': 'E-mail ou senha incorretos.',
  'auth/wrong-password': 'E-mail ou senha incorretos.',
  'auth/user-not-found': 'E-mail ou senha incorretos.',
  'auth/invalid-email': 'E-mail inválido.',
  'auth/user-disabled': 'Esta conta foi desativada.',
  'auth/too-many-requests': 'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
  'auth/network-request-failed': 'Não foi possível conectar ao servidor de autenticação. Verifique sua conexão.',
  'auth/operation-not-allowed': 'Login por e-mail/senha não está habilitado no Firebase.',
};

/**
 * Autentica no Firebase Auth (e-mail/senha) e carrega o perfil (nome/perfil)
 * de system_users_v1.
 *
 * Mensagens de erro NÃO distinguem "usuário inexistente" de "senha errada"
 * (evita enumeração de contas).
 */
export const authenticateUser = async ({ email, password }: UserCredentials): Promise<AuthenticatedUser> => {
  const normalizedEmail = email.toLowerCase().trim();
  const trimmedPassword = password.trim();

  if (!normalizedEmail || !trimmedPassword) {
    throw new Error('Informe o e-mail e a senha.');
  }

  try {
    await signInWithEmailAndPassword(auth, normalizedEmail, trimmedPassword);
  } catch (error) {
    const code = (error as { code?: string })?.code ?? '';
    console.warn('Falha no login:', code || error);
    throw new Error(AUTH_ERROR_MESSAGES[code] ?? 'Não foi possível entrar. Tente novamente.');
  }

  // Perfil (best-effort): sem ele o login continua, usando o e-mail como nome.
  let userId = normalizedEmail;
  let profile: Record<string, unknown> = {};
  try {
    const snapshot = await getDocs(
      query(getUsersColl(), where('email', '==', normalizedEmail))
    );
    if (!snapshot.empty) {
      userId = snapshot.docs[0].id;
      profile = snapshot.docs[0].data();
    }
  } catch (error) {
    console.warn('Perfil do usuário indisponível (seguindo só com o e-mail):', error);
  }

  const authenticatedUser: AuthenticatedUser = {
    id: userId,
    // Nunca inventa identidade: sem `name` no doc, usa o próprio e-mail
    name: (typeof profile.name === 'string' && profile.name.trim()) || normalizedEmail,
    email: normalizedEmail,
    role: (typeof profile.role === 'string' && profile.role) || 'Administrador',
    lastLogin: new Date().toISOString(),
  };

  if (userId !== normalizedEmail) {
    setDoc(doc(getUsersColl(), userId), { lastLogin: authenticatedUser.lastLogin }, { merge: true })
      .catch(() => { /* último login é best-effort */ });
  }

  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authenticatedUser));
  return authenticatedUser;
};

/**
 * Valida uma senha de administrador — ASSÍNCRONO: consulta o Firestore
 * (senha mestra em system_settings_v1/admin_master + usuários com role
 * Administrador). Nada disso é mais hardcoded no cliente.
 *
 * Em falha de rede/leitura, NEGABA por segurança (false) — a validação não
 * pode falhar abrindo.
 */
export const validateAnyAdminPassword = async (
  password: string,
  _currentUserEmail?: string
): Promise<boolean> => {
  const trimmed = password.trim();
  if (!trimmed) return false;

  try {
    // 1) Senha mestra (doc system_settings_v1/admin_master)
    try {
      const masterSnap = await getDoc(getMasterDoc());
      if (masterSnap?.exists?.() && (await verifyUserPassword(masterSnap.data(), trimmed))) {
        return true;
      }
    } catch {
      // Doc pode não existir ainda (ainda não seedado) ou sem permissão
    }

    // 2) Senha de qualquer administrador cadastrado
    const snapshot = await getDocs(getUsersColl());
    for (const d of snapshot.docs) {
      const data = d.data();
      const role = (typeof data.role === 'string' && data.role) || 'Administrador';
      if (role !== 'Administrador') continue;
      if (await verifyUserPassword(data, trimmed)) return true;
    }
    return false;
  } catch (error) {
    console.warn('Falha ao validar senha no Firestore (negando por segurança):', error);
    return false;
  }
};

/**
 * Retorna o usuário autenticado na sessão atual (se houver), validando o
 * formato — JSON corrompido ou sessão sem e-mail não derruba o App.
 */
export const getStoredUserSession = (): AuthenticatedUser | null => {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === 'object' &&
      typeof parsed.email === 'string' &&
      typeof parsed.name === 'string'
    ) {
      return parsed as AuthenticatedUser;
    }
    return null;
  } catch {
    return null;
  }
};

/**
 * Encerra a sessão: limpa o perfil em cache e desloga do Firebase Auth.
 */
export const logoutUser = async (): Promise<void> => {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  try {
    await signOut(auth);
  } catch (error) {
    console.warn('Falha ao encerrar a sessão no Firebase:', error);
  }
};
