/**
 * Cria a IDENTIDADE DE DEPLOY do GitHub Actions no Google Cloud (uma vez).
 *
 * Em vez de guardar uma chave de serviço no GitHub, usa federação OIDC (Workload
 * Identity): o GitHub prova quem é a cada execução e o Google devolve credenciais
 * temporárias. Nada permanente fica salvo fora do Google.
 *
 * O que cria (idempotente — pode rodar de novo sem duplicar):
 *   1. Conta de serviço  github-deployer@miplace-despesas.iam.gserviceaccount.com
 *   2. Papéis mínimos no projeto: Firebase Hosting Admin, Firebase Rules Admin e
 *      Service Usage Consumer (o firebase-tools consulta APIs ativas)
 *   3. Pool + provedor OIDC "github-actions", com condição que só aceita tokens
 *      do repositório abaixo E da branch main (pull requests, forks e outras
 *      branches NUNCA assumem a conta)
 *   4. Vínculo: só este repositório pode assumir a conta de serviço
 *
 * Pré-requisitos: ser Owner do projeto e estar logado no Firebase CLI
 *   (`firebase login`). APIs IAM, IAM Credentials e STS ativadas (o script ativa).
 *
 * Uso:  node scripts/setup_deploy_identity.mjs
 * Depois: siga docs/DEPLOY.md (variáveis do GitHub e ambiente de aprovação).
 */
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';

const PROJECT = 'miplace-despesas';
const PROJECT_NUMBER = '770624075590';
const REPO = 'darkmorellato/Despesas-Odoo-versao-2';
const SA_ID = 'github-deployer';
const SA = `${SA_ID}@${PROJECT}.iam.gserviceaccount.com`;
const ROLES = ['roles/firebasehosting.admin', 'roles/firebaserules.admin', 'roles/serviceusage.serviceUsageConsumer'];

// Token do login do Firebase CLI (credencial OAuth pública do firebase-tools)
const stored = JSON.parse(readFileSync(`${homedir()}/.config/configstore/firebase-tools.json`, 'utf8')).tokens;
const refreshed = await fetch('https://www.googleapis.com/oauth2/v3/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    refresh_token: stored.refresh_token,
    client_id: '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com',
    client_secret: 'j9iVZfS8kkCEFUPaAeJV0sAi',
    grant_type: 'refresh_token',
  }),
});
const token = (await refreshed.json()).access_token;
if (!token) { console.error('Sem token: rode `firebase login` e tente de novo.'); process.exit(1); }

const call = async (method, url, body) => {
  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'x-goog-user-project': PROJECT, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { json = { raw: text.slice(0, 200) }; }
  return { status: res.status, json };
};
const sleep = ms => new Promise(r => setTimeout(r, ms));
// A propagação de IAM/APIs recém-ativadas leva alguns segundos
const retry = async (fn, label, tries = 8) => {
  for (let i = 0; i < tries; i++) {
    const r = await fn();
    if (r.status < 400 || r.status === 409) return r;
    if (i === tries - 1) { console.error(`✘ ${label}:`, r.status, JSON.stringify(r.json).slice(0, 300)); process.exit(1); }
    await sleep(5000);
  }
};
const waitOp = async (name) => {
  for (let i = 0; i < 30; i++) {
    const o = await call('GET', `https://iam.googleapis.com/v1/${name}`);
    if (o.json.done) return;
    await sleep(2000);
  }
};

// 0) APIs necessárias
{
  const r = await call('POST', `https://serviceusage.googleapis.com/v1/projects/${PROJECT}/services:batchEnable`, {
    serviceIds: ['iam.googleapis.com', 'iamcredentials.googleapis.com', 'sts.googleapis.com'],
  });
  if (r.status >= 400) { console.error('✘ ativar APIs:', JSON.stringify(r.json).slice(0, 300)); process.exit(1); }
  console.log('✔ APIs IAM / IAM Credentials / STS ativas');
  await sleep(5000);
}

