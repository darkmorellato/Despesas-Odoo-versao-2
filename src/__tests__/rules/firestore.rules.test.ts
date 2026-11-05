/**
 * Testes das regras de segurança do Firestore (firestore.rules) contra o
 * emulador. NÃO rodam no `npm test` — precisam do emulador e Java:
 *
 *   npm run test:rules
 *
 * Garantem o modelo de acesso: só contas e-mail/senha da equipe entram;
 * tokens anônimos, outros provedores e e-mails fora da lista são negados;
 * operações sensíveis são exclusivas do dono; auditoria nunca é excluída.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { collection, deleteDoc, doc, getDoc, getDocs, orderBy, query, setDoc, updateDoc, where } from 'firebase/firestore';

const TEAM_EMAIL = 'miplaceabner@miplace.com';
const OWNER_EMAIL = 'darkmorelato@miplace.com';

const ROOT = 'miplace-despesas/data';
const TEAM = 'miplace-despesas/data-team_data';

/** Coleções de dados comuns (equipe lê e escreve tudo) */
const TEAM_PATHS = [
  `${ROOT}`,
  `${ROOT}/team_expenses_v2/e1`,
  `${TEAM}`,
  `${TEAM}/global_checklist_v1/checks`,
  `${TEAM}/fixed_payments_v1/p1`,
  `${TEAM}/todo_tasks_v1/t1`,
];

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-miplace-rules',
    firestore: { rules: readFileSync(resolve(process.cwd(), 'firestore.rules'), 'utf8') },
  });
});

afterAll(async () => {
  await env.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  // Dados pré-existentes para testes de leitura/atualização/exclusão
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    for (const p of TEAM_PATHS) await setDoc(doc(db, p), { seed: true });
    await setDoc(doc(db, `${TEAM}/audit_logs_v1/a1`), { actionType: 'EDIT' });
    await setDoc(doc(db, `${TEAM}/system_settings_v1/admin_master`), { hash: 'x' });
    await setDoc(doc(db, `${TEAM}/system_users_v1/u1`), { name: 'Abner', role: 'user', lastLogin: 'ontem', passwordHash: 'h' });
  });
});

// ------------------------------------------------------------------ contextos
const asTeam = () => env.authenticatedContext('uid-team', { email: TEAM_EMAIL, firebase: { sign_in_provider: 'password' } }).firestore();
const asOwner = () => env.authenticatedContext('uid-owner', { email: OWNER_EMAIL, firebase: { sign_in_provider: 'password' } }).firestore();

const DENIED_IDENTITIES: Array<[string, () => ReturnType<typeof asTeam>]> = [
  ['sem login', () => env.unauthenticatedContext().firestore()],
  ['login anônimo', () => env.authenticatedContext('uid-anon', { firebase: { sign_in_provider: 'anonymous' } }).firestore()],
  ['e-mail/senha fora da equipe', () => env.authenticatedContext('uid-x', { email: 'intruso@exemplo.com', firebase: { sign_in_provider: 'password' } }).firestore()],
  ['e-mail da equipe via Google (outro provedor)', () => env.authenticatedContext('uid-g', { email: TEAM_EMAIL, firebase: { sign_in_provider: 'google.com' } }).firestore()],
  ['e-mail com caixa diferente', () => env.authenticatedContext('uid-c', { email: 'MIPLACEABNER@miplace.com', firebase: { sign_in_provider: 'password' } }).firestore()],
];

// -------------------------------------------------------------------- negados
describe.each(DENIED_IDENTITIES)('acesso negado: %s', (_label, ctx) => {
  it.each([...TEAM_PATHS, `${TEAM}/audit_logs_v1/a1`, `${TEAM}/system_settings_v1/admin_master`, `${TEAM}/system_users_v1/u1`])(
    'não lê nem escreve em %s',
    async (path) => {
      const db = ctx();
      await assertFails(getDoc(doc(db, path)));
      await assertFails(setDoc(doc(db, path), { hack: true }));
    }
  );

  it('não lista despesas (consulta da janela recente)', async () => {
    const q = query(collection(ctx(), `${ROOT}/team_expenses_v2`), where('date', '>=', '2026-09-01'), orderBy('date', 'desc'));
    await assertFails(getDocs(q));
  });
});

