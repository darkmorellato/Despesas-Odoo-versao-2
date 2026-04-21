# Backup do Projeto Despesas-Odoo-main

**Data:** 07/04/2026  
**Status:** Backup antes de refatoração e melhorias

## Estrutura do Projeto

```
Despesas-Odoo-main/
├── src/
│   ├── components/
│   │   ├── icons/
│   │   │   ├── CalendarIcon3D.tsx
│   │   │   ├── ChartIcon3D.tsx
│   │   │   ├── FastForwardIcon3D.tsx
│   │   │   ├── FloppyDiskIcon3D.tsx
│   │   │   ├── HomeIcon3D.tsx
│   │   │   ├── Icon.tsx
│   │   │   ├── Icons.tsx
│   │   │   ├── PaymentsIcon3D.tsx
│   │   │   ├── SettingsIcon3D.tsx
│   │   │   └── WalletIcon3D.tsx
│   │   ├── ui/
│   │   │   ├── DateInput.tsx
│   │   │   ├── LoadingSpinner.tsx
│   │   │   ├── PendingPaymentsAlert.tsx
│   │   │   └── ToastContainer.tsx
│   │   ├── ExpenseAnalytics.tsx (583 linhas)
│   │   ├── ExpenseCalendar.tsx (478 linhas)
│   │   ├── FixedPaymentsManager.tsx (496 linhas)
│   │   └── App.tsx (1003 linhas)
│   ├── config/
│   │   ├── constants.ts (106 linhas)
│   │   └── firebase.ts (38 linhas)
│   ├── hooks/
│   │   ├── useAuth.ts (74 linhas)
│   │   ├── useBackup.ts (213 linhas)
│   │   ├── useCalendar.ts (101 linhas)
│   │   ├── useExpenses.ts (229 linhas)
│   │   ├── useFixedPayments.ts (112 linhas)
│   │   └── useToast.ts (53 linhas)
│   ├── types/
│   │   ├── calendar.ts
│   │   ├── expense.ts
│   │   └── settings.ts
│   ├── utils/
│   │   ├── audio.ts
│   │   ├── formatters.ts
│   │   └── helpers.ts
│   ├── test/
│   │   └── setup.ts
│   ├── App.css
│   ├── index.css
│   ├── main.tsx
│   └── vite-env.d.ts
├── docs/
├── public/
├── index.html
├── package.json
├── postcss.config.js
├── tailwind.config.js
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
└── vitest.config.ts
```

## Tecnologias Atuais

- **Frontend:** React 18 + TypeScript
- **Build:** Vite
- **Estilização:** Tailwind CSS
- **Backend:** Firebase (Firestore + Auth)
- **Testes:** Vitest (configurado, sem testes)
- **Ícones:** Customizados (simples e 3D)

## Funcionalidades Principais

1. Dashboard analítico com gráficos mensais/anuais
2. Gestão de despesas com CRUD completo
3. Calendário de pagamentos fixos com lembretes
4. Sistema de backup (JSON e CSV compatível com Odoo)
5. Multi-lojas com divisão automática de despesas
6. Autenticação anônima via Firebase
7. Sincronização em tempo real
8. Exportação para impressão

## Configurações Importantes

### Lojas (constants.ts)
- Piracicaba (divide em 3)
- Amparo (divide em 2)
- Todas (divide em 5)

### Categorias
- Alimentação, Aluguel, Energia, Internet, Lazer, Manutenção, Marketing, Material, Salário, Transporte, Outros

### Pagamentos Fixos
- 58 pagamentos pré-configurados
- Dias: 5, 10, 15, 20, 25, 27

### Senha Admin
- #Banana@10 (hardcoded em constants.ts)

## Regras de Negócio

1. Divisão automática de despesas entre lojas
2. Exclusão permitida apenas em 24h após criação
3. Correções no calendário requerem senha admin
4. Pagamentos fixos em dias específicos do mês

## Dependências Principais

```json
{
  "react": "^18.3.1",
  "react-dom": "^18.3.1",
  "firebase": "^10.7.1",
  "tailwindcss": "^3.4.0",
  "vite": "^5.0.8",
  "vitest": "^1.1.0",
  "typescript": "^5.3.3"
}
```

## Scripts Disponíveis

```json
{
  "dev": "vite",
  "build": "tsc && vite build",
  "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
  "preview": "vite preview",
  "test": "vitest"
}
```

## Estado Atual dos Componentes

### App.tsx (1003 linhas)
- Componente principal com toda a lógica
- Responsabilidades: dashboard, formulário, lista, configurações
- Estado: funcional mas monolítico

### ExpenseAnalytics.tsx (583 linhas)
- Dashboard com gráficos
- Cálculos de totais e médias
- Estado: funcional mas pode ser modularizado

### FixedPaymentsManager.tsx (496 linhas)
- Gerenciamento de pagamentos fixos
- CRUD com localStorage
- Estado: funcional mas pode ser refatorado

### ExpenseCalendar.tsx (478 linhas)
- Calendário interativo
- Visualização de pagamentos
- Estado: funcional mas pode ser otimizado

## Hooks Implementados

- useAuth: Autenticação anônima
- useExpenses: CRUD de despesas
- useCalendar: Navegação de calendário
- useBackup: Backup e exportação
- useToast: Notificações
- useFixedPayments: Pagamentos fixos

## Problemas Conhecidos

1. App.tsx muito grande (1003 linhas)
2. Senha admin hardcoded
3. Sem testes implementados
4. Código duplicado de formatação
5. Componentes grandes podem ser refatorados
6. Falta documentação técnica

## Próximos Passos

Ver arquivo `plano.md` para detalhes das melhorias planejadas.
