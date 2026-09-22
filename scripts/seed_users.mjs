/**
 * Seed / migração de usuários do sistema — SEM senha hardcoded no repositório.
 *
 * As senhas são informadas na execução (prompt) ou por variáveis de ambiente
 * e terminam APENAS no Firestore, como hash SHA-256 com salt por usuário.
 * O bundle do cliente (authService.ts) não contém nenhuma senha.
 *
 * Uso:
 *   node scripts/seed_users.mjs                # cria/edita usuários (pergunta as senhas)
 *   node scripts/seed_users.mjs --hash-legacy  # converte senhas em texto plano já
 *                                              # existentes no Firestore para hash
 *                                              # (a senha NÃO muda)
 *   node scripts/seed_users.mjs --master       # define a senha mestra de admin
 *                                              # (doc system_settings_v1/admin_master)
 *   node scripts/seed_users.mjs --change PASSWORD email@...  # troca a senha de um usuário
 *
 * Variáveis de ambiente opcionais (evitam o prompt interativo):
 *   SEED_PASSWORD_MIPLACEABNER   senha do usuário miplaceabner@miplace.com
 *   SEED_PASSWORD_DARK           senha do usuário darkmorelato@miplace.com
 *   SEED_MASTER_PASSWORD         senha mestra de admin
 *
 * As senhas NUNCA são gravadas em arquivo nem no código — apenas o hash
 * (sha256(salt:senha)) chega ao Firestore.
 */

import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import {
  getFirestore, doc, getDoc, setDoc, deleteField, collection, getDocs
} from 'firebase/firestore';
import { createHash, randomBytes } from 'node:crypto';
import { createInterface } from 'node:readline/promises';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Configuração do Firebase (lê .env / .env.local se existir; fallback são os
// identificadores públicos do app — apiKey do web SDK não é segredo, as regras
// do Firestore é que protegem os dados).
// ---------------------------------------------------------------------------
function loadEnvFile(path) {
  const out = {};
  if (!existsSync(path)) return out;
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*(?:export\s+)?([\w.-]+)\s*=\s*(.*)?$/);
    if (!m) continue;
    let v = (m[2] ?? '').trim();
    // remove aspas duplas/exteriores; mantém o valor literal (inclui '#')
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    out[m[1]] = v;
  }
  return out;
}

const envFile = { ...loadEnvFile(join(__dirname, '..', '.env.local')), ...loadEnvFile(join(__dirname, '..', '.env')) };
const env = { ...envFile, ...process.env };

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || 'AIzaSyBTKRckW0phSEPoDNBwpSeb6rconsokbpI',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || 'miplace-despesas.firebaseapp.com',
  projectId: env.VITE_FIREBASE_PROJECT_ID || 'miplace-despesas',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || 'miplace-despesas.firebasestorage.app',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '770624075590',
  appId: env.VITE_FIREBASE_APP_ID || '1:770624075590:web:297b8650a919818041d747',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// As firestore.rules exigem request.auth != null para ler system_users_v1 —
// o script entra com login anônimo (mesmo mecanismo do app).
await signInAnonymously(getAuth(app));
console.log('Autenticado (anônimo) para acessar o Firestore.');

// Mesmo formato usado pelo cliente (src/features/auth/services/authService.ts):
// passwordHash = hex(sha256(`${salt}:${password}`))
const hashPassword = (password, salt) =>
  createHash('sha256').update(`${salt}:${password}`, 'utf8').digest('hex');

const newSalt = () => randomBytes(16).toString('hex');

// Caminhos — devem bater com getFirebaseRefs()/authService do cliente
const dataDoc = doc(db, 'miplace-despesas', 'data-team_data');
const usersColl = collection(dataDoc, 'system_users_v1');
const masterDocRef = doc(dataDoc, 'system_settings_v1', 'admin_master');

// Usuários do sistema (nomes/e-mails não são segredos — os mesmos já
// exibidos no LoginScreen). As senhas vêm do prompt ou do ambiente.
const USERS = [
  { id: 'user_abner_morais', name: 'Abner Morais', email: 'miplaceabner@miplace.com', role: 'Administrador', envKey: 'SEED_PASSWORD_MIPLACEABNER' },
  { id: 'user_dark_morellato', name: 'Dark Morellato', email: 'darkmorelato@miplace.com', role: 'Administrador', envKey: 'SEED_PASSWORD_DARK' },
];

const rl = createInterface({ input: process.stdin, output: process.stdout });

