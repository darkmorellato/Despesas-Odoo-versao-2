import { initializeApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail } from 'firebase/auth';
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
import type { CollectionReference, DocumentReference, DocumentData } from 'firebase/firestore';

// Your web app's Firebase configuration
// As credenciais ficam no .env (ignorado pelo Git) — não exponha no código-fonte
// NOTA: Analytics (measurementId) foi removido — o app não usa métricas de
// visita e o gtag gerava avisos de cookie no console + ~30KB no bundle.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBTKRckW0phSEPoDNBwpSeb6rconsokbpI",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "miplace-despesas.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "miplace-despesas",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "miplace-despesas.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "770624075590",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:770624075590:web:297b8650a919818041d747",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// App Check (reCAPTCHA Enterprise): comprova ao Firebase que a requisição vem DESTE app e
// não de um script usando a apiKey pública. OPCIONAL: só liga com
// VITE_APPCHECK_SITE_KEY no .env (chave "score" do reCAPTCHA Enterprise no Google
// Cloud, sem segredo: o provedor v3/Classic está depreciado). Precisa ser iniciado antes de Auth/Firestore.
// Em desenvolvimento usa token de depuração (gerado no console do navegador e
// cadastrado em Firebase > App Check > Apps > Gerenciar tokens de depuração).
// Passo a passo e aplicação (enforcement): docs/SECURITY.md.
const appCheckSiteKey = import.meta.env.VITE_APPCHECK_SITE_KEY;
if (appCheckSiteKey) {
  if (import.meta.env.DEV) {
    (self as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN?: string | boolean }).FIREBASE_APPCHECK_DEBUG_TOKEN =
      import.meta.env.VITE_APPCHECK_DEBUG_TOKEN || true;
  }
  initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(appCheckSiteKey),
    isTokenAutoRefreshEnabled: true,
  });
}
export const auth = getAuth(app);
// E-mails do Firebase Auth (redefinição de senha etc.) em português
auth.languageCode = 'pt-BR';

// Initialize Firestore with IndexedDB persistent local cache
let firestoreDb: ReturnType<typeof getFirestore>;
try {
  firestoreDb = initializeFirestore(app, {
    ignoreUndefinedProperties: true,
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  });
} catch {
  firestoreDb = getFirestore(app);
}

export const db = firestoreDb;

// Analytics DESLIGADO de propósito (não usa métricas de visita; evita os
// avisos de cookie "_ga rejected for invalid domain" e reduz o bundle).
// Para reativar: import { getAnalytics, isSupported } from 'firebase/analytics'
// e restaurar measurementId no config acima.

// Re-export Firebase functions
export { 
  signInWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail,
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

export const getFirebaseRefs = (): {
  expensesRef: CollectionReference<DocumentData>;
  checksRef: DocumentReference<DocumentData>;
  fixedPaymentsRef: CollectionReference<DocumentData>;
} => {
  // Use standard Firebase path structure
  const miplaceDoc = doc(db, 'miplace-despesas', 'data');
  const expensesRef = collection(miplaceDoc, 'team_expenses_v2');

  const dataDoc = doc(db, 'miplace-despesas', 'data-team_data');
  const globalChecklistColl = collection(dataDoc, 'global_checklist_v1');
  const checksRef = doc(globalChecklistColl, 'checks');

  // Fixed payments collection
  const fixedPaymentsRef = collection(dataDoc, 'fixed_payments_v1');

  return { expensesRef, checksRef, fixedPaymentsRef };
};