// --------------------------------------------------------------------- equipe
describe('equipe (e-mail/senha, e-mail autorizado)', () => {
  it.each(TEAM_PATHS)('lê e escreve em %s', async (path) => {
    const db = asTeam();
    await assertSucceeds(getDoc(doc(db, path)));
    await assertSucceeds(setDoc(doc(db, path), { ok: true }));
  });

  it('lista despesas pela consulta da janela recente (where date >= + orderBy date)', async () => {
    const q = query(collection(asTeam(), `${ROOT}/team_expenses_v2`), where('date', '>=', '2026-09-01'), orderBy('date', 'desc'));
    await assertSucceeds(getDocs(q));
  });

  it('exclui despesas (exclusão lógica/física do app)', async () => {
    await assertSucceeds(deleteDoc(doc(asTeam(), `${ROOT}/team_expenses_v2/e1`)));
  });

  describe('auditoria', () => {
    it('lê, cria e atualiza logs', async () => {
      const db = asTeam();
      await assertSucceeds(getDoc(doc(db, `${TEAM}/audit_logs_v1/a1`)));
      await assertSucceeds(setDoc(doc(db, `${TEAM}/audit_logs_v1/novo`), { actionType: 'DELETE' }));
      await assertSucceeds(updateDoc(doc(db, `${TEAM}/audit_logs_v1/a1`), { reason: 'ajuste' }));
    });

    it('NUNCA exclui logs (nem a equipe, nem o dono)', async () => {
      await assertFails(deleteDoc(doc(asTeam(), `${TEAM}/audit_logs_v1/a1`)));
      await assertFails(deleteDoc(doc(asOwner(), `${TEAM}/audit_logs_v1/a1`)));
    });
  });

  describe('configurações do sistema (senha mestra)', () => {
    it('lê, mas não escreve', async () => {
      const db = asTeam();
      await assertSucceeds(getDoc(doc(db, `${TEAM}/system_settings_v1/admin_master`)));
      await assertFails(setDoc(doc(db, `${TEAM}/system_settings_v1/admin_master`), { hash: 'trocada' }));
      await assertFails(updateDoc(doc(db, `${TEAM}/system_settings_v1/admin_master`), { hash: 'trocada' }));
      await assertFails(deleteDoc(doc(db, `${TEAM}/system_settings_v1/admin_master`)));
    });
  });

  describe('usuários do sistema', () => {
    const userDoc = `${TEAM}/system_users_v1/u1`;

    it('lê perfis', async () => {
      await assertSucceeds(getDoc(doc(asTeam(), userDoc)));
    });

    it('atualiza SOMENTE lastLogin', async () => {
      await assertSucceeds(updateDoc(doc(asTeam(), userDoc), { lastLogin: 'agora' }));
    });

    it.each([
      ['perfil de acesso', { role: 'admin' }],
      ['hash de senha', { passwordHash: 'novo' }],
      ['nome', { name: 'Outro' }],
      ['lastLogin junto com outro campo', { lastLogin: 'agora', role: 'admin' }],
    ])('NÃO altera %s', async (_n, data) => {
      await assertFails(updateDoc(doc(asTeam(), userDoc), data));
    });

    it('NÃO cria nem exclui usuários', async () => {
      const db = asTeam();
      await assertFails(setDoc(doc(db, `${TEAM}/system_users_v1/novo`), { name: 'Fantasma', role: 'admin' }));
      await assertFails(deleteDoc(doc(db, userDoc)));
    });
  });
});

// ----------------------------------------------------------------------- dono
describe('dono (OWNER_EMAIL)', () => {
  it('escreve a senha mestra', async () => {
    await assertSucceeds(setDoc(doc(asOwner(), `${TEAM}/system_settings_v1/admin_master`), { hash: 'nova' }));
  });

  it('cria, altera e exclui usuários', async () => {
    const db = asOwner();
    await assertSucceeds(setDoc(doc(db, `${TEAM}/system_users_v1/novo`), { name: 'Novo', role: 'user' }));
    await assertSucceeds(updateDoc(doc(db, `${TEAM}/system_users_v1/u1`), { role: 'admin', passwordHash: 'novo' }));
    await assertSucceeds(deleteDoc(doc(db, `${TEAM}/system_users_v1/u1`)));
  });
});

// ---------------------------------------------------------- caminhos não listados
describe('caminhos não listados', () => {
  it.each([
    ['coleção desconhecida', 'outra-colecao/doc1'],
    ['subcoleção não prevista', `${TEAM}/segredos/s1`],
    ['raiz com outro documento', 'miplace-despesas/outro'],
  ])('nega até o dono: %s', async (_n, path) => {
    await assertFails(getDoc(doc(asOwner(), path)));
    await assertFails(setDoc(doc(asOwner(), path), { x: 1 }));
  });
});
