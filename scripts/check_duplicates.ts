import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

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

async function checkDups() {
  const fixedPaymentsColl = collection(db, 'miplace-despesas', 'data-team_data', 'fixed_payments_v1');
  const snap = await getDocs(fixedPaymentsColl);
  console.log('Total docs in Firestore:', snap.docs.length);

  const countMap: Record<string, number> = {};
  const docsList: any[] = [];

  snap.docs.forEach(d => {
    const data = d.data();
    const key = `${data.day} | ${data.description}`;
    countMap[key] = (countMap[key] || 0) + 1;
    docsList.push({ id: d.id, day: data.day, description: data.description });
  });

  const dups = Object.entries(countMap).filter(([_, count]) => count > 1);
  console.log('Duplicates count:', dups.length);
  if (dups.length > 0) {
    console.log('Duplicated items:', dups);
  }

  process.exit(0);
}

checkDups().catch(err => {
  console.error(err);
  process.exit(1);
});
