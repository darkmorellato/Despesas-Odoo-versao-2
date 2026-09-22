// Diagnóstico: por que o alerta "CONTAS PENDENTES" conta N itens?
// Mostra: pagamentos do mês, contagem por dia, e se existe check (raw/norm)
// correspondente para cada pendente. Apenas metadados — sem senhas/valores.
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, doc, collection, getDocs, getDoc } from 'firebase/firestore';
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

// 1) Pagamentos fixos
const paySnap = await getDocs(collection(dataDoc, 'fixed_payments_v1'));
const payments = paySnap.docs.map(d => ({ id: d.id, ...d.data() }));

// 2) Checks do calendário
const checksSnap = await getDoc(doc(collection(dataDoc, 'global_checklist_v1'), 'checks'));
const checks = checksSnap.exists() ? (checksSnap.data().checks || {}) : {};
const checkKeys = Object.keys(checks);
const septKeys = checkKeys.filter(k => k.startsWith('2026-8-'));

console.log(`pagamentos_fixos=${payments.length} | checks_total=${checkKeys.length} | checks_setembro_2026-8=${septKeys.length} (true=${septKeys.filter(k => checks[k]).length})`);
console.log(`amostra de chaves de setembro: ${septKeys.slice(0, 5).map(k => `${k}=${checks[k]}`).join(' | ') || '(NENHUMA)'}`);
console.log(`amostra de QUALQUER chave: ${checkKeys.slice(0, 5).map(k => `${k}=${checks[k]}`).join(' | ')}`);

// 3) Réplica EXATA da lógica do app — extrai o DESCRIPTION_MAP do fonte TS
const src = readFileSync(new URL('../src/features/calendar/hooks/useCalendar.ts', import.meta.url).pathname, 'utf8');
const mapMatch = src.match(/const DESCRIPTION_MAP[^=]*=\s*(\{[\s\S]*?\n\});/);
const DESCRIPTION_MAP = mapMatch ? eval(`(${mapMatch[1]})`) : {};
console.log(`DESCRIPTION_MAP carregado: ${Object.keys(DESCRIPTION_MAP).length} entradas`);

const normalizeTaskDescription = (desc) => DESCRIPTION_MAP[desc] || desc;
const normalizeCheckKey = (key) => {
  const parts = key.split('-');
  if (parts.length < 3) return key;
  const [year, month, ...rest] = parts;
  return `${year}-${month}-${normalizeTaskDescription(rest.join('-'))}`;
};

const now = new Date();
const currentDay = now.getDate();
const currentMonth = now.getMonth(); // 0-based
const currentYear = now.getFullYear();
const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
console.log(`hoje=${currentYear}-${currentMonth + 1}-${currentDay} (mês 0-based=${currentMonth}) ultimoDia=${lastDayOfMonth}`);

// Lógica EXATA do app (inclusive NaN: `effectiveDay > currentDay` com NaN = falsy = conta!)
const appPending = payments.filter(task => {
  if (task.months && !task.months.includes(currentMonth + 1)) return false;
  let dueDay = task.day;
  if (task.customDate) {
    const [cy, cm, cd] = task.customDate.split('-').map(Number);
    if (!isNaN(cy) && !isNaN(cm) && !isNaN(cd)) {
      if (cy !== currentYear || cm !== currentMonth + 1) return false;
      dueDay = cd;
    }
  }
  const effectiveDay = Math.min(dueDay, lastDayOfMonth);
  if (effectiveDay > currentDay) return false;
  const rawKey = `${currentYear}-${currentMonth}-${task.description}`;
  const normKey = normalizeCheckKey(rawKey);
  return !(checks[normKey] ?? checks[rawKey]);
});

console.log(`\nPENDENTES (lógica EXATA do app)=${appPending.length}`);
if (appPending.length > 0) {
  const byDay = {};
  for (const p of appPending) byDay[p.day] = (byDay[p.day] || 0) + 1;
  console.log(`por dia: ${JSON.stringify(byDay)}`);
  console.log('detalhe (chave norm vs raw e valor em checks):');
  for (const p of appPending.slice(0, 15)) {
    const rawKey = `${currentYear}-${currentMonth}-${p.description}`;
    const normKey = normalizeCheckKey(rawKey);
    const normVal = normKey in checks ? checks[normKey] : '(ausente)';
    const rawVal = rawKey in checks ? checks[rawKey] : '(ausente)';
    console.log(`  dia=${p.day} "${p.description}"`);
    console.log(`     raw ="${rawKey}" -> ${rawVal}`);
    if (normKey !== rawKey) console.log(`     norm="${normKey}" -> ${normVal}${normVal === false ? '  ⚠️ FALSE vence o TRUE do raw (?? não cai no fallback)' : ''}`);
    console.log(`     day=${JSON.stringify(p.day)} months=${JSON.stringify(p.months ?? null)} customDate=${JSON.stringify(p.customDate ?? null)}`);
  }
}

// Diagnóstico auxiliar: dias>22 e filtros
const dayDist = {};
for (const p of payments) dayDist[String(p.day)] = (dayDist[String(p.day)] || 0) + 1;
console.log(`\ndistribuição de day nos 52 pagamentos: ${JSON.stringify(dayDist)}`);
console.log(`com months: ${payments.filter(p => p.months).length} | com customDate: ${payments.filter(p => p.customDate).length}`);
console.log(`chaves norm≠raw no mapa de checks de setembro: ${septKeys.filter(k => normalizeCheckKey(k) !== k).length}`);

// 5) Existe algum check de setembro com descrição parecida? (fuga de normalização)
if (septKeys.length > 0) {
  console.log('\ntodas as chaves true de setembro:');
  for (const k of septKeys.filter(k => checks[k]).slice(0, 15)) console.log(`  ✓ ${k}`);
}
process.exit(0);
