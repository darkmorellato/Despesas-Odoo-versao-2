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

- As regras **não foram executadas em emulador** neste repositório (requer
  Java). Teste antes com `firebase emulators:start --only firestore` ou
  simule no console (Firestore → Regras → Playground).
- O hash da senha de admin é legível pelas contas da equipe (necessário para a
  conferência no cliente). Para eliminar isso, mover a conferência para uma
  Cloud Function (requer plano Blaze).
