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

async function rebuildChecklist() {
  console.log("=== FAZENDO BACKUP DO CHECKS ANTES DA RECONSTRUÇÃO TOTAL ===");
  const dataDoc = doc(db, 'miplace-despesas', 'data-team_data');
  const checksDocRef = doc(dataDoc, 'global_checklist_v1', 'checks');

  const snap = await getDoc(checksDocRef);
  const oldChecks = snap.exists() ? (snap.data().checks || {}) : {};

  const backupPath = path.resolve('./backup_checks_before_exact_rebuild_2026-08-19.json');
  fs.writeFileSync(backupPath, JSON.stringify({ timestamp: new Date().toISOString(), oldChecks }, null, 2));
  console.log(`✅ Backup salvo em: ${backupPath}`);

  console.log("\n=== APAGANDO TODOS OS CHECKS ANTERIORES E REESCREVENDO DE FEV/2026 A AGOSTO/2026 ===");

  const newChecks: Record<string, boolean> = {};

  // Months to set as PAID (true):
  // 2026-1 (Fevereiro)
  // 2026-2 (Março)
  // 2026-3 (Abril)
  // 2026-4 (Maio)
  // 2026-5 (Junho)
  // 2026-6 (Julho)
  const paidMonths = [1, 2, 3, 4, 5, 6];

  let paidCount = 0;

  for (const monthIdx of paidMonths) {
    for (const item of FIXED_NOTIFICATIONS_DEFAULT) {
      if (item.months && !item.months.includes(monthIdx + 1)) {
        continue;
      }
      const key = `2026-${monthIdx}-${item.description}`;
      newChecks[key] = true;
      paidCount++;
    }
  }

  // Set the clean document in Firestore
  await setDoc(checksDocRef, { checks: newChecks });

  console.log(`✅ Documento 'checks' reescrito com sucesso!`);
  console.log(`   - Meses anteriores apagados: SIM (Todos antes de Fev/2026 foram removidos)`);
  console.log(`   - Meses com CHECK (Fev a Jul/2026): ${paidCount} itens marcados como PAGO (true)`);
  console.log(`   - Agosto/2026 (2026-7): Aberto / Zerado para operações diárias`);
  console.log(`   - Total final de chaves no Firestore: ${Object.keys(newChecks).length}`);

  process.exit(0);
}

rebuildChecklist().catch(err => {
  console.error("❌ Erro:", err);
  process.exit(1);
});
