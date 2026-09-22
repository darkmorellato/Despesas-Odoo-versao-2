// Verificação read-only: mostra apenas os NOMES dos campos de cada usuário
// (nunca valores) para confirmar que não sobrou senha em texto plano.
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, doc, collection, getDocs } from 'firebase/firestore';
import { readFileSync, existsSync } from 'node:fs';

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
const env = { ...loadEnvFile(new URL('../.env', import.meta.url).pathname), ...process.env };

const app = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY || 'AIzaSyBTKRckW0phSEPoDNBwpSeb6rconsokbpI',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || 'miplace-despesas.firebaseapp.com',
  projectId: env.VITE_FIREBASE_PROJECT_ID || 'miplace-despesas',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || 'miplace-despesas.firebasestorage.app',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '770624075590',
  appId: env.VITE_FIREBASE_APP_ID || '1:770624075590:web:297b8650a919818041d747',
});
const db = getFirestore(app);
await signInAnonymously(getAuth(app));

const dataDoc = doc(db, 'miplace-despesas', 'data-team_data');

// 1) Usuários: campos, ausência de texto plano e datas de atualização
const snap = await getDocs(collection(dataDoc, 'system_users_v1'));
for (const d of snap.docs) {
  const data = d.data();
  const fields = Object.keys(data).sort();
  const hasPlain = 'password' in data;
  const hasHash = 'passwordHash' in data && 'passwordSalt' in data;
  console.log(`${data.email || d.id}:`);
  console.log(`  campos=[${fields.join(', ')}]`);
  console.log(`  texto_plano=${hasPlain ? 'SIM ⚠️' : 'não'} | hash=${hasHash ? 'sim ✓' : 'AUSENTE ⚠️'} | updatedAt=${data.updatedAt ?? '(sem)'}`);
}

// 2) Senha mestra: doc system_settings_v1/admin_master
try {
  const { getDoc } = await import('firebase/firestore');
  const master = await getDoc(doc(collection(dataDoc, 'system_settings_v1'), 'admin_master'));
  if (!master.exists()) {
    console.log('senha_mestra: AUSENTE ⚠️  (doc admin_master não existe)');
  } else {
    const data = master.data();
    const fields = Object.keys(data).sort();
    const hasPlain = 'password' in data;
    const hasHash = 'passwordHash' in data && 'passwordSalt' in data;
    console.log(`senha_mestra: campos=[${fields.join(', ')}]`);
    console.log(`  texto_plano=${hasPlain ? 'SIM ⚠️' : 'não'} | hash=${hasHash ? 'sim ✓' : 'AUSENTE ⚠️'} | updatedAt=${data.updatedAt ?? '(sem)'}`);
  }
} catch (e) {
  console.log('senha_mestra: erro ao consultar →', e.message);
}
process.exit(0);
