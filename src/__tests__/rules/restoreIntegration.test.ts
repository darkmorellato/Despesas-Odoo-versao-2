/**
 * Restauração de backup contra o Firestore REAL (emulador) com o SDK do projeto:
 * prova que `uploadExpenses` preserva o createdAt original, mantém campos
 * acrescentados depois do backup (merge), limpa os dados de exclusão e é
 * idempotente. Roda com `npm run test:rules`.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { initializeApp, deleteApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, createUserWithEmailAndPassword, getAuth } from 'firebase/auth';
import {
  Timestamp, collection, connectFirestoreEmulator, doc, getDoc, getDocs, getFirestore, setDoc, type Firestore,
} from 'firebase/firestore';
import { uploadExpenses } from '../../shared/services/backupRestore';
import type { Expense } from '../../shared/types';

const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
const fsHost = process.env.FIRESTORE_EMULATOR_HOST;
const EXPENSES = 'miplace-despesas/data/team_expenses_v2';

describe.skipIf(!authHost || !fsHost)('Restauração no Firestore real (emulador)', () => {
  let app: FirebaseApp;
  let db: Firestore;

  beforeAll(async () => {
    app = initializeApp({ apiKey: 'fake-api-key', projectId: 'demo-miplace-rules' }, 'restore-integration');
    const auth = getAuth(app);
    connectAuthEmulator(auth, `http://${authHost}`, { disableWarnings: true });
    db = getFirestore(app);
    const [host, port] = (fsHost as string).split(':');
    connectFirestoreEmulator(db, host, Number(port));
    // Conta do dono (também é da equipe): o authIntegration.test usa a outra conta no mesmo emulador
    await createUserWithEmailAndPassword(auth, 'darkmorelato@miplace.com', 'senha-de-teste-1');
  });

  afterAll(async () => { await deleteApp(app); });

  const backupItem = (over: Partial<Expense> & Record<string, unknown> = {}): Expense => ({
    id: 'restore-1', date: '2026-10-01', description: 'Restaurado do backup', store: 'Realme', category: 'Despesa Fixa',
    amount: 100, quantity: 1, employeeName: 'Ana', notes: '', deleted: false,
    // exatamente como o JSON do backup guarda um Timestamp
    createdAt: JSON.parse(JSON.stringify(new Timestamp(1700000000, 123000))),
    ...over,
  } as Expense);

  it('mantém o createdAt original, os campos extras e limpa a exclusão num documento existente', async () => {
    const ref = doc(db, EXPENSES, 'restore-1');
    await setDoc(ref, {
      description: 'Versão antiga', date: '2026-10-01', store: 'Realme', amount: 1,
      createdAt: Timestamp.fromMillis(Date.now()), // criado "agora" na nuvem
      campoExtra: 'acrescentado depois do backup', groupId: 'g-nuvem',
      deleted: true, deletedAt: Timestamp.now(), deleteReason: 'engano', deletedBy: 'Bia',
    });

    const result = await uploadExpenses([backupItem()], collection(db, EXPENSES));
    expect(result).toEqual({ imported: 1, failed: 0 });

    const data = (await getDoc(ref)).data()!;
    expect(data.description).toBe('Restaurado do backup');                 // valores do backup valem
    expect(data.amount).toBe(100);
    expect(data.createdAt).toBeInstanceOf(Timestamp);
    expect(data.createdAt.seconds).toBe(1700000000);                       // data ORIGINAL preservada
    expect(data.createdAt.nanoseconds).toBe(123000); // o Firestore guarda microssegundos
    expect(data.campoExtra).toBe('acrescentado depois do backup');          // merge: nada foi apagado
    expect(data.groupId).toBe('g-nuvem');
    expect(data.deleted).toBe(false);
    expect(data.deletedAt).toBeNull();
    expect(data.deleteReason).toBeNull();
    expect(data.deletedBy).toBeNull();
  });

  it('é idempotente: restaurar o mesmo arquivo duas vezes não duplica nem altera o createdAt', async () => {
    const col = collection(db, EXPENSES);
    await uploadExpenses([backupItem({ id: 'idem-1' })], col);
    const first = (await getDoc(doc(db, EXPENSES, 'idem-1'))).data()!;
    await uploadExpenses([backupItem({ id: 'idem-1' })], col);
    const second = (await getDoc(doc(db, EXPENSES, 'idem-1'))).data()!;
    expect(second.createdAt.seconds).toBe(first.createdAt.seconds);
    const all = await getDocs(col);
    expect(all.docs.filter(d => d.id === 'idem-1')).toHaveLength(1);
  });

  it('documento novo (sem id) mantém a data original; sem data usa a hora do servidor', async () => {
    const col = collection(db, EXPENSES);
    const { id: _a, ...comData } = backupItem({ description: 'Novo com data' });
    const { id: _b, createdAt: _c, ...semData } = backupItem({ description: 'Novo sem data' });
    await uploadExpenses([comData as Expense, semData as Expense], col);

    const docs = (await getDocs(col)).docs.map(d => d.data());
    const com = docs.find(d => d.description === 'Novo com data')!;
    const sem = docs.find(d => d.description === 'Novo sem data')!;
    expect(com.createdAt.seconds).toBe(1700000000);
    expect(sem.createdAt).toBeInstanceOf(Timestamp);
    expect(Math.abs(sem.createdAt.seconds - Date.now() / 1000)).toBeLessThan(120); // "agora"
  });

  it('o prazo de exclusão passa a valer pela data ORIGINAL (registro antigo não volta a ser "novo")', async () => {
    await uploadExpenses([backupItem({ id: 'prazo-1' })], collection(db, EXPENSES));
    const created = (await getDoc(doc(db, EXPENSES, 'prazo-1'))).data()!.createdAt as Timestamp;
    const ageHours = (Date.now() - created.toMillis()) / 3600000;
    expect(ageHours).toBeGreaterThan(24); // muito mais velho que a janela de 24h
  });
});
