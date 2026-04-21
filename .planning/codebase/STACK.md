# Technology Stack

**Analysis Date:** 2026-04-07

## Languages

**Primary:**
- TypeScript 5.5.0 - Application source code (`src/**/*.ts`, `src/**/*.tsx`)
- JavaScript (ES Modules) - Config files (`vite.config.ts`, `tailwind.config.js`, `postcss.config.js`)

**Markup:**
- HTML5 - Entry point (`index.html`)
- JSX (react-jsx) - React components via tsconfig `"jsx": "react-jsx"`

## Runtime

**Environment:**
- Browser (client-side SPA only, no server runtime)
- Vite 5.4.0 - Development server and build tool

**Package Manager:**
- npm
- Lockfile: `package-lock.json` present
- Project type: ES modules (`"type": "module"` in `package.json:5`)

## Frameworks

**Core:**
- React 18.3.1 - UI framework (`src/App.tsx`, `src/main.tsx`)
- React DOM 18.3.1 - DOM rendering

**Styling:**
- Tailwind CSS 3.4.4 - Utility-first CSS (`tailwind.config.js`)
- PostCSS 8.4.38 - CSS processing (`postcss.config.js`)
- Autoprefixer 10.4.19 - Vendor prefixing

**Build/Dev:**
- Vite 5.4.0 - Build tool and dev server (`vite.config.ts`)
- TypeScript 5.5.0 - Type checking (`tsconfig.json`)
- @vitejs/plugin-react 4.3.0 - React HMR and JSX transform

**Testing:**
- Vitest 2.0.0 - Test runner (`vitest.config.ts`)
- @testing-library/react 16.0.0 - Component testing
- @testing-library/jest-dom 6.4.0 - DOM matchers
- @testing-library/user-event 14.5.0 - User interaction simulation
- @vitest/coverage-v8 2.1.9 - Code coverage (V8 engine)
- @vitest/ui 2.0.0 - Vitest UI
- jsdom 24.1.0 - DOM environment for tests

## Key Dependencies

**Backend/Data:**
- Firebase 10.13.0 - Authentication, Firestore database, real-time sync (`src/config/firebase.ts`)
  - Modules used: `firebase/app`, `firebase/auth`, `firebase/firestore`

**UI/Icons:**
- lucide-react 0.344.0 - Icon library (`src/components/icons/index.ts`)

**Charts/Visualization:**
- recharts 2.15.4 - Data visualization charts (`src/components/analytics/TrendChart.tsx`)

**Export:**
- jspdf 2.5.2 - Client-side PDF generation (`src/utils/pdfExport.ts`)

## Configuration

**TypeScript (`tsconfig.json`):**
- Target: ES2020
- Module: ESNext
- Module resolution: bundler
- Strict mode: enabled
- Path alias: `@/*` → `./src/*`
- JSX: react-jsx
- No emit (build handled by Vite)

**Vite (`vite.config.ts`):**
- Dev server: port 3000, auto-open browser
- Build output: `dist/`
- Sourcemaps: enabled
- Manual chunks: `vendor-react` (react, react-dom), `vendor-firebase` (firebase/app, firebase/auth, firebase/firestore)
- Chunk size warning limit: 500KB

**Tailwind (`tailwind.config.js`):**
- Content: `index.html`, `src/**/*.{js,ts,jsx,tsx}`
- Font family: Inter (sans-serif)
- Custom design tokens: `liquid` color palette (bg, text, primary, secondary, accent, glass variants)
- Custom shadows: `liquid-card`, `liquid-glow`, `liquid-highlight`, `liquid-inner`
- Custom border radius: `liquid` (1.25rem)

**PostCSS (`postcss.config.js`):**
- Plugins: tailwindcss, autoprefixer

**Environment (`src/config/constants.ts`):**
- Admin password via `VITE_ADMIN_PASSWORD` env var with fallback
- Firebase config hardcoded in `src/config/firebase.ts:7-15`

## NPM Scripts

```bash
npm run dev          # Start Vite dev server
npm run build        # Type check + Vite production build
npm run preview      # Preview production build
npm test             # Run Vitest tests
npm run test:ui      # Run Vitest with UI
npm run test:coverage # Run tests with coverage
npm run lint         # ESLint on src/ (.ts, .tsx)
npm run type-check   # TypeScript no-emit check
```

## Platform Requirements

**Development:**
- Node.js (compatible with Vite 5.x)
- npm
- Modern browser with ES module support

**Production:**
- Static file hosting (SPA, no server required)
- Firebase project `miplace-despesas` for data/auth
- Firebase Hosting bucket: `miplace-despesas.firebasestorage.app`

## Fonts

- Inter (Google Fonts) - loaded in `index.html:7`, weights: 300-800

---

*Stack analysis: 2026-04-07*
