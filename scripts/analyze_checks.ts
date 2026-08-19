import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

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

async function analyze() {
  const dataDoc = doc(db, 'miplace-despesas', 'data-team_data');
  const checksDocRef = doc(dataDoc, 'global_checklist_v1', 'checks');
  const snap = await getDoc(checksDocRef);

  if (!snap.exists()) {
    console.log("No checks doc found!");
    process.exit(0);
  }

  const checks = snap.data().checks || {};
  const keys = Object.keys(checks);
  console.log(`Total keys in checks: ${keys.length}`);

  const byYearMonth: Record<string, string[]> = {};
  keys.forEach(k => {
    const parts = k.split('-');
    if (parts.length >= 3) {
      const year = parts[0];
      const month = parts[1];
      const ym = `${year}-${month}`;
      if (!byYearMonth[ym]) byYearMonth[ym] = [];
      byYearMonth[ym].push(parts.slice(2).join('-'));
    }
  });

  console.log("Breakdown by Year-Month:");
  Object.keys(byYearMonth).sort().forEach(ym => {
    console.log(`  ${ym}: ${byYearMonth[ym].length} items`);
  });

  console.log("\nSample keys from 2026-1 (Feb 2026):");
  if (byYearMonth['2026-1']) {
    console.log(byYearMonth['2026-1'].slice(0, 30));
  }

  process.exit(0);
}

analyze();
