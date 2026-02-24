# Coding Conventions

**Analysis Date:** 2026-02-23

## Naming Patterns

**Files:**
- React components: PascalCase (e.g., `ActivePositions.tsx`, `ErrorBoundary.tsx`, `ModelStats.tsx`)
- Utilities and helpers: camelCase (e.g., `use-toast.ts`, `use-mobile.tsx`)
- Constant files: camelCase (e.g., `constants.ts`)
- UI components from shadcn: lowercase with hyphens (e.g., `button.tsx`, `alert-dialog.tsx`)

**Functions:**
- React components (functional): PascalCase (e.g., `ActivePositions`, `ModelStats`)
- Utility functions: camelCase (e.g., `getServerUrl()`, `getAnalysis()`, `formatTimeRemaining()`)
- Helper functions: camelCase (e.g., `formatDateTime()`, `formatTimeOnly()`)
- React hooks: camelCase starting with `use` (e.g., `useCart()`, `useMobile()`)

**Variables:**
- State variables: camelCase (e.g., `selectedModel`, `showAnalysis`, `connected`)
- Constants: UPPER_SNAKE_CASE (e.g., `TABS`, `TOAST_LIMIT`, `TOAST_REMOVE_DELAY`, `TRADE_ANALYSES`, `MODELS`, `MODEL_COLORS`)
- Local computations: camelCase (e.g., `timeLeft`, `pnl`, `isLoss`, `isExpired`, `isClosed`)
- Configuration objects: camelCase or UPPER_SNAKE_CASE depending on scope (e.g., `AGENT_DONORS`, `COIN_MAP`)

**Types:**
- Interfaces: PascalCase with Props suffix for component props (e.g., `ActivePositionsProps`, `PerformanceChartProps`, `ModelStatsProps`)
- Generic types: PascalCase (e.g., `TradeEntry`, `ModelInfo`, `EquityPoint`, `ModelStat`, `FullState`, `ToasterToast`)
- Type aliases: PascalCase (e.g., `ActionType`)

## Code Style

**Formatting:**
- Prettier is configured but not explicitly found in package.json scripts
- ESLint enabled via `eslint.config.js` using TypeScript ESLint flat config
- No explicit prettier configuration file detected

**Linting:**
- Tool: ESLint 9.32.0 with TypeScript ESLint 8.38.0
- Config: `eslint.config.js` (flat config format)
- Extends: `@eslint/js`, `typescript-eslint.configs.recommended`
- Plugins: `react-hooks`, `react-refresh`

**ESLint Rules:**
- `react-hooks/rules-of-hooks`: enabled (recommended)
- `react-refresh/only-export-components`: warn (allows constant exports)
- `@typescript-eslint/no-unused-vars`: disabled
- Relaxed TypeScript checking enabled (see tsconfig section)

**TypeScript Configuration:**
- `strict: false` — lenient type checking
- `noUnusedLocals: false` — allows unused variables
- `noUnusedParameters: false` — allows unused parameters
- `noImplicitAny: false` — allows implicit any types
- `strictNullChecks: false` — allows null/undefined assignment

## Import Organization

**Order:**
1. React and external library imports (e.g., `import { useState } from 'react'`)
2. Third-party UI/components (e.g., `import { LineChart, Line, ... } from 'recharts'`)
3. Internal absolute imports with `@` alias (e.g., `import { MODELS } from '@/data/constants'`)
4. Relative imports for shared types (e.g., `import { TradeEntry } from '../../shared/types'`)

**Example from `src/pages/Index.tsx`:**
```typescript
import { useState, useEffect } from 'react';
import PerformanceChart from '@/components/PerformanceChart';
import ModelStats from '@/components/ModelStats';
import { MODEL_LOGOS, CRYPTO_LOGOS } from '@/assets/logos';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { toast, Toaster } from 'sonner';
import { MODELS } from '@/data/constants';
```

**Path Aliases:**
- `@/*` maps to `./src/*` (configured in `tsconfig.json`)
- Used consistently across all imports for internal modules

## Error Handling

