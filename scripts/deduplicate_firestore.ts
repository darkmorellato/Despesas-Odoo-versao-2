import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
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

async function deduplicateFirestore() {
  console.log("=== REMOVENDO TODAS AS DUPLICATAS DO FIRESTORE ===");
  const dataDoc = doc(db, 'miplace-despesas', 'data-team_data');
  const fixedPaymentsColl = collection(dataDoc, 'fixed_payments_v1');

  // 1. Fetch all docs currently in Firestore
  const snap = await getDocs(fixedPaymentsColl);
  console.log(`Documentos encontrados no Firestore: ${snap.docs.length}`);

  // 2. Delete ALL existing docs in fixed_payments_v1
  console.log("Apagando todos os documentos antigos para eliminar duplicatas...");
  for (const docSnap of snap.docs) {
    await deleteDoc(doc(fixedPaymentsColl, docSnap.id));
  }
  console.log("✅ Coleção fixed_payments_v1 totalmente limpa.");

  // 3. Re-insert exact 53 items from FIXED_NOTIFICATIONS_DEFAULT using deterministic IDs
  console.log(`Inserindo exatamente os ${FIXED_NOTIFICATIONS_DEFAULT.length} itens oficiais de constants.ts...`);
  for (const item of FIXED_NOTIFICATIONS_DEFAULT) {
    // Usar o ID único do item (ex: default_1, default_2, etc.)
    const docRef = doc(fixedPaymentsColl, item.id);
    const payload: any = {
      day: item.day,
      description: item.description,
    };
    if (item.months) {
      payload.months = item.months;
    }
    await setDoc(docRef, payload);
  }

  // 4. Verify count
  const verifySnap = await getDocs(fixedPaymentsColl);
  console.log(`\n✅ CONCLUÍDO COM SUCESSO!`);
  console.log(`Total final de documentos no Firestore fixed_payments_v1: ${verifySnap.docs.length}`);

  process.exit(0);
}

deduplicateFirestore().catch(err => {
  console.error("❌ Erro:", err);
  process.exit(1);
});
