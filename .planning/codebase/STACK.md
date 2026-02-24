# Technology Stack

**Analysis Date:** 2026-02-23

## Languages

**Primary:**
- TypeScript 5.8.3 - Frontend and backend application code
- JavaScript (ES modules) - Configuration and utility files

**Secondary:**
- HTML5 - Static markup in `index.html`
- CSS (via Tailwind) - Styling system

## Runtime

**Environment:**
- Node.js (implied from `.npmrc` and build tooling)

**Package Manager:**
- npm 10.x (inferred from `package-lock.json` format)
- Lockfile: `package-lock.json` present (root and server subdirectory)

## Frameworks

**Frontend:**
- React 18.3.1 - UI framework
- Vite 5.4.19 - Build tool and dev server
- React Router 6.30.1 - Client-side routing

**Backend:**
- Express 4.21.2 - HTTP API server (`server/index.ts`)
- tsx 4.19.4 - TypeScript execution runtime (no build step)

**UI Components:**
- shadcn/ui - Pre-built component library (40+ Radix UI dependencies)
- Radix UI 1.x - Accessible component primitives
- Tailwind CSS 3.4.17 - Utility-first CSS framework
- Lucide React 0.462.0 - Icon library
- Recharts 2.15.4 - Charts and visualizations
- Sonner 1.7.4 - Toast notifications
- Embla Carousel 8.6.0 - Carousel component

**Forms & Validation:**
- React Hook Form 7.61.1 - Form state management
- @hookform/resolvers 3.10.0 - Validation integration
- Zod 3.25.76 - Schema validation library

**Testing:**
- Vitest 3.2.4 - Test runner (configured in `vitest.config.ts`)
- @testing-library/react 16.0.0 - Component testing utilities
- @testing-library/jest-dom 6.6.0 - DOM matchers
- jsdom 20.0.3 - DOM implementation for tests

**Build & Development:**
- @vitejs/plugin-react-swc 3.11.0 - Fast React compilation via SWC
- Autoprefixer 10.4.21 - CSS vendor prefixes
- PostCSS 8.5.6 - CSS processing
- ESLint 9.32.0 - Code linting
- Tailwind CSS 3.4.17 - Styling framework

## Key Dependencies

**Trading & Blockchain:**
- @polymarket/clob-client 5.2.4 - Polymarket CLOB order execution (backend only)
- @polymarket/real-time-data-client 1.4.0 - Polymarket WebSocket stream (backend only)
- ethers 5.8.0 - Web3 library for signing and wallet management (both frontend & backend)

**Data Management:**
- better-sqlite3 12.6.2 - SQLite database driver (backend + frontend)
- @tanstack/react-query 5.83.0 - Server state management and caching

**Utilities:**
- date-fns 3.6.0 - Date formatting and manipulation
- class-variance-authority 0.7.1 - Component variant system
- clsx 2.1.1 - Conditional CSS class builder
- tailwind-merge 2.6.0 - Merges Tailwind classes without conflicts
- vaul 0.9.9 - Drawer component
- input-otp 1.4.2 - OTP input component
- react-resizable-panels 2.1.9 - Resizable panel layout
- react-day-picker 8.10.1 - Date picker
- next-themes 0.3.0 - Dark mode management

**Infrastructure:**
- cors 2.8.5 - CORS middleware for Express
- dotenv 16.4.7 - Environment variable loading
- global-agent 4.1.2 - Global HTTP/HTTPS proxy routing (for geo-restriction bypass)

**Development Tools:**
- typescript-eslint 8.38.0 - TypeScript linting
- eslint-plugin-react-hooks 5.2.0 - React hooks linting
- eslint-plugin-react-refresh 0.4.20 - Fast Refresh linting
- lovable-tagger 1.1.13 - Component tagging for dev tools

## Configuration

**Environment:**
- `.env` file (created from `.env.example`) - Required for local setup
- Environment variables control:
  - Bot wallet keys (`BOT_X_PKEY`, `BOT_X_FUNDER`)
  - Polymarket CLOB API credentials (`BOT_X_CLOB_API_KEY`, `BOT_X_CLOB_SECRET`, `BOT_X_CLOB_PASSPHRASE`)
  - Blockchain RPC (`POLYGON_WSS_URL` via Alchemy)
  - HTTP proxy configuration (`GLOBAL_AGENT_HTTP_PROXY`, `GLOBAL_AGENT_NO_PROXY`)
  - Trading mode (`SIMULATION_MODE`)
  - Server port (`PORT`, default 3001)
  - Admin password (`ADMIN_PASSWORD`)
  - OpenRouter API key (optional, for AI decision logic)

**Build:**
- `vite.config.ts` - Frontend build configuration (React SWC, alias `@`, dev proxy to `:3001`)
- `vitest.config.ts` - Test configuration (jsdom environment, setupFiles at `src/test/setup.ts`)
- `tsconfig.json` - Shared TypeScript configuration (relaxed, `noImplicitAny=false`, `strictNullChecks=false`)
- `tsconfig.app.json` - Frontend-specific TypeScript config
- `tsconfig.node.json` - Build tool TypeScript config
- `server/tsconfig.json` - Backend-specific TypeScript config
- `eslint.config.js` - ESLint configuration (ES9 modules, typescript-eslint)
- `postcss.config.js` - PostCSS pipeline (Tailwind + Autoprefixer)
- `tailwind.config.ts` - Tailwind customization (dark mode, custom colors, zero border-radius)

**Frontend Static:**
- `index.html` - Vite entry point
- `components.json` - shadcn/ui configuration (component library metadata)

## Platform Requirements

**Development:**
- Node.js (version not explicitly specified, but modern LTS expected)
- npm or compatible package manager
- ~500MB+ disk space (node_modules)

**Production:**
- Node.js runtime
- SQLite support (built into `better-sqlite3`)
- Network access to:
  - Polygon RPC endpoint (Alchemy WebSocket for on-chain events)
  - Polymarket CLOB API (`clob.polymarket.com`)
  - Polymarket Gamma API (`gamma-api.polymarket.com`)
  - Polymarket Data API (`data-api.polymarket.com`)
  - Polymarket WebSocket (`ws-live-data.polymarket.com`)
  - Binance API for crypto prices (`api.binance.com`)
- HTTP proxy support (optional, via `global-agent` for geo-restricted regions)

---

*Stack analysis: 2026-02-23*
