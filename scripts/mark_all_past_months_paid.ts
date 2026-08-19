import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';
import { FIXED_NOTIFICATIONS_DEFAULT } from '../src/config/constants';

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
  console.log("=== FAZENDO BACKUP DOS CHECKS DO FIRESTORE ===");

  const dataDoc = doc(db, 'miplace-despesas', 'data-team_data');
  const globalChecklistColl = doc(dataDoc, 'global_checklist_v1', 'checks');

  const checksSnap = await getDoc(globalChecklistColl);
  const currentChecks: Record<string, boolean> = checksSnap.exists() ? (checksSnap.data().checks || {}) : {};

  const backupData = {
    timestamp: new Date().toISOString(),
    checksCount: Object.keys(currentChecks).length,
    checks: currentChecks
  };

  const projectBackupPath = path.resolve('./backup_checks_before_full_history_paid_2026-08-19.json');
  const artifactBackupPath = '/home/dark/.gemini/antigravity-cli/brain/509d716d-7f55-46b5-9988-e77d4df7f800/backup_checks_before_full_history_paid_2026-08-19.json';

  fs.writeFileSync(projectBackupPath, JSON.stringify(backupData, null, 2));
  fs.writeFileSync(artifactBackupPath, JSON.stringify(backupData, null, 2));

  console.log(`✅ Backup salvo em: ${projectBackupPath}`);

  console.log("\n=== MARCANDO TUDO DE JULHO/2026 PARA TRÁS (TODOS OS ANOS E MESES ANTERIORES) COMO FEITO (TRUE) ===");

  const updatedChecks: Record<string, boolean> = { ...currentChecks };
  let countMarked = 0;

  // Cover 2024, 2025, and 2026 (Jan to Jul)
  const periods = [
    { year: 2024, months: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
    { year: 2025, months: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
    { year: 2026, months: [0, 1, 2, 3, 4, 5, 6] } // 0 = Jan ... 6 = Jul
  ];

  for (const period of periods) {
    const year = period.year;
    for (const monthIdx of period.months) {
      for (const item of FIXED_NOTIFICATIONS_DEFAULT) {
        if (item.months && !item.months.includes(monthIdx + 1)) {
          continue;
        }

        const key = `${year}-${monthIdx}-${item.description}`;
        if (!updatedChecks[key]) {
          updatedChecks[key] = true;
          countMarked++;
        }
      }
    }
  }

  await setDoc(globalChecklistColl, { checks: updatedChecks });

  console.log(`✅ ${countMarked} novos pagamentos marcados como FEITO/PAGO (true).`);
  console.log(`✅ Total final de marcações de pagamentos no Firestore: ${Object.keys(updatedChecks).length}.`);

  process.exit(0);
}

main().catch(err => {
  console.error("❌ Erro:", err);
  process.exit(1);
});