// 1) conta de serviço
{
  const r = await retry(() => call('POST', `https://iam.googleapis.com/v1/projects/${PROJECT}/serviceAccounts`, {
    accountId: SA_ID,
    serviceAccount: {
      displayName: 'GitHub Actions (deploy do Despesas Miplace)',
      description: 'Deploy do Hosting e das regras do Firestore via OIDC. Sem chaves.',
    },
  }), 'conta de serviço');
  console.log(r.status === 409 ? '= conta de serviço já existia:' : '✔ conta de serviço criada:', SA);
}

// 2) papéis mínimos no projeto (preserva os existentes)
{
  await sleep(3000);
  const pol = await retry(() => call('POST', `https://cloudresourcemanager.googleapis.com/v1/projects/${PROJECT}:getIamPolicy`, {}), 'ler política');
  const policy = pol.json;
  policy.bindings = policy.bindings || [];
  for (const role of ROLES) {
    let b = policy.bindings.find(x => x.role === role && !x.condition);
    if (!b) { b = { role, members: [] }; policy.bindings.push(b); }
    const member = `serviceAccount:${SA}`;
    if (!b.members.includes(member)) b.members.push(member);
  }
  await retry(() => call('POST', `https://cloudresourcemanager.googleapis.com/v1/projects/${PROJECT}:setIamPolicy`, { policy }), 'gravar política');
  console.log('✔ papéis:', ROLES.join(', '));
}

// 3) pool + provedor OIDC travado em repositório + branch main
const poolsBase = `https://iam.googleapis.com/v1/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools`;
{
  const pool = await retry(() => call('POST', `${poolsBase}?workloadIdentityPoolId=github`, {
    displayName: 'GitHub Actions',
    description: 'OIDC do GitHub Actions',
  }), 'pool');
  if (pool.status < 400 && pool.json.name) await waitOp(pool.json.name);
  console.log(pool.status === 409 ? '= pool já existia' : '✔ pool criado');

  const prov = await retry(() => call('POST', `${poolsBase}/github/providers?workloadIdentityPoolProviderId=github-actions`, {
    displayName: 'GitHub (main)',
    attributeMapping: {
      'google.subject': 'assertion.sub',
      'attribute.repository': 'assertion.repository',
      'attribute.ref': 'assertion.ref',
    },
    attributeCondition: `assertion.repository == '${REPO}' && assertion.ref == 'refs/heads/main'`,
    oidc: { issuerUri: 'https://token.actions.githubusercontent.com' },
  }), 'provedor OIDC');
  if (prov.status < 400 && prov.json.name) await waitOp(prov.json.name);
  console.log(prov.status === 409 ? '= provedor OIDC já existia' : `✔ provedor OIDC criado (só ${REPO}, branch main)`);
}

// 4) só este repositório assume a conta de serviço
{
  const member = `principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/github/attribute.repository/${REPO}`;
  const sp = await retry(() => call('POST', `https://iam.googleapis.com/v1/projects/${PROJECT}/serviceAccounts/${SA}:getIamPolicy`, {}), 'ler política da conta');
  const policy = sp.json;
  policy.bindings = policy.bindings || [];
  let b = policy.bindings.find(x => x.role === 'roles/iam.workloadIdentityUser');
  if (!b) { b = { role: 'roles/iam.workloadIdentityUser', members: [] }; policy.bindings.push(b); }
  if (!b.members.includes(member)) b.members.push(member);
  await retry(() => call('POST', `https://iam.googleapis.com/v1/projects/${PROJECT}/serviceAccounts/${SA}:setIamPolicy`, { policy }), 'vincular conta');
  console.log('✔ vínculo workloadIdentityUser (somente este repositório)');
}

const provider = await call('GET', `${poolsBase}/github/providers/github-actions`);
console.log('\nCondição ativa no provedor:', provider.json.attributeCondition);
console.log('\nPróximo passo — variáveis do GitHub (docs/DEPLOY.md):');
console.log(`  gh variable set GCP_WIF_PROVIDER --body "projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/github/providers/github-actions"`);
console.log(`  gh variable set GCP_SERVICE_ACCOUNT --body "${SA}"`);
