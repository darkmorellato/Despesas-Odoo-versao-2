/**
 * Cria as contas de e-mail/senha da equipe no Firebase Authentication.
 *
 * Pré-requisito (uma vez, no console do Firebase):
 *   Authentication > Sign-in method > "E-mail/senha" > Ativar
 *
 * Uso:
 *   node scripts/create_auth_users.mjs
 *
 * Variáveis opcionais (evitam o prompt):
 *   SEED_PASSWORD_MIPLACEABNER   senha de miplaceabner@miplace.com
 *   SEED_PASSWORD_DARK           senha de darkmorelato@miplace.com
 *
 * - Use as MESMAS senhas que as pessoas já usam hoje, para o login continuar
 *   igual. O Firebase exige no mínimo 6 caracteres.
 * - Idempotente: contas que já existem são apenas listadas.
 * - Mantenha a lista abaixo igual à de firestore.rules (isTeamMember).
 * - Nenhuma senha é gravada em arquivo.
 */
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut, updateProfile } from 'firebase/auth';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { prompt } from './_script_auth.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnvFile(path) {
  const out = {};
  if (!existsSync(path)) return out;
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*(?:export\s+)?([\w.-]+)\s*=\s*(.*)?$/);
    if (!m) continue;
    let v = (m[2] ?? '').trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    out[m[1]] = v;
  }
  return out;
}
const env = { ...loadEnvFile(join(__dirname, '..', '.env.local')), ...loadEnvFile(join(__dirname, '..', '.env')), ...process.env };

const app = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY || 'AIzaSyBTKRckW0phSEPoDNBwpSeb6rconsokbpI',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || 'miplace-despesas.firebaseapp.com',
  projectId: env.VITE_FIREBASE_PROJECT_ID || 'miplace-despesas',
  appId: env.VITE_FIREBASE_APP_ID || '1:770624075590:web:297b8650a919818041d747',
});
const auth = getAuth(app);

const USERS = [
  { name: 'Abner Morais', email: 'miplaceabner@miplace.com', envKey: 'SEED_PASSWORD_MIPLACEABNER' },
  { name: 'Dark Morellato', email: 'darkmorelato@miplace.com', envKey: 'SEED_PASSWORD_DARK' },
];

let failures = 0;
for (const u of USERS) {
  const password = env[u.envKey] || (await prompt(`Senha para ${u.email} (Enter = pular): `, { hidden: true }));
  if (!password) {
    console.log(`- ${u.email}: pulado.`);
    continue;
  }
  try {
    const cred = await createUserWithEmailAndPassword(auth, u.email, password);
    await updateProfile(cred.user, { displayName: u.name }).catch(() => {});
    console.log(`✔ ${u.email}: conta criada.`);
  } catch (e) {
    if (e.code === 'auth/email-already-in-use') {
      console.log(`= ${u.email}: já existe (nada a fazer).`);
    } else if (e.code === 'auth/weak-password') {
      console.error(`✘ ${u.email}: senha muito curta (mínimo 6 caracteres).`);
      failures++;
    } else if (e.code === 'auth/operation-not-allowed') {
      console.error('✘ Login por e-mail/senha NÃO está ativado. Console Firebase > Authentication > Sign-in method > E-mail/senha.');
      process.exit(1);
    } else {
      console.error(`✘ ${u.email}: ${e.code || e.message}`);
      failures++;
    }
  } finally {
    await signOut(auth).catch(() => {});
  }
}

process.exit(failures ? 1 : 0);
