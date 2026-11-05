/**
 * Login compartilhado pelos scripts de manutenção (scripts/*.mjs).
 *
 * As firestore.rules só aceitam contas de e-mail/senha da equipe — não existe
 * mais login anônimo. Os scripts entram com uma dessas contas:
 *   SCRIPT_EMAIL / SCRIPT_PASSWORD   (variáveis de ambiente), ou
 *   prompt interativo (a senha é digitada sem eco).
 *
 * Operações de escrita em system_users_v1 / system_settings_v1 (seed_users.mjs)
 * exigem a conta do DONO (darkmorelato@miplace.com).
 */
import { signInWithEmailAndPassword } from 'firebase/auth';
import { createInterface } from 'node:readline/promises';

/** Pergunta no terminal. `hidden` oculta o que é digitado (senhas). */
export async function prompt(question, { hidden = false } = {}) {
  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: !!process.stdin.isTTY });
  if (hidden && process.stdin.isTTY) {
    // Só ecoa o texto da pergunta; o que o usuário digita não aparece.
    rl._writeToOutput = (str) => { if (str.startsWith(question)) rl.output.write(str); };
  }
  try {
    const answer = (await rl.question(question)).trim();
    if (hidden) process.stdout.write('\n');
    return answer;
  } finally {
    rl.close();
  }
}

/** Autentica o script no Firebase Auth com e-mail/senha. Encerra o processo se falhar. */
export async function signInForScript(auth, { env = process.env } = {}) {
  const email = (env.SCRIPT_EMAIL || (await prompt('E-mail da conta da equipe: '))).toLowerCase();
  const password = env.SCRIPT_PASSWORD || (await prompt('Senha: ', { hidden: true }));
  try {
    await signInWithEmailAndPassword(auth, email, password);
    console.log(`Autenticado como ${email}.`);
    return email;
  } catch (e) {
    console.error(`Falha no login (${e.code || e.message}). Confira e-mail/senha e se a conta existe`);
    console.error('(crie as contas com: node scripts/create_auth_users.mjs).');
    process.exit(1);
  }
}
