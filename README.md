# Sistema de Gestão de Despesas - Mi Place

Sistema completo para gestão de despesas de múltiplas lojas com dashboard analítico e sincronização em tempo real via Firebase.

## Funcionalidades

- **Dashboard Analítico**: Gráficos mensais/anuais com ranking de lojas e categorias
- **Gestão de Despesas**: Adicionar, editar e excluir despesas com sincronização em tempo real
- **Calendário de Pagamentos**: Controle de obrigações fixas com lembretes por data
- **Sistema de Backup**: Exportar/importar dados em JSON ou CSV
- **Multi-lojas**: Divisão automática de despesas entre lojas
- **Autenticação**: Login anônimo via Firebase Auth
- **Tempo Real**: Sincronização automática com Firebase Firestore
- **Resiliência**: Sistema funciona mesmo com cota excedida (v2.0.1)
- **Sincronização Automática**: Retry automático quando cota retorna (v2.0.1)

## Tecnologias

- **React 18** - Framework frontend
- **TypeScript** - Tipagem estática
- **Firebase** - Backend (Firestore + Auth)
- **Tailwind CSS** - Estilização utilitária
- **Vite** - Build tool
- **Vitest** - Testes unitários

## Instalação

### Pré-requisitos

- Node.js v18 ou superior
- npm v9 ou superior

### Passos

```bash
# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm run dev

# Build para produção
npm run build

# Executar testes
npm run test

# Preview do build
npm run preview
```

Acesse http://localhost:3000 no navegador.

## Uso

### 1. Configuração Inicial

1. Configure o nome do funcionário nas configurações
2. Selecione a loja padrão
3. Configure a moeda (padrão: R$)

### 2. Adicionar Despesa

1. Clique em "Nova Despesa" no dashboard
2. Preencha: data, descrição, categoria, valor
3. Selecione a loja (ou divisão automática)
4. Salve a despesa

### 3. Calendário de Pagamentos

- Visualize pagamentos fixos por data
- Marque como pago com confirmação
- Correção requer senha de administrador

### 4. Backup

- **Exportar JSON**: Backup completo com todas as despesas
- **Exportar CSV**: Formato compatível com Odoo
- **Restaurar**: Importe backup anterior

## Scripts Disponíveis

| Script | Descrição |
|--------|-----------|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build para produção |
| `npm run preview` | Preview do build |
| `npm run test` | Executar testes |
| `npm run test:ui` | Testes com interface |
| `npm run test:coverage` | Cobertura de testes |
| `npm run test:rules` | Testa o `firestore.rules` no emulador (requer Java 21+ e Firebase CLI global) |
| `npm run lint` | Lint do código |
| `npm run type-check` | Verificação de tipos |
| `node scripts/seed_users.mjs` | Cadastra/edita usuários (senha via prompt, só vai como hash para o Firestore) |
| `node scripts/seed_users.mjs --hash-legacy` | Converte senhas em texto plano existentes no Firestore para hash (senha não muda) |
| `node scripts/seed_users.mjs --master` | Define a senha mestra de admin (hash no Firestore) |
| `node scripts/seed_users.mjs --change NOVA_SENHA email@...` | Troca a senha de um usuário |

## Estrutura do Projeto

```
Despesas-Odoo-main/
├── public/                    # Assets estáticos (imagens, áudio)
├── src/
│   ├── components/            # Componentes React
│   │   ├── ui/                # Componentes de UI base
│   │   └── icons/             # Ícones 3D e simples
│   ├── config/                # Configurações
│   │   ├── firebase.ts        # Setup Firebase
│   │   └── constants.ts       # Constantes da aplicação
│   ├── hooks/                 # Hooks customizados
│   ├── types/                 # Definições TypeScript
│   ├── utils/                 # Funções utilitárias
│   ├── test/                  # Setup de testes
│   ├── App.tsx                # Componente principal
│   ├── main.tsx               # Entrada da aplicação
│   └── index.css              # Estilos globais
├── index.html                 # Template HTML
├── package.json               # Dependências e scripts
├── tsconfig.json              # Configuração TypeScript
├── vite.config.ts             # Configuração Vite
└── tailwind.config.js         # Configuração Tailwind
```

## Modelo de Dados

### Despesa (Expense)

```typescript
interface Expense {
  id: string;              // ID único (Firebase)
  date: string;            // YYYY-MM-DD
  description: string;     // Descrição
  store: StoreName;        // Loja
  category: CategoryName;  // Categoria
  amount: number;          // Valor
  quantity: number;        // Quantidade
  notes?: string;          // Observações
  employeeName: string;    // Nome do funcionário
  originalTotal?: number;  // Valor original (divisão)
  createdAt: Timestamp;    // Data de criação
  updatedAt?: Timestamp;   // Data de atualização
}
```

### Divisão de Lojas

| Loja | Divisão |
|------|---------|
| Piracicaba (DP - Realme - XV) | Divide em 3 lojas |
| Amparo (Premium - Kassouf) | Divide em 2 lojas |
| Todas | Divide em 4 empresas (Dom Pedro II, Realme, XV de Novembro e Premium — a Kassouf não entra) |

> Lojas, grupos, cores, imagens e ordem ficam em **`src/config/stores.ts`** (fonte única). Para mudar a composição de um grupo ou incluir uma loja, edite só esse arquivo.

## Calendário de Pagamentos

Pagamentos fixos com lembretes automáticos:
- Dias: 5, 10, 15, 20, 25, 27
- Pagamentos específicos por mês (ex: IPTU Fev-Nov)
- Alertas sonoros para pendências
- Indicadores visuais no calendário

## Segurança

- **Login**: Firebase Authentication (e-mail/senha). Não há login anônimo.
- **Firestore**: regras versionadas em `firestore.rules` — só as contas da equipe
  acessam os dados; criar/excluir usuários e trocar senhas é exclusivo do dono.
- **Senhas**: nenhuma senha fica no código do cliente. A senha de admin (confirmação
  de editar/excluir) é conferida contra hash SHA-256 com salt no Firestore
  (`scripts/seed_users.mjs`).
- **Exclusão**: requer senha de administrador e só é permitida até 24h após a criação
- **Funcionário**: nome obrigatório antes de adicionar despesas
- **Sincronização**: automática quando online

Passo a passo de publicação (contas, regras, ordem) e manutenção: [`docs/SECURITY.md`](docs/SECURITY.md).

Deploy automático pelo GitHub Actions (OIDC, regras com aprovação, rollback): [`docs/DEPLOY.md`](docs/DEPLOY.md).

## Testes

```bash
# Executar testes
npm test

# Testes com UI
npm run test:ui

# Cobertura de código
npm run test:coverage

# Regras de segurança do Firestore (sobe o emulador; requer Java 21+)
npm run test:rules
```

O `npm test` não roda os testes das regras (precisam do emulador); o CI roda os dois.

## Licença

ISC License - Miplace Team

---

**Versão**: 2.0.0  
**Última Atualização**: 2026
