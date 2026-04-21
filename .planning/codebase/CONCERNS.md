# Codebase Concerns
**Analysis Date:** 2026-04-07

## Security Considerations

| Area | Risk | Severity | Files | Recommendation |
| :--- | :--- | :--- | :--- | :--- |
| **Authentication** | Hardcoded fallback admin password (`#Banana@10`) in source code. | Critical | `src/config/constants.ts:3` | Remove fallback and strictly enforce use of `VITE_ADMIN_PASSWORD` environment variable. |
| **Authorization** | Client-side password validation for sensitive operations (delete). | High | `src/hooks/useExpenses.ts:227`, `src/App.tsx:345` | Move administrative checks to Firebase Security Rules or a backend function to prevent bypass via browser console. |
| **Data Privacy** | User identity based on `employeeName` stored in `localStorage` and used as a sync key. | Medium | `src/App.tsx:91`, `src/App.tsx:947` | Implement proper Firebase Authentication (UIDs) instead of relying on a user-provided name string for data isolation. |

## Technical Debt & Maintainability

| Area | Issue | Severity | Files | Fix Approach |
| :--- | :--- | :--- | :--- | :--- |
| **Business Logic** | Hardcoded "Store Split" logic for specific regions. | Medium | `src/hooks/useExpenses.ts:192-206` | Move split configurations to a config file or database collection to avoid code changes when store structures change. |
| **State Management** | Large `App.tsx` (nearly 1000 lines) handling everything from UI, filtering, and form state. | Medium | `src/App.tsx` | Break down `App.tsx` into smaller feature-based components (e.g., `ExpenseForm`, `ExpenseFilterBar`, `ExpenseTable`). |
| **UI/UX** | Use of `window.confirm()` for cloud sync warnings. | Low | `src/hooks/useBackup.ts:107` | Replace with a custom UI modal consistent with the rest of the application's "glass-panel" design. |
| **Data Types** | Use of `any[]` for `pendingItems` state. | Low | `src/App.tsx:67` | Define a proper type for pending payment items to improve type safety. |

## Performance Bottlenecks

| Operation | Problem | Severity | Files | Improvement Path |
| :--- | :--- | :--- | :--- | :--- |
| **Expense Filtering** | `filteredExpenses` and `groupedExpenses` computed on every render of `App.tsx`. | Low | `src/App.tsx:174`, `src/App.tsx:197` | Although `useMemo` is used, the complexity grows with the number of expenses. Consider implementing pagination or server-side filtering if data grows. |

## Fragile Areas

| Component | Why Fragile | Severity | Files | Safe Modification |
| :--- | :--- | :--- | :--- | :--- |
| **Currency Formatting** | Manual string replacements (`.replace(/\./g, '').replace(',', '.')`) for numeric conversion. | Medium | `src/App.tsx:285`, `src/App.tsx:265` | Use a dedicated currency parsing library (like `currency.js` or `dinero.js`) to handle internationalization and edge cases reliably. |

## Test Coverage Gaps

| Untested Area | Risk | Priority | Files |
| :--- | :--- | :--- | :--- |
| **Admin Password Flow** | Logic bypasses in deletion might go unnoticed. | High | `src/hooks/useExpenses.ts` | Add unit tests for `validateAdminPassword` and `canDelete` scenarios. |
| **Complex UI Interactions** | Form validation and submission flows. | Medium | `src/App.tsx` | Add integration tests for the expense creation and editing flow. |

---
*Concerns audit: 2026-04-07*
