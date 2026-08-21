import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { 
  initializeFirestore, 
  getFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager, 
  collection, 
  doc, 
  query, 
  orderBy, 
  limit,
  onSnapshot, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  addDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';
import { CHECKLIST_DOC_ID } from './constants';

// Your web app's Firebase configuration
// As credenciais ficam no .env (ignorado pelo Git) — não exponha no código-fonte
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBTKRckW0phSEPoDNBwpSeb6rconsokbpI",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "miplace-despesas.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "miplace-despesas",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "miplace-despesas.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "770624075590",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:770624075590:web:297b8650a919818041d747",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-Z33RRM8XPD",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Initialize Firestore with IndexedDB persistent local cache
let firestoreDb: ReturnType<typeof getFirestore>;
try {
  firestoreDb = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  });
} catch {
  firestoreDb = getFirestore(app);
}

export const db = firestoreDb;

// Initialize Analytics (only in browser)
if (typeof window !== 'undefined') {
  getAnalytics(app);
}

// Re-export Firebase functions
export { 
  signInAnonymously, 
  onAuthStateChanged, 
  collection, 
  doc, 
  query, 
  orderBy, 
  limit,
  onSnapshot, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  addDoc, 
  serverTimestamp 
};

export const getFirebaseRefs = () => {
  let expensesRef: any;
  let checksRef: any;
  let fixedPaymentsRef: any;

  // Use standard Firebase path structure
  const miplaceDoc = doc(db, 'miplace-despesas', 'data');
  expensesRef = collection(miplaceDoc, 'team_expenses_v2');

  const dataDoc = doc(db, 'miplace-despesas', 'data-team_data');
  const globalChecklistColl = collection(dataDoc, 'global_checklist_v1');
  checksRef = doc(globalChecklistColl, 'checks');

  // Fixed payments collection
  const fixedPaymentsColl = collection(dataDoc, 'fixed_payments_v1');
  fixedPaymentsRef = fixedPaymentsColl;

  return { expensesRef, checksRef, fixedPaymentsRef };
};