/** Pergunta ao usuário. Para `hidden=true`, desliga o eco do terminal durante a digitação. */
async function ask(question, { hidden = false } = {}) {
  if (!hidden || !process.stdin.isTTY) {
    const answer = (await rl.question(question)).trim();
    if (hidden) process.stdout.write('\n');
    return answer;
  }

  // Sem eco da senha: lê uma linha em modo raw do TTY.
  process.stdin.setRawMode?.(true);
  process.stdout.write(question);
  return await new Promise((resolve) => {
    let buf = '';
    const cleanup = () => {
      process.stdin.removeListener('data', onData);
      process.stdin.setRawMode?.(false);
      process.stdin.pause();
    };
    const onData = (chunk) => {
      for (const ch of chunk.toString('utf8')) {
        if (ch === '\n' || ch === '\r' || ch === '\u0004') { // Enter / Ctrl+D
          cleanup();
          process.stdout.write('\n');
          resolve(buf.trim());
          return;
        }
        if (ch === '\u0003') { // Ctrl+C
          cleanup();
          process.exit(130);
        }
        if (ch === '\u007f' || ch === '\b') buf = buf.slice(0, -1);
        else buf += ch;
      }
    };
    process.stdin.on('data', onData);
    process.stdin.resume();
  });
}

async function seedUsers() {
  for (const u of USERS) {
    const ref = doc(usersColl, u.id);
    const snap = await getDoc(ref);

    if (snap.exists() && snap.data().passwordHash) {
      console.log(`✓ ${u.email} já possui senha com hash — nada a fazer.`);
      continue;
    }

    let password = env[u.envKey] || '';
    if (!password) {
      password = await ask(`Senha para ${u.email}: `, { hidden: true });
    }
    if (!password) {
      console.log(`– ${u.email} pulado (sem senha informada).`);
      continue;
    }

    const salt = newSalt();
    const fields = {
      name: u.name,
      email: u.email.toLowerCase(),
      role: u.role,
      passwordHash: hashPassword(password, salt),
      passwordSalt: salt,
      updatedAt: new Date().toISOString(),
    };
    if (!snap.exists()) fields.createdAt = new Date().toISOString();

    await setDoc(ref, fields, { merge: true });
    // Remove senha em texto plano legada, se existir
    if (snap.exists() && typeof snap.data().password === 'string') {
      await setDoc(ref, { password: deleteField() }, { merge: true });
    }
    console.log(`✓ ${u.email} gravado com hash (senha não fica no Firestore em texto plano).`);
  }
}

async function hashLegacy() {
  const snap = await getDocs(usersColl);
  let converted = 0;
  for (const d of snap.docs) {
    const data = d.data();
    if (typeof data.password === 'string' && data.password) {
      const salt = newSalt();
      await setDoc(doc(usersColl, d.id), {
        passwordHash: hashPassword(data.password, salt),
        passwordSalt: salt,
        password: deleteField(),
      }, { merge: true });
      converted++;
      console.log(`✓ ${data.email || d.id}: texto plano → hash (mesma senha).`);
    } else if (data.passwordHash) {
      console.log(`· ${data.email || d.id}: já está com hash.`);
    } else {
      console.log(`! ${data.email || d.id}: sem campo de senha — use o modo interativo.`);
    }
  }
  console.log(`Concluído: ${converted} usuário(s) convertido(s).`);
}

async function seedMaster() {
  let password = env.SEED_MASTER_PASSWORD || '';
  if (!password) password = await ask('Senha mestra de admin (apenas para correções no calendário): ', { hidden: true });
  if (!password) { console.log('Sem senha informada — abortado.'); return; }

  const salt = newSalt();
  await setDoc(masterDocRef, {
    passwordHash: hashPassword(password, salt),
    passwordSalt: salt,
    updatedAt: new Date().toISOString(),
  }, { merge: true });
  console.log('✓ Senha mestra gravada em system_settings_v1/admin_master (hash).');
}

async function changePassword(password, email) {
  if (!password || !email) {
    console.log('Uso: node scripts/seed_users.mjs --change NOVA_SENHA usuario@dominio.com');
    return;
  }
  const snap = await getDocs(usersColl);
  const target = snap.docs.find(d => (d.data().email || '').toLowerCase() === email.toLowerCase());
  if (!target) { console.log(`✗ Usuário ${email} não encontrado.`); return; }
  const salt = newSalt();
  await setDoc(doc(usersColl, target.id), {
    passwordHash: hashPassword(password, salt),
    passwordSalt: salt,
    password: deleteField(),
    updatedAt: new Date().toISOString(),
  }, { merge: true });
  console.log(`✓ Senha de ${email} atualizada (hash).`);
}

const args = process.argv.slice(2);
try {
  if (args.includes('--hash-legacy')) await hashLegacy();
  else if (args.includes('--master')) await seedMaster();
  else if (args.includes('--change')) {
    const i = args.indexOf('--change');
    await changePassword(args[i + 1], args[i + 2]);
  }
  else await seedUsers();
} finally {
  rl.close();
  // O Firestore mantém o event loop aberto (timers/WebChannel) — encerra aqui
  process.exit(0);
}
