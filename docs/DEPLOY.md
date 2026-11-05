# Deploy automático (GitHub Actions → Firebase)

## Como funciona

Todo push na `main` roda no `.github/workflows/ci.yml`:

```
verify (tipos, lint, testes, build) ─┐
rules  (regras no emulador)          ─┴─► deploy-hosting ─► rules-changed ─► deploy-rules
                                           (automático)                     (pede aprovação,
                                                                             só se firestore.rules mudou)
```

- **Nada publica se um teste falhar.** O `dist` testado no job `verify` é o mesmo
  que vai para o Hosting (sem novo build).
- **Hosting** publica sozinho depois de `verify` + `rules` verdes.
- **Regras do Firestore** só são publicadas se o `firestore.rules` mudou naquele
  push, **depois** do site (a ordem importa: o app antigo quebra se as regras
  vierem antes) e **só depois da sua aprovação** no GitHub (ambiente
  `firebase-rules`). Uma regra errada pode travar o app inteiro, por isso há um
  humano no caminho.
- **Pull requests nunca publicam.** Os jobs de deploy só existem em push/botão na
  `main`.
- Enquanto as variáveis `GCP_*` não existirem, os jobs de deploy ficam **pulados**
  (o CI continua verde).

### Botão manual

Aba **Actions → CI → Run workflow** (na `main`): testa e publica o site. Marque
`deploy_rules` para publicar também as regras (também pede aprovação).

## Segurança da autenticação

Não há chave de serviço guardada no GitHub. É **federação OIDC**: a cada execução
o GitHub prova a identidade e o Google devolve credenciais que expiram em minutos.

- O repositório é **público**, então o acesso é travado no provedor do Google:
  só tokens do repositório `darkmorellato/Despesas-Odoo-versao-2` **e** da branch
  `main` são aceitos. Pull requests, forks e outras branches não conseguem
  assumir a conta.
- A conta `github-deployer` tem só três papéis: *Firebase Hosting Admin*,
  *Firebase Rules Admin* e *Service Usage Consumer* (o `firebase-tools` consulta
  quais APIs estão ativas). Não pode ler dados do Firestore nem mexer em usuários.
- O token OIDC (`id-token: write`) é concedido apenas aos jobs de deploy.

## Configuração (uma vez)

### 1. Identidade no Google Cloud

Precisa ser Owner do projeto e estar logado (`firebase login`):

```bash
node scripts/setup_deploy_identity.mjs
```

O script é idempotente (pode rodar de novo). Ele cria a conta de serviço, concede os
papéis, cria o pool/provedor OIDC com a condição de repositório + `main` e libera
só este repositório a assumir a conta. Ao final imprime os valores da etapa 2.

### 2. Variáveis do GitHub (não são segredos)

```bash
gh variable set GCP_WIF_PROVIDER --body "projects/770624075590/locations/global/workloadIdentityPools/github/providers/github-actions"
gh variable set GCP_SERVICE_ACCOUNT --body "github-deployer@miplace-despesas.iam.gserviceaccount.com"
# chave de SITE do App Check (pública; a mesma do .env local)
gh variable set VITE_APPCHECK_SITE_KEY --body "<valor de VITE_APPCHECK_SITE_KEY>"
```

Sem `VITE_APPCHECK_SITE_KEY`, o build do CI sai com o App Check desligado.

### 3. Ambiente de aprovação das regras

```bash
ID=$(gh api user --jq .id)
echo "{\"reviewers\":[{\"type\":\"User\",\"id\":$ID}],\"deployment_branch_policy\":{\"protected_branches\":false,\"custom_branch_policies\":true}}" \
  | gh api -X PUT repos/darkmorellato/Despesas-Odoo-versao-2/environments/firebase-rules --input -
gh api -X POST repos/darkmorellato/Despesas-Odoo-versao-2/environments/firebase-rules/deployment-branch-policies -f name=main
```

Isso cria o ambiente `firebase-rules` com você como revisor e limitado à `main`.

## Reverter (rollback)

- **Site:** Firebase Console → Hosting → *Release history* → "Rollback" na versão
  anterior (instantâneo), ou `firebase hosting:rollback`.
- **Regras:** `git revert` do commit que mudou `firestore.rules` e novo push (passa
  de novo pela aprovação), ou publicar a versão anterior pelo Console → Firestore →
  Regras → Histórico.

## O que o deploy automático NÃO faz

- Aplicar o App Check (*enforcement*): continua sendo um clique seu no console,
  depois do período de monitoramento (ver `docs/SECURITY.md`).
- Criar contas de usuário (`scripts/create_auth_users.mjs`) nem trocar senhas.
- Publicar em outro lugar: se houver integração com a Vercel no repositório, ela é
  independente e não faz parte deste fluxo.
