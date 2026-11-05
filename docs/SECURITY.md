# Segurança — modelo de acesso

## Como funciona

- **Login:** Firebase Authentication com **e-mail/senha**. A senha é verificada
  pelo servidor do Firebase; nada de senha no bundle do app.
- **Autorização:** `firestore.rules` só libera leitura/escrita para as contas da
  equipe (lista de e-mails em `isTeamMember()`). Um token **anônimo** — que
  qualquer pessoa com a apiKey pública consegue — não acessa nada.
- **Dono (`darkmorelato@miplace.com`):** único que cria/exclui usuários, troca
  senhas e altera a senha mestra (`system_users_v1`, `system_settings_v1`). A
  equipe só atualiza o campo `lastLogin` do perfil.
- **Auditoria:** `audit_logs_v1` não pode ser excluída.
- **Senha de admin (editar/excluir despesas):** confirmação extra, conferida
  contra o hash SHA-256 com salt guardado no Firestore. É uma segunda trava de
  uso, não o controle de acesso (esse é o login + regras).

## Colocando no ar (ordem importa)

A publicação das regras novas **derruba o app antigo** (que entrava como
anônimo). Faça tudo na mesma janela:

1. **Console Firebase** → Authentication → Sign-in method → ativar **E-mail/senha**.
2. Criar as contas (use as mesmas senhas de hoje; mínimo 6 caracteres):
   ```bash
   node scripts/create_auth_users.mjs
   ```
3. Publicar o app novo e, em seguida, as regras:
   ```bash
   npm run build
   firebase deploy --only hosting
   firebase deploy --only firestore:rules
   ```
4. Testar o login com as duas contas (e confirmar que "Excluir/Editar" pede a
   senha de admin normalmente).
5. **Console Firebase** → Authentication → Sign-in method → **desativar
   "Anônimo"** (passo final; o app novo não usa mais).

Se algo der errado, o rollback é republicar as regras anteriores (`git show
HEAD~:firestore.rules > firestore.rules`) e o hosting anterior.

## Redefinição de senha

A tela de login tem **"Esqueci minha senha"**: envia o e-mail de redefinição do
Firebase Auth (em português) para o endereço digitado. A tela sempre mostra a
mesma mensagem, exista ou não a conta (não revela quais e-mails são cadastrados).

- Vale só para a **senha de login**. A senha de admin (editar/excluir) é outra e
  continua sendo trocada por `scripts/seed_users.mjs`.
- O e-mail só chega se a caixa de entrada existir. Os textos do e-mail podem ser
  ajustados em Firebase → Authentication → Templates.

## App Check (reCAPTCHA v3)

Faz o Firebase aceitar chamadas só do SEU app, e não de scripts que usem a apiKey
pública. O código já está pronto e **fica desligado** até existir a chave:

1. Crie uma chave **reCAPTCHA v3** em https://www.google.com/recaptcha/admin com
   os domínios `miplace-despesas.web.app`, `miplace-despesas.firebaseapp.com` e
   `localhost`.
2. Firebase → App Check → Apps → registre o app web com essa chave (a secreta).
3. Coloque a chave de **site** em `.env`: `VITE_APPCHECK_SITE_KEY=...`.
4. `npm run build` e `firebase deploy --only hosting`.
5. Deixe **1–2 dias em modo de monitoramento** (App Check → APIs) e confira que as
   requisições "não verificadas" caíram a ~0. Só então clique em **Aplicar** para
   Firestore (e Authentication, se quiser).
6. Desenvolvimento: abra o app local, copie o token de depuração que aparece no
   console do navegador e cadastre em App Check → Gerenciar tokens de depuração.

**App desktop (Electron) não é compatível:** ele carrega `dist/index.html` por
`file://`, origem que o reCAPTCHA não valida. Decisão do projeto: **o uso é só
pelo site**. Com o App Check aplicado, o app desktop perde o acesso ao Firestore.
Se um dia o desktop voltar a ser necessário, sirva-o por `http://localhost`
(domínio cadastrado no reCAPTCHA) ou deixe o App Check sem aplicar.

## Monitoramento de erros (Sentry, opcional)

Sem `VITE_SENTRY_DSN` nada é carregado nem enviado. Com ele, erros de renderização
(error boundary global e por tela) e os registrados por `logger.error` vão para o
Sentry. Por ser app financeiro, o envio é restrito: sem dados do usuário, sem
breadcrumbs de console, cliques e requisições, sem replay e sem tracing, com
cookies, headers e query da URL removidos (`src/shared/utils/monitoring.ts`).
Evite colocar valores e descrições de despesas em mensagens de erro.

## Testes das regras

`npm run test:rules` sobe o emulador do Firestore e executa
`src/__tests__/rules/firestore.rules.test.ts` (requer **Java 21+** instalado;
no Arch: `sudo pacman -S jre21-openjdk`). Cobrem: acesso negado para quem não
tem login, token anônimo, e-mail fora da lista, outro provedor e e-mail com caixa
diferente; permissões da equipe e do dono; `lastLogin` como único campo que a
equipe altera em usuários; senha mestra só pelo dono; auditoria sem exclusão; e
caminhos não listados negados. O job `rules` do CI roda o mesmo comando em todo
push e pull request.

`src/__tests__/rules/authIntegration.test.ts` complementa com Auth + Firestore
**reais** (emuladores) e o SDK `firebase` do projeto: o token é emitido de verdade
(provedor `password`, e-mail da equipe), provando que as regras funcionam com o
que o SDK envia, além de login, redefinição de senha, `writeBatch` (rateio), a
consulta da janela recente e `onSnapshot` com metadados. Os testes de regras e
de integração rodam em sequência (compartilham o emulador).

**Ao mudar as regras ou a lista de e-mails**, atualize também as constantes
`TEAM_EMAIL`/`OWNER_EMAIL` no teste e rode `npm run test:rules` antes de publicar.

## Manutenção

- **Novo usuário:** adicionar o e-mail em `isTeamMember()` (`firestore.rules`),
  em `scripts/create_auth_users.mjs` e `scripts/seed_users.mjs`; rodar os
  scripts e publicar as regras.
- **Scripts de manutenção** (`scripts/*.mjs`) pedem e-mail/senha da equipe
  (ou `SCRIPT_EMAIL` / `SCRIPT_PASSWORD`). Escritas em usuários/senha mestra
  exigem a conta do dono.
- **Nunca exclua** uma conta da lista no Firebase Auth sem tirá-la antes das
  regras: o cadastro por e-mail é aberto no plano Spark, e quem registrar aquele
  e-mail passaria a ser considerado "equipe".
- Senhas legadas em texto plano em `system_users_v1`: rode
  `node scripts/seed_users.mjs --hash-legacy` e confira com
  `node scripts/check_users_fields.mjs`.

## Limitações conhecidas

- O hash da senha de admin é legível pelas contas da equipe (necessário para a
  conferência no cliente). Para eliminar isso, mover a conferência para uma
  Cloud Function (requer plano Blaze).
