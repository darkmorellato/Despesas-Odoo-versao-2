import { db } from '@/config/firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteField,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import type { AuthenticatedUser, UserCredentials } from '../types';

// NENHUMA senha vive neste arquivo (nem no bundle do cliente).
// Usuários e senha mestra existem apenas no Firestore, como hash SHA-256 com
// salt por usuário (passwordHash/passwordSalt). Cadastro/troca/migração:
//   node scripts/seed_users.mjs [--hash-legacy | --master | --change ...]

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

const newSalt = (): string => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
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

/**
 * Migração oportunista: converte senha legada em texto plano para hash no
 * primeiro login bem-sucedido (a senha NÃO muda). Melhor esforço — se falhar
 * (regras do Firestore, rede), o login continua funcionando com o formato antigo.
 */
const upgradeLegacyPassword = async (userId: string, password: string): Promise<void> => {
  try {
    const salt = newSalt();
    await setDoc(
      doc(getUsersColl(), userId),
      {
        passwordHash: await sha256Hex(`${salt}:${password}`),
        passwordSalt: salt,
        password: deleteField(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (e) {
    console.warn('Não foi possível migrar a senha para hash (seguindo com o formato antigo):', e);
  }
};

/**
 * Consulta o Firestore e autentica o usuário.
 * A senha é verificada SEMPRE contra o Firestore — não existe fallback local
 * (o antigo fallback aceitava as senhas hardcoded do bundle se a rede caísse,
 * tornando qualquer revogação de senha inútil).
 */
export const authenticateUser = async ({ email, password }: UserCredentials): Promise<AuthenticatedUser> => {
  const normalizedEmail = email.toLowerCase().trim();
  const trimmedPassword = password.trim();

  if (!normalizedEmail || !trimmedPassword) {
    throw new Error('Informe o e-mail e a senha.');
  }

  let data: Record<string, unknown>;
  let userId: string;
  try {
    const snapshot = await getDocs(
      query(getUsersColl(), where('email', '==', normalizedEmail))
    );
    if (snapshot.empty) {
      throw new Error('Usuário não encontrado.');
    }
    const userDoc = snapshot.docs[0];
    data = userDoc.data();
    userId = userDoc.id;
  } catch (error) {
    if (error instanceof Error && error.message === 'Usuário não encontrado.') {
      throw error;
    }
    // Erro de rede/permissão: mensagem amigável em vez do payload do SDK
    console.warn('Falha ao consultar usuário no Firestore:', error);
    throw new Error('Não foi possível conectar ao servidor de autenticação. Verifique sua conexão.');
  }

  if (!(await verifyUserPassword(data, trimmedPassword))) {
    throw new Error('Senha incorreta.');
  }

  // Migra texto plano → hash (primeiro login após o deploy desta versão)
  if (typeof data.password === 'string' && !data.passwordHash) {
    await upgradeLegacyPassword(userId, trimmedPassword);
  }

  const authenticatedUser: AuthenticatedUser = {
    id: userId,
    // Nunca inventa identidade: sem `name` no doc, usa o próprio e-mail
    // (o antigo fallback atribuía "Abner Morais" a qualquer usuário novo,
    // corrompendo auditoria e autoria de despesas)
    name: (typeof data.name === 'string' && data.name.trim()) || normalizedEmail,
    email: normalizedEmail,
    role: (typeof data.role === 'string' && data.role) || 'Administrador',
    lastLogin: new Date().toISOString(),
  };

  setDoc(doc(getUsersColl(), userId), { lastLogin: authenticatedUser.lastLogin }, { merge: true })
    .catch(() => { /* último login é best-effort */ });

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
 * Realiza logout do usuário
 */
export const logoutUser = (): void => {
  localStorage.removeItem(AUTH_STORAGE_KEY);
};
