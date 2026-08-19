import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';
import { FIXED_NOTIFICATIONS_DEFAULT } from '../src/config/constants.js';

const firebaseConfig = {
  apiKey: "AIzaSyBTKRckW0phSEPoDNBwpSeb6rconsokbpI",
  authDomain: "miplace-despesas.firebaseapp.com",
  projectId: "miplace-despesas",
  storageBucket: "miplace-despesas.firebasestorage.app",
  messagingSenderId: "770624075590",
  appId: "1:770624075590:web:297b8650a919818041d747",
  measurementId: "G-Z33RRM8XPD",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function main() {
  console.log("=== STEP 1: FAZENDO BACKUP DOS DADOS ATUAIS ===");

  const dataDoc = doc(db, 'miplace-despesas', 'data-team_data');
  const fixedPaymentsColl = collection(dataDoc, 'fixed_payments_v1');
  const globalChecklistColl = collection(dataDoc, 'global_checklist_v1');
  const checksDocRef = doc(globalChecklistColl, 'checks');

  // Fetch current fixed payments
  const fixedPaymentsSnap = await getDocs(fixedPaymentsColl);
  const currentFixedPayments = fixedPaymentsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  // Fetch current checks
  const checksSnap = await getDoc(checksDocRef);
  const currentChecks = checksSnap.exists() ? (checksSnap.data().checks || {}) : {};

  const backupData = {
    timestamp: new Date().toISOString(),
    fixedPaymentsCount: currentFixedPayments.length,
    fixedPayments: currentFixedPayments,
    checksCount: Object.keys(currentChecks).length,
    checks: currentChecks
  };

  const projectBackupPath = path.resolve('./backup_fixed_payments_and_checks_2026-08-19.json');
  const artifactBackupPath = '/home/dark/.gemini/antigravity-cli/brain/509d716d-7f55-46b5-9988-e77d4df7f800/backup_fixed_payments_and_checks_2026-08-19.json';

  fs.writeFileSync(projectBackupPath, JSON.stringify(backupData, null, 2));
  fs.writeFileSync(artifactBackupPath, JSON.stringify(backupData, null, 2));

  console.log(`✅ Backup salvo em: ${projectBackupPath}`);
  console.log(`✅ Backup também salvo em: ${artifactBackupPath}`);
  console.log(`   - Fixed Payments encontrados: ${currentFixedPayments.length}`);
  console.log(`   - Checks encontrados: ${Object.keys(currentChecks).length}`);

  console.log("\n=== STEP 2: ANALISANDO E REAPLICANDO APENAS OS PAGAMENTOS FIXOS DE CONSTANTS.TS ===");
  console.log(`Total em FIXED_NOTIFICATIONS_DEFAULT: ${FIXED_NOTIFICATIONS_DEFAULT.length}`);

  // 1. Delete all existing docs in fixed_payments_v1 to ensure no orphans/duplicates remain
  console.log("Removendo documentos antigos do collection fixed_payments_v1...");
  for (const docSnap of fixedPaymentsSnap.docs) {
    await deleteDoc(doc(fixedPaymentsColl, docSnap.id));
  }
  console.log("Collection fixed_payments_v1 limpa.");

  // 2. Insert the 53 exact items from FIXED_NOTIFICATIONS_DEFAULT
  console.log("Gravando os 53 pagamentos fixos atualizados...");
  for (const item of FIXED_NOTIFICATIONS_DEFAULT) {
    const docRef = doc(fixedPaymentsColl, item.id);
    const payload = {
      day: item.day,
      description: item.description,
      ...(item.months ? { months: item.months } : {})
    };
    await setDoc(docRef, payload);
  }
  console.log("✅ Todos os 53 pagamentos fixos gravados no Firestore!");

  console.log("\n=== STEP 3: REESCREVENDO E LIMPANDO OS CHECKS DO CALENDÁRIO A PARTIR DE 09/2026 ===");
  // Key format: `${year}-${monthIndex}-${taskDescription}`
  // Month 09/2026 => year 2026, monthIndex 8 (0 = Jan ... 8 = Sep)
  // We clean any checks for monthIndex >= 8 of 2026 and any year > 2026,
  // AND we clean any checks referencing descriptions that no longer exist in FIXED_NOTIFICATIONS_DEFAULT.

  const validDescriptions = new Set(FIXED_NOTIFICATIONS_DEFAULT.map(item => item.description));
  const newChecks = {};

  for (const [key, value] of Object.entries(currentChecks)) {
    const parts = key.split('-');
    if (parts.length >= 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const desc = parts.slice(2).join('-');

      // Check if description still exists in valid fixed payments
      if (!validDescriptions.has(desc)) {
        console.log(`   [Removido] Item inexistente nos pagamentos fixos: ${desc}`);
        continue;
      }

      // If key is starting from 09/2026 (year 2026, month >= 8, or year > 2026), skip/reset it
      if (year > 2026 || (year === 2026 && month >= 8)) {
        console.log(`   [Resetado para 09/2026+] Key: ${key}`);
        continue;
      }
    }
    // Keep valid historical checks (< 09/2026)
    newChecks[key] = value;
  }

  await setDoc(checksDocRef, { checks: newChecks });
  console.log(`✅ Checks atualizados no Firestore! (Permaneceram ${Object.keys(newChecks).length} checks históricos anteriores a 09/2026).`);

  console.log("\n=== VERIFICAÇÃO FINAL ===");
  const verifySnap = await getDocs(fixedPaymentsColl);
  console.log(`Total final no Firestore fixed_payments_v1: ${verifySnap.docs.length} documentos.`);

  process.exit(0);
}

main().catch(err => {
  console.error("❌ Erro durante execução:", err);
  process.exit(1);
});
