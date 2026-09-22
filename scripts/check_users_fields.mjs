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
const snap = await getDocs(collection(dataDoc, 'system_users_v1'));
for (const d of snap.docs) {
  const fields = Object.keys(d.data()).sort();
  const hasPlain = 'password' in d.data();
  const hasHash = 'passwordHash' in d.data() && 'passwordSalt' in d.data();
  console.log(`${d.data().email || d.id}: campos=[${fields.join(', ')}] | texto_plano=${hasPlain ? 'SIM ⚠️' : 'não'} | hash=${hasHash ? 'sim ✓' : 'AUSENTE ⚠️'}`);
}
process.exit(0);
