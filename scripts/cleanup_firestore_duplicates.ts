import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, deleteDoc, setDoc } from 'firebase/firestore';

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

const TYPO_MAP: Record<string, string> = {
  "Recebeimento Aluguel Americana": "Recebimento Aluguel Americana",
};

async function cleanupDuplicates() {
  console.log("=== INICIANDO LIMPEZA DE DUPLICATAS NO FIRESTORE ===");
  const dataDoc = doc(db, 'miplace-despesas', 'data-team_data');
  const fixedPaymentsColl = collection(dataDoc, 'fixed_payments_v1');

  const snap = await getDocs(fixedPaymentsColl);
  console.log(`Total de documentos encontrados no Firestore: ${snap.docs.length}`);

  const groups = new Map<string, {
    primaryDocId: string;
    day: number;
    description: string;
    months?: number[];
    customDate?: string;
    allDocs: { id: string; data: any }[];
  }>();

  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    let desc = (data.description || '').trim();
    if (TYPO_MAP[desc]) {
      desc = TYPO_MAP[desc];
    }
    const day = data.day;
    const key = `${day}|${desc.toLowerCase()}`;

    if (!groups.has(key)) {
      groups.set(key, {
        primaryDocId: docSnap.id,
        day,
        description: desc,
        months: data.months,
        customDate: data.customDate,
        allDocs: [{ id: docSnap.id, data }]
      });
    } else {
      const g = groups.get(key)!;
      g.allDocs.push({ id: docSnap.id, data });
      if (data.months && (!g.months || g.months.length === 0)) {
        g.months = data.months;
      }
      if (data.customDate && !g.customDate) {
        g.customDate = data.customDate;
      }
    }
  }

  console.log(`Itens únicos identificados: ${groups.size}`);

  let deletedCount = 0;
  let updatedCount = 0;

  for (const [key, group] of groups.entries()) {
    // 1. Manter o primeiro documento e atualizar com dados limpos
    const primaryRef = doc(fixedPaymentsColl, group.primaryDocId);
    const cleanPayload: any = {
      day: group.day,
      description: group.description,
    };
    if (group.months && group.months.length > 0) {
      cleanPayload.months = group.months;
    }
    if (group.customDate) {
      cleanPayload.customDate = group.customDate;
    }

    await setDoc(primaryRef, cleanPayload);
    updatedCount++;

    // 2. Apagar todos os outros documentos duplicados do grupo
    const duplicatesToDelete = group.allDocs.filter(d => d.id !== group.primaryDocId);
    for (const dup of duplicatesToDelete) {
      await deleteDoc(doc(fixedPaymentsColl, dup.id));
      deletedCount++;
    }
  }

  console.log(`\n✅ LIMPEZA CONCLUÍDA!`);
  console.log(`Documentos únicos mantidos/atualizados: ${updatedCount}`);
  console.log(`Documentos duplicados deletados: ${deletedCount}`);

  // Verificação final
  const verifySnap = await getDocs(fixedPaymentsColl);
  console.log(`Total final de documentos no Firestore fixed_payments_v1: ${verifySnap.docs.length}`);

  process.exit(0);
}

cleanupDuplicates().catch(err => {
  console.error("❌ Erro:", err);
  process.exit(1);
});
