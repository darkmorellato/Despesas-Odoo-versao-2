# External Integrations

**Analysis Date:** 2026-04-07

## Firebase (Google Cloud)

**Project:** `miplace-despesas`

**Services Used:**

### Firebase Authentication
- **Type:** Anonymous authentication
- **Implementation:** `src/config/firebase.ts:18-20`, `src/hooks/useAuth.ts`
- **Flow:** Auto-signs in anonymously on app load via `signInAnonymously(auth)`
- **State tracking:** `onAuthStateChanged` listener maintains sync status (`offline` → `syncing` → `synced` / `error`)
- **Custom token support:** Code checks for `__initial_auth_token` global variable but falls back to anonymous auth

### Firebase Firestore
- **Database:** `miplace-despesas` (Firestore)
- **Implementation:** `src/config/firebase.ts:25-37`
- **Collections:**
  - `miplace-despesas/data/team_expenses_v2` - Expense documents (CRUD operations)
  - `miplace-despesas/data-team_data/global_checklist_v1/checks` - Calendar checklist state
- **Real-time sync:** `onSnapshot` listeners for both expenses and checklist
- **Operations:** `addDoc`, `updateDoc`, `deleteDoc`, `setDoc`, `getDoc`, `query`, `orderBy`
- **Server timestamps:** `serverTimestamp()` used for `createdAt` and `updatedAt` fields

**Firestore References (`src/config/firebase.ts:25-37`):**
```typescript
const miplaceDoc = doc(db, 'miplace-despesas', 'data');
expensesRef = collection(miplaceDoc, 'team_expenses_v2');

const dataDoc = doc(db, 'miplace-despesas', 'data-team_data');
const globalChecklistColl = collection(dataDoc, 'global_checklist_v1');
checksRef = doc(globalChecklistColl, 'checks');
```

**Firebase Config (`src/config/firebase.ts:7-15`):**
- apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId, measurementId
- Config is hardcoded (not loaded from env vars)
- Env var overrides available but commented out in `.env.example`

## Data Storage

### Primary Database
- **Firebase Firestore** - All expenses and calendar checklist data
- **Connection:** Configured in `src/config/firebase.ts`
- **Client:** Firebase JS SDK v10.13.0

### Local Storage (Browser)
- **Settings:** `localStorage` key `odoo_fast_settings` - User preferences (`src/App.tsx:91-106`)
- **Budgets:** `localStorage` key `budgets` - Budget limits per category (`src/hooks/useBudgets.ts:20-29`)
- **Theme:** `localStorage` key `theme` - Dark/light mode preference (`src/hooks/useTheme.ts:13-35`)
- **Fixed Payments:** `localStorage` key `fixed_payments_v1` - Fixed payment notifications (`src/hooks/useFixedPayments.ts:5-32`)

### File System (Browser)
- **Backup/Restore:** JSON download/upload via `src/hooks/useBackup.ts`
  - Uses `window.showSaveFilePicker` API (modern browsers) with fallback to blob download
  - Backup format version 3 (`src/hooks/useBackup.ts:62`)
- **CSV Export:** Odoo-compatible CSV export (`src/hooks/useBackup.ts:156-194`)
  - Headers: `date`, `name`, `store_name`, `product_id`, `unit_amount`, `quantity`, `description`, `employee_id`
  - Delimiter: semicolon (`;`)
  - Encoding: UTF-8 with BOM (`\uFEFF`)
- **PDF Export:** Client-side PDF via jsPDF (`src/utils/pdfExport.ts`)

## Authentication & Identity

**Auth Provider:** Firebase Anonymous Auth
- **Implementation:** `src/hooks/useAuth.ts`
- **No user registration/login UI** - automatic anonymous sign-in
- **Admin access:** Password-based check for delete operations (`src/config/constants.ts:3`, `src/hooks/useExpenses.ts:227-229`)
  - Password from `VITE_ADMIN_PASSWORD` env var
  - Default fallback: `#Banana@10`

## External Services

### Odoo (CSV Export Target)
- **Integration type:** CSV file export (no API connection)
- **Purpose:** Export expenses for import into Odoo ERP
- **File:** `src/hooks/useBackup.ts:156-194`
- **Format:** Semicolon-delimited CSV with Odoo field mapping
- **Filename pattern:** `despesas_odoo_DD-MM-YYYY.csv`

### Google Fonts
- **Font:** Inter (weights 300-800)
- **URL:** `https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap`
- **Loaded in:** `index.html:7`

## Monitoring & Observability

**Error Tracking:** None
- Errors logged to console only (`console.error`, `console.warn`)

**Logs:**
- Console-based error logging throughout hooks
- Key error points:
  - Auth errors: `src/hooks/useAuth.ts:55`
  - Firestore read errors: `src/hooks/useExpenses.ts:85`
  - Firestore write errors: `src/hooks/useExpenses.ts:102,117,129`
  - Checklist errors: `src/hooks/useCalendar.ts:53,56,74`

## CI/CD & Deployment

**Hosting:** Static file hosting (SPA)
- Build output: `dist/` directory
- No CI/CD pipeline detected
- No deployment configuration files found

## Environment Configuration

**Required env vars (`.env.example`):**
| Variable | Purpose | Default |
|----------|---------|---------|
| `VITE_ADMIN_PASSWORD` | Admin password for delete operations | `#Banana@10` |

**Optional Firebase env vars (commented out in `.env.example`):**
| Variable | Purpose |
|----------|---------|
| `VITE_FIREBASE_API_KEY` | Override Firebase API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Override Firebase auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Override Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Override Firebase storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Override Firebase messaging sender ID |
| `VITE_FIREBASE_APP_ID` | Override Firebase app ID |

**Secrets location:** `.env` file (gitignored, `.env.example` committed as template)

## Webhooks & Callbacks

**Incoming:** None

**Outgoing:** None

## Audio/Notification

**Notification Sound:**
- Primary: `/hey_listen.mp3` (local file in project root)
- Fallback: Synthesized beep via Web Audio API (`src/utils/audio.ts`)
- Used for pending payment alerts (`src/App.tsx:115`)

## Third-Party Business Services (Referenced in Constants)

The following services are referenced as fixed payment notifications in `src/config/constants.ts:45-103`:
- Odoo (monthly subscription)
- Canva (monthly subscription)
- Hostmundo (hosting)
- Paymobi (payment processing)
- Tim Familia (cellular)
- Comgás (gas utility)
- Semae (water utility)
- Various rent, energy, internet, and tax payments

These are tracked as calendar reminders only — no API integrations exist with these services.

---

*Integration audit: 2026-04-07*
