# Testing Patterns

**Analysis Date:** 2026-04-07

## Test Framework

### Runner
- **Framework:** Vitest ^2.0.0 (Config: `vitest.config.ts`)
- **Environment:** `jsdom` (used for React component tests).
- **Run Commands:**
  ```bash
  npm test            # Run all tests
  npm run test:ui      # Open Vitest UI
  npm run test:coverage # Run tests with coverage reporting
  ```

### Assertion Library
- **Library:** Vitest's built-in `expect` and `@testing-library/jest-dom` for DOM-specific assertions.

## Test File Organization

### Location
- **Co-located Tests:** Some tests are placed alongside the hooks they test (e.g., `src/hooks/useAuth.test.ts`, `src/hooks/useExpenses.test.ts`).
- **Centralized Test Directory:** A dedicated `src/test/` directory is used for organized test suites:
    - `src/test/components/`: Component tests (e.g., `ExpenseAnalytics.test.tsx`).
    - `src/test/hooks/`: Hook tests (e.g., `useExpenses.test.ts`).
    - `src/test/utils/`: Utility tests (e.g., `formatters.test.ts`).

### Setup
- **Global Setup:** `src/test/setup.ts` handles global mocks and environment configuration.

## Test Structure

### Suite Organization
Tests follow the `describe` -> `it`/`test` pattern:
```typescript
describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve inicializar com syncStatus offline', () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.syncStatus).toBe('offline');
  });
});
```

### Hook Testing
- **Tooling:** Uses `@testing-library/react`'s `renderHook`, `act`, and `waitFor`.
- **Pattern:** Renders the hook, performs actions via `act`, and asserts state changes using `waitFor` for async operations.

## Mocking Strategy

### Framework
- **Tool:** Vitest `vi` mocking utility.

### Mocking Patterns
- **Global Mocks:** Large-scale mocks for Firebase and Browser APIs are defined in `src/test/setup.ts`.
- **Firebase Mocking:** Both `@/config/firebase` and `firebase/firestore` are mocked to prevent actual network calls and provide predictable responses.
- **Browser APIs:** Mocks for `AudioContext`, `window.matchMedia`, `window.scrollTo`, and `localStorage` are implemented in `src/test/setup.ts`.
- **Dynamic Mocks:** `vi.mocked()` is used within individual tests to change the behavior of mocked functions (e.g., `src/hooks/useAuth.test.ts:20`).

## Test Types

### Unit Tests
- **Utilities:** Pure function tests for formatters and helpers in `src/test/utils/`.
- **Hooks:** Logic testing for custom hooks using `renderHook`.

### Component Tests
- **Approach:** Testing UI behavior and rendering using `@testing-library/react`.
- **Scope:** Focus on rendering critical data and user interactions (e.g., `src/test/components/ExpenseCalendar.test.tsx`).

## Common Patterns

### Async Testing
Uses `waitFor` from Testing Library to handle async state updates from Firebase:
```typescript
await waitFor(() => {
  expect(result.current.syncStatus).toBe('synced');
});
```

### Error Testing
Mocks rejected promises to verify error handling logic:
```typescript
vi.mocked(signInAnonymously).mockRejectedValue(new Error('Login failed'));
// ...
expect(result.current.syncStatus).toBe('error');
```

---
*Testing analysis: 2026-04-07*
