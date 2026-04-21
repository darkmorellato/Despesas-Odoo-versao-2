# Coding Conventions

**Analysis Date:** 2026-04-07

## Naming Patterns

### Files
- **Components:** PascalCase (e.g., `src/components/ExpenseList.tsx`, `src/components/Dashboard.tsx`).
- **Hooks:** camelCase prefixed with `use` (e.g., `src/hooks/useExpenses.ts`, `src/hooks/useAuth.ts`).
- **Utils:** camelCase (e.g., `src/utils/formatters.ts`, `src/utils/helpers.ts`).
- **Types:** camelCase (e.g., `src/types/expense.ts`, `src/types/calendar.ts`).
- **Tests:** `.test.ts` or `.test.tsx` suffix (e.g., `src/hooks/useAuth.test.ts`).

### Functions & Variables
- **Functions:** camelCase for logic and hooks (e.g., `addExpense`, `splitExpense` in `src/hooks/useExpenses.ts`).
- **Components:** PascalCase for React components (e.g., `ExpenseList` in `src/components/ExpenseList.tsx`).
- **Constants:** SCREAMING_SNAKE_CASE (e.g., `ADMIN_PASSWORD` in `src/config/constants.ts`).
- **Types/Interfaces:** PascalCase (e.g., `UseExpensesReturn` in `src/hooks/useExpenses.ts`).

## Code Style

### Formatting & Linting
- **Tools:** ESLint and Prettier are used (defined in `package.json` scripts).
- **Styling:** Tailwind CSS is used for utility-first styling throughout the application.
- **Language:** TypeScript is used across the entire codebase.

### Import Organization
- **Path Aliases:** Uses `@/` alias for the `src` directory (e.g., `import { useExpenses } from '@/hooks'` in `src/components/ExpenseList.tsx`).
- **Order:** 
    1. React and core library imports.
    2. External dependencies (e.g., `firebase/auth`, `lucide-react`).
    3. Internal aliases (`@/config`, `@/hooks`, `@/types`, `@/utils`).

## Module Design

### Export Patterns
- **Named Exports:** Preferred for hooks and utility functions (e.g., `export const useExpenses = ...` in `src/hooks/useExpenses.ts`).
- **Barrel Files:** Used in `src/hooks/index.ts` and `src/components/ui/index.ts` to simplify imports.

### Component Patterns
- **Functional Components:** All components are written as functional components using arrow functions.
- **Props Definition:** Interfaces are used for prop types (e.g., `interface ExpenseListProps` in `src/components/ExpenseList.tsx`).
- **State Management:** Local state via `useState` and derived state via `useMemo` (e.g., `filteredExpenses` in `src/components/ExpenseList.tsx`).

## Error Handling & Logging
- **Try-Catch Blocks:** Used in async operations within hooks (e.g., `addExpense` in `src/hooks/useExpenses.ts`).
- **Logging:** `console.error` is used for recording failures in Firebase operations (e.g., `src/hooks/useExpenses.ts:85`).
- **User Feedback:** Alerts and confirmation dialogs are used for critical actions (e.g., `src/components/ExpenseList.tsx:93`).

## Type Usage
- **Strict Typing:** Extensive use of TypeScript interfaces and types defined in `src/types/`.
- **Generics:** Used with React hooks (e.g., `useState<<ExpenseExpense[]>([])` in `src/hooks/useExpenses.ts`).
- **Omit/Partial:** Used for CRUD operations to handle partial updates or omit IDs during creation (e.g., `Omit<<ExpenseExpense, 'id'>` in `src/hooks/useExpenses.ts:20`).

## Comment Conventions
- **JSDoc:** Used for documenting complex hooks and utility functions, including `@interface`, `@param`, `@returns`, and `@example` (e.g., `src/hooks/useExpenses.ts:9-57`).
- **Language:** Comments are primarily in Portuguese (e.g., `src/hooks/useExpenses.ts:30`).

---
*Convention analysis: 2026-04-07*