**Patterns:**
- Inline try-catch for async operations (e.g., in `Index.tsx` REST polling)
- Catch blocks with empty implementations when errors are intentionally ignored: `catch { /* ignore parse errors */ }`
- Catch blocks with no-op for event streams: `es.onerror = () => { /* EventSource auto-reconnects */ }`
- Custom hooks throw descriptive errors if used outside required context:
  ```typescript
  throw new Error("useCarousel must be used within a <Carousel />");
  throw new Error("useChart must be used within a <ChartContainer />");
  throw new Error("useFormField should be used within <FormField>");
  throw new Error("useSidebar must be used within a SidebarProvider.");
  ```

**Error Boundary:**
- React Error Boundary component in `src/components/ErrorBoundary.tsx`
- Uses `getDerivedStateFromError()` for state updates
- Uses `componentDidCatch()` for side effects
- Logs to console: `console.error('[ErrorBoundary]', error, info.componentStack)`

## Logging

**Framework:** Console (no external logging library detected)

**Patterns:**
- Error logging with context prefix: `console.error('[ErrorBoundary]', error, info.componentStack)`
- Toast notifications for user-facing events via `sonner` library:
  ```typescript
  toast.success(`${name} opened ${tradeData.side} ${tradeData.asset} @ ${Math.round((tradeData.entryPrice || 0) * 100)}¢`);
  toast(`${name} closed ${tradeData.side} ${tradeData.asset} — ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}`, {...});
  ```

## Comments

**When to Comment:**
- Complex calculations or algorithms (e.g., `getOverlapOffset()` in PerformanceChart includes explanation)
- Intent comments for non-obvious behavior
- Configuration comments explaining purpose (e.g., comments in `constants.ts` explaining proxyWallet vs onchainWallet)

**Examples:**
- `// Short trade analyses — deterministically picked from trade ID` (ActivePositions.tsx:15)
- `// Derived flat arrays (used by onChainListener and other modules)` (constants.ts:30)
- `// Fetch immediately, then every 5 minutes as backup (SSE handles real-time)` (Index.tsx:77)

**JSDoc/TSDoc:**
- Not extensively used; documentation is minimal
- Function signatures are self-documenting via TypeScript types

## Function Design

**Size:**
- Utility functions: typically 5-20 lines (e.g., `formatTimeRemaining`, `formatDateTime`)
- Components: vary widely (35-300+ lines for complex components)
- Larger components broken into subcomponents or extracted helpers (e.g., `TradeLogEntry` extracted from `ActivePositions`)

**Parameters:**
- Components use destructured props with TypeScript interfaces (e.g., `{ activeTab, onTabChange, trades: allTrades = [] }: ActivePositionsProps`)
- Destructuring with defaults: `trades: allTrades = []` (provides default empty array)
- Utility functions use typed parameters: `formatTimeRemaining = (ms: number)`

**Return Values:**
- Components return JSX/React.ReactNode
- Utility functions return explicit types: `string`, `number`, `boolean`
- Formatters always return strings even for empty cases: `...? ... : ''`

**Nullish Coalescing:**
- Common pattern: `m.balance ?? 0` or `trade.pnl || 0` (mixed usage of ?? and ||)
- Ternary operators for conditional rendering and styling
- Optional chaining used for object property access: `m.wallet?.length`

## Module Design

**Exports:**
- Named exports used selectively: `export const MODEL_LOGOS`, `export const CRYPTO_LOGOS`
- Default exports for React components: `export default ActivePositions`
- Named exports for constants and types: `export interface ModelInfo`, `export const MODELS`

**Barrel Files:**
- Minimal use; main barrel is `src/assets/logos/index.ts` which re-exports logos
- Direct imports preferred over barrel files for components

**Component Composition:**
- Subcomponents defined inline in parent file (e.g., `TradeLogEntry` within `ActivePositions.tsx`)
- Props interfaces defined at top of file
- Extracted helper functions placed before component definition

**Default Props:**
- React prop defaults: `trades?: TradeEntry[] = []` in component props
- Computed defaults using nullish coalescing: `equityData = []`

---

*Convention analysis: 2026-02-23*
