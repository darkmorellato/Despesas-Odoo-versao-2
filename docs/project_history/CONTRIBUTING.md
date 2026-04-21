# Guia de Contribuição

## Padrões de Código

### TypeScript

- Use tipagem explícita em todos os parâmetros e retornos
- Evite `any`, prefira tipos específicos
- Interfaces para objetos complexos
- Use enums para valores fixos

```typescript
// Correto
function formatExpense(expense: Expense): string {
  return `${expense.description}: R$ ${expense.amount}`;
}

// Incorreto
function formatExpense(expense: any): any {
  return expense.description + expense.amount;
}
```

### React

- Componentes funcionais com hooks
- `memo()` para otimização quando necessário
- Props tipadas com interface
- Event handlers com tipos corretos

```typescript
interface ButtonProps {
  onClick: () => void;
  label: string;
  disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = memo(({ 
  onClick, 
  label, 
  disabled = false 
}) => {
  return (
    <button onClick={onClick} disabled={disabled}>
      {label}
    </button>
  );
});
```

### Hooks

- Prefixo `use` obrigatório
- Retorne objeto tipado
- Documente com JSDoc

```typescript
interface UseExpensesReturn {
  expenses: Expense[];
  isLoading: boolean;
  addExpense: (expense: Omit<Expense, 'id'>) => Promise<void>;
}

export const useExpenses = (user: User | null): UseExpensesReturn => {
  // implementação
};
```

### Estilização (Tailwind CSS)

- Use classes utilitárias do Tailwind
- Evite CSS customizado
- Glass morphism: `glass-panel`, `backdrop-blur`
- Responsividade: `md:`, `lg:`, `xl:`

```typescript
// Classes padrão
<div className="glass-panel rounded-2xl p-6 fade-in">
  {/* conteúdo */}
</div>
```

## Estrutura de Commits

### Formato

```
tipo(escopo): descrição breve
```

### Tipos

| Tipo | Descrição |
|------|-----------|
| `feat` | Nova funcionalidade |
| `fix` | Correção de bug |
| `refactor` | Refatoração de código |
| `docs` | Documentação |
| `test` | Testes |
| `chore` | Manutenção |

### Exemplos

```
feat(calendar): adiciona zoom no calendário
fix(expenses): corrige exclusão após 24h
refactor(hooks): otimiza useExpenses com useMemo
docs(readme): atualiza instruções de instalação
```

## Processo de Pull Request

### 1. Criar Branch

```bash
git checkout -b feature/nova-funcionalidade
```

### 2. Desenvolver

- Siga os padrões de código
- Adicione testes se aplicável
- Execute lint e type-check

```bash
npm run lint
npm run type-check
```

### 3. Commit

- Mensagens descritivas
- Commits pequenos e focados

### 4. Push e PR

```bash
git push origin feature/nova-funcionalidade
```

- Descreva as mudanças no PR
- Referencie issues relacionadas
- Aguarde review

## Testes

### Estrutura

```
src/test/
├── hooks/           # Testes de hooks
├── utils/           # Testes de utilitários
└── setup.ts         # Configuração de testes
```

### Executar

```bash
# Todos os testes
npm test

# Watch mode
npm test -- --watch

# Cobertura
npm run test:coverage
```

### Padrões de Teste

```typescript
describe('useExpenses', () => {
  it('should return empty array initially', () => {
    const { result } = renderHook(() => useExpenses(null));
    expect(result.current.expenses).toEqual([]);
  });
});
```

## Checklist de PR

- [ ] Código segue padrões do projeto
- [ ] Lint passa sem erros
- [ ] Type-check passa
- [ ] Testes passam
- [ ] Documentação atualizada (se necessário)
- [ ] Sem secrets no código
- [ ] Commits com mensagens adequadas

## Dúvidas

Contacte a equipe de desenvolvimento para dúvidas sobre:
- Arquitetura do projeto
- Padrões específicos
- Integração com Firebase
