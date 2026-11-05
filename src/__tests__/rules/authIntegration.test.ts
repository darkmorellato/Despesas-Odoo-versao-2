/**
 * Integração Auth + Firestore REAIS (emuladores) com o SDK `firebase` do projeto.
 *
 * Os testes de firestore.rules usam tokens simulados. Aqui o token é emitido de
 * verdade pelo emulador de Auth, provando que as regras (provedor 'password' +
 * e-mail da equipe) funcionam com o que o SDK realmente envia — e que as
 * chamadas que o app usa (login, redefinição de senha, writeBatch, consulta da
 * janela recente, onSnapshot) continuam válidas após atualizar o Firebase.
 *
 * Rodam com `npm run test:rules` (sobe os emuladores).
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { initializeApp, deleteApp, type FirebaseApp } from 'firebase/app';
import {
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  getAuth,
  sendPasswordResetEmail,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut,
  type Auth,
} from 'firebase/auth';
import {
  collection,
  connectFirestoreEmulator,
  doc,
  getDocs,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  where,
  writeBatch,
  type Firestore,
} from 'firebase/firestore';
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';

const TEAM_EMAIL = 'miplaceabner@miplace.com';
const OUTSIDER_EMAIL = 'intruso@exemplo.com';
const PASSWORD = 'senha-de-teste-1';

const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
const fsHost = process.env.FIRESTORE_EMULATOR_HOST;
const emulators = !!authHost && !!fsHost;

const EXPENSES = 'miplace-despesas/data/team_expenses_v2';

describe.skipIf(!emulators)('Auth + Firestore reais (emuladores)', () => {
  let app: FirebaseApp;
  let auth: Auth;
  let db: Firestore;

  beforeAll(async () => {
    app = initializeApp({ apiKey: 'fake-api-key', projectId: 'demo-miplace-rules' }, 'auth-integration');
    auth = getAuth(app);
    connectAuthEmulator(auth, `http://${authHost}`, { disableWarnings: true });
    db = getFirestore(app);
    const [host, port] = (fsHost as string).split(':');
    connectFirestoreEmulator(db, host, Number(port));

    // contas "de verdade" no emulador (como as criadas por create_auth_users.mjs)
    await createUserWithEmailAndPassword(auth, TEAM_EMAIL, PASSWORD);
    await signOut(auth);
    await createUserWithEmailAndPassword(auth, OUTSIDER_EMAIL, PASSWORD);
    await signOut(auth);
  });

  afterAll(async () => {
    await signOut(auth).catch(() => {});
    await deleteApp(app);
  });

  const windowQuery = () =>
    query(collection(db, EXPENSES), where('date', '>=', '2026-09-01'), orderBy('date', 'desc'));

  it('login da equipe emite token do provedor "password" e libera os dados', async () => {
    const cred = await signInWithEmailAndPassword(auth, TEAM_EMAIL, PASSWORD);
    const token = await cred.user.getIdTokenResult();
    expect(token.signInProvider).toBe('password');
    expect(token.claims.email).toBe(TEAM_EMAIL);

    await assertSucceeds(setDoc(doc(db, EXPENSES, 'e1'), { date: '2026-10-01', amount: 10, deleted: false }));
    await assertSucceeds(getDocs(windowQuery()));
  });

  it('writeBatch (rateio atômico) funciona com o token real', async () => {
    await signInWithEmailAndPassword(auth, TEAM_EMAIL, PASSWORD);
    const batch = writeBatch(db);
    for (const store of ['Dom Pedro II', 'Realme', 'Xv de Novembro', 'Premium']) {
      batch.set(doc(collection(db, EXPENSES)), { date: '2026-11-01', store, amount: 25, groupId: 'g1', deleted: false });
    }
    await assertSucceeds(batch.commit());

    const snap = await getDocs(windowQuery());
    expect(snap.docs.filter(d => d.data().groupId === 'g1')).toHaveLength(4);
  });

  it('onSnapshot com includeMetadataChanges entrega dados confirmados (fromCache=false)', async () => {
    await signInWithEmailAndPassword(auth, TEAM_EMAIL, PASSWORD);
    await setDoc(doc(db, EXPENSES, 'snap1'), { date: '2026-10-02', amount: 5, deleted: false });
    const confirmed = await new Promise<boolean>((resolve, reject) => {
      const unsub = onSnapshot(
        query(collection(db, EXPENSES), orderBy('date', 'desc')),
        { includeMetadataChanges: true },
        snap => {
          if (!snap.metadata.fromCache) {
            unsub();
            resolve(snap.size > 0);
          }
        },
        reject
      );
    });
    expect(confirmed).toBe(true);
  });

  it('login anônimo (token real) NÃO acessa nada', async () => {
    await signInAnonymously(auth);
    await assertFails(getDocs(windowQuery()));
    await assertFails(setDoc(doc(db, EXPENSES, 'hack'), { amount: 1 }));
  });

  it('e-mail/senha FORA da equipe (token real) NÃO acessa nada', async () => {
    const cred = await signInWithEmailAndPassword(auth, OUTSIDER_EMAIL, PASSWORD);
    expect((await cred.user.getIdTokenResult()).signInProvider).toBe('password');
    await assertFails(getDocs(windowQuery()));
    await assertFails(setDoc(doc(db, EXPENSES, 'hack'), { amount: 1 }));
  });

  it('senha errada é recusada pelo Auth', async () => {
    await signOut(auth);
    // O emulador devolve 'auth/wrong-password'; o Firebase real, 'auth/invalid-credential'
    // (proteção contra enumeração de e-mails). O app mapeia os dois (authService).
    const error = await signInWithEmailAndPassword(auth, TEAM_EMAIL, 'errada').catch(e => e);
    expect(['auth/invalid-credential', 'auth/wrong-password']).toContain(error.code);
  });

  it('redefinição de senha: conta existente aceita; conta inexistente não revela nada', async () => {
    await expect(sendPasswordResetEmail(auth, TEAM_EMAIL)).resolves.toBeUndefined();
    // Com a proteção de enumeração do Firebase, e-mail desconhecido não gera erro útil
    await sendPasswordResetEmail(auth, 'ninguem@exemplo.com').catch(e => {
      expect(e.code).toBe('auth/user-not-found');
    });
  });
});
