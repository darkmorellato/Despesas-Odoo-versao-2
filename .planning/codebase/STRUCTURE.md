# Codebase Structure

**Analysis Date:** 2026-04-07

## Directory Layout

```
[project-root]/
├── .planning/           # Project planning and codebase analysis docs
├── dist/                # Production build output
├── docs/                # Project documentation (API, Components, Hooks)
├── public/              # Static assets (images, index.html)
└── src/                 # Application source code
    ├── components/      # React UI components
    │   ├── analytics/   # Data visualization components
    │   ├── icons/       # SVG and 3D icon library
    │   └── ui/          # Shared UI primitives (buttons, inputs, etc.)
    ├── config/          # Configuration and business constants
    ├── hooks/           # Custom React hooks for logic and state
    ├── types/            # TypeScript interfaces and type definitions
    ├── utils/            # Utility and helper functions
    ├── test/            # Test suites and mocks
    │   ├── components/  # Component tests
    │   ├── hooks/       # Hook tests
    │   └── utils/       # Utility tests
    ├── App.tsx          # Main application orchestrator
    ├── main.tsx         # Entry point
    └── index.css        # Global styles
```

## Directory Purposes

**`src/components/`:**
- Purpose: All presentation logic.
- Contains: Page-level views and reusable widgets.
- Key files: `Dashboard.tsx`, `ExpenseList.tsx`, `ExpenseCalendar.tsx`.

**`src/components/ui/`:**
- Purpose: Low-level, generic UI components used across the app.
- Contains: Inputs, spinners, and alert systems.
- Key files: `DateInput.tsx`, `LoadingSpinner.tsx`, `ToastContainer.tsx`.

**`src/hooks/`:**
- Purpose: The "brain" of the application. Separates Firebase/Logic from UI.
- Contains: State management and side-effect handlers.
- Key files: `useExpenses.ts` (CRUD), `useAuth.ts` (Session), `useCalendar.ts` (Payment tracking).

**`src\config/`:**
- Purpose: Centralized environment and business rules.
- Contains: Firebase initialization and static lists.
- Key files: `firebase.ts` (Firebase SDK init), `constants.ts` (Store lists).

**`src/utils/`:**
- Purpose: Pure functions to keep components and hooks clean.
- Contains: Date/Currency formatting and audio triggers.
- Key files: `formatters.ts`, `helpers.ts`, `audio.ts`.

**`src/types/`:**
- Purpose: Type safety and domain model definitions.
- Contains: Interface definitions for Expenses, Users, and Settings.
- Key files: `expense.ts`, `calendar.ts`.

## Key File Locations

**Entry Points:**
- `src/main.tsx`: Boots the React application.
- `src/App.tsx`: Manages routing and primary layout.

**Configuration:**
- `src/config/firebase.ts`: Firebase project credentials and reference getters.
- `src/config/constants.ts`: Business constants like `STORES_LIST` and `CATEGORIES_LIST`.

**Core Logic:**
- `src/hooks/useExpenses.ts`: Main data access layer for expenses.
- `src/hooks/useAuth.ts`: Authentication and synchronization status.

**Testing:**
- `src/test/`: Organized by target (components vs hooks).

## Naming Conventions

**Files:**
- Components: PascalCase (e.g., `ExpenseCalendar.tsx`).
- Hooks: camelCase starting with "use" (e.g., `useExpenses.ts`).
- Utils/Configs: camelCase (e.g., `formatters.ts`, `firebase.ts`).

**Directories:**
- Plural nouns for grouping (e.g., `components`, `hooks`, `types`).

## Where to Add New Code

**New Feature/Page:**
- UI: `src/components/`
- Logic: Create a new hook in `src/hooks/` if it involves state or API calls.
- Types: Add interface to `src/types/index.ts` or a specific file in `src/types/`.

**New Component/Module:**
- Implementation: `src/components/` (use `src/components/ui/` if the component is a generic primitive).

**Utilities:**
- Shared helpers: `src/utils/helpers.ts` or a new file in `src/utils/`.

## Special Directories

**`.planning/`:**
- Purpose: Agent-generated technical documentation for future implementation phases.
- Generated: Yes.
- Committed: Yes.

**`docs/`:**
- Purpose: Human-readable technical guides for the codebase.
- Generated: No (Manual).
- Committed: Yes.
---
*Structure analysis: 2026-04-07*
