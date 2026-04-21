# Architecture

**Analysis Date:** 2026-04-07

## Pattern Overview

**Overall:** Single Page Application (SPA) with a Client-Side State and Real-time Backend Synchronization.

**Key Characteristics:**
- **Real-time Sync:** Uses Firebase Firestore for live updates of expense data.
- **Hook-Based Logic:** Core business logic is decoupled from UI components using custom React hooks.
- **Lazy Loading:** High-complexity views (`ExpenseCalendar`, `ExpenseAnalytics`, `FixedPaymentsManager`) are lazy-loaded to optimize initial bundle size.
- **Local Persistence:** User settings are persisted in `localStorage`.

## Layers

**UI Layer:**
- Purpose: Presentation and user interaction.
- Location: `src/components/`
- Contains: React components, UI primitives (`src/components/ui/`), and iconography (`src/components/icons/`).
- Depends on: Hooks layer for data and state.
- Used by: `src/App.tsx` as the root orchestrator.

**Logic/State Layer (Hooks):**
- Purpose: Encapsulating side effects, Firebase interactions, and complex state transitions.
- Location: `src/hooks/`
- Contains: Custom hooks like `useExpenses.ts`, `useAuth.ts`, `useCalendar.ts`.
- Depends on: Config layer for Firebase initialization and constants.
- Used by: UI Layer.

**Configuration & Types Layer:**
- Purpose: Defining application constants, types, and external service configurations.
- Location: `src/config/` and `src/types/`
- Contains: `firebase.ts` (init), `constants.ts` (business rules), and TypeScript interfaces.
- Depends on: External libraries (Firebase).
- Used by: All other layers.

**Utility Layer:**
- Purpose: Pure functions for formatting, calculations, and system helpers.
- Location: `src/utils/`
- Contains: `formatters.ts` (currency, dates), `helpers.ts` (store logic), `audio.ts`.
- Depends on: None (mostly pure functions).
- Used by: UI and Hooks layers.

## Data Flow

**Expense Submission Flow:**
1. User fills form in `App.tsx`.
2. `handleSubmit` calls `splitExpense` (from `src/hooks/useExpenses.ts`) to handle multi-store distribution.
3. `addExpense` (from `useExpenses.ts`) sends data to Firebase Firestore.
4. Firestore snapshot trigger in `useExpenses.ts` updates the local `expenses` state.
5. UI re-renders with the new data.

**State Management:**
- **Server State:** Managed by Firebase Firestore with real-time listeners via `onSnapshot`.
- **Local State:** Managed by React `useState` and `useMemo` for filtering and grouping.
- **Persistent State:** User settings managed via `localStorage` in `App.tsx`.

## Key Abstractions

**Expense Management (`useExpenses.ts`):**
- Purpose: Abstracting CRUD operations on the `team_expenses_v2` collection.
- Pattern: Repository pattern implemented as a custom hook.

**Store Splitting Logic (`splitExpense`):**
- Purpose: Business rule to distribute a single expense across multiple physical stores based on region.
- Location: `src/hooks/useExpenses.ts`

## Entry Points

**Application Root:**
- Location: `src/main.tsx`
- Responsibilities: Mounting the React app to the DOM.

**Main Orchestrator:**
- Location: `src/App.tsx`
- Responsibilities: Navigation routing (via `currentView` state), global state coordination, and layout.

## Error Handling

**Strategy:** Toast-based notifications for user-facing errors and console logging for developer-facing errors.

**Patterns:**
- **Try-Catch Blocks:** Used in all asynchronous Firebase calls within hooks (e.g., `useExpenses.ts`).
- **Toast Notifications:** `useToast.ts` provides a global signaling mechanism to inform users of success/failure.

## Cross-Cutting Concerns

**Logging:** Standard `console.error` and `console.warn` used in catch blocks.
**Validation:** 
- Admin password validation for deletions (`validateAdminPassword` in `src/hooks/useExpenses.ts`).
- Input validation for currency and required fields in `App.tsx`.
**Authentication:** 
- Anonymous authentication via Firebase (`src/hooks/useAuth.ts` and `src/config/firebase.ts`).
- Sync status tracking (`synced`, `syncing`, `error`, `offline`).
---
*Architecture analysis: 2026-04-07*
