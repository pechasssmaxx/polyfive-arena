# STRUCTURE.md — Directory Layout & Module Boundaries

## Top-Level Layout

```
creative-copycat-bot-main/
├── src/                        # React frontend (Vite + TypeScript)
├── server/                     # Express backend + SSE server
├── seungmaeda_repo/            # Embedded upstream bot (original copycat engine)
├── shared/                     # Shared TypeScript types between frontend and server
├── data/                       # SQLite database files (runtime)
├── public/                     # Static frontend assets
├── .claude/                    # Claude Code config
├── .agents/                    # GSD agent skills
├── .planning/                  # GSD planning documents
├── index.html                  # Vite entry point
├── vite.config.ts              # Frontend build config
├── vitest.config.ts            # Test config
├── tailwind.config.ts          # Tailwind CSS config
├── tsconfig.json               # Root TypeScript config
├── components.json             # shadcn/ui config
├── package.json                # Frontend dependencies
└── .env / .env.example         # Environment variables
```

## `src/` — React Frontend

```
src/
├── App.tsx                     # Root component, routing setup
├── App.css                     # Global app styles
├── main.tsx                    # React entry point (ReactDOM.render)
├── index.css                   # Tailwind base styles + CSS variables
├── vite-env.d.ts               # Vite type declarations
│
├── pages/
│   ├── Index.tsx               # Main dashboard page
│   └── NotFound.tsx            # 404 page
│
├── components/
│   ├── ActivePositions.tsx     # Active trade positions panel
│   ├── DecisionFeed.tsx        # Real-time AI decision stream
│   ├── ErrorBoundary.tsx       # React error boundary wrapper
│   ├── ModelStats.tsx          # Per-model performance statistics
│   ├── PerformanceChart.tsx    # P&L chart component (Recharts)
│   ├── TradeHistory.tsx        # Trade history table
│   └── ui/                     # shadcn/ui component library (40+ components)
│
├── data/
│   └── constants.ts            # App-wide constants (model names, config values)
│
├── hooks/
│   ├── use-mobile.tsx          # Responsive mobile detection hook
│   └── use-toast.ts            # Toast notification hook
│
├── lib/
│   └── utils.ts                # Utility functions (cn() className merger)
│
├── assets/
│   ├── icons/                  # Icon assets (pixel-moon, pixel-sun)
│   └── logos/                  # AI model logos (Claude, ChatGPT, Gemini, etc.)
│       └── index.ts            # Logo barrel export
│
└── test/                       # Frontend test directory (currently sparse)
```

## `server/` — Express Backend

```
server/
├── index.ts                    # Express server entry point, REST API routes
├── sse.ts                      # Server-Sent Events (SSE) push stream
├── package.json                # Server-specific dependencies
├── package-lock.json
└── tsconfig.json               # Server TypeScript config
```

**Key responsibilities:**
- REST API for frontend data fetching
- SSE stream pushing real-time trade decisions to dashboard
- Bridges seungmaeda_repo bot output → frontend

## `seungmaeda_repo/` — Upstream Copycat Engine

```
seungmaeda_repo/
├── src/
│   ├── index.ts                # Bot entry point — main trading loop
│   ├── config/
│   │   ├── env.ts              # Environment variable loading/validation
│   │   ├── db.ts               # SQLite database connection (better-sqlite3)
│   │   └── copyStrategy.ts     # Trading strategy configuration
│   ├── interfaces/
│   │   └── User.ts             # TypeScript interfaces for trader data
│   ├── models/
│   │   └── userHistory.ts      # DB model for trade history
│   ├── services/
│   │   ├── createClobClient.ts # Polymarket CLOB client factory
│   │   ├── tradeExecutor.ts    # Order placement and execution
│   │   └── tradeMonitor.ts     # Watches target trader activity
│   ├── utils/
│   │   ├── createClobClient.ts # (duplicate — utils vs services)
│   │   ├── fetchData.ts        # Polymarket API data fetching
│   │   ├── getMyBalance.ts     # Wallet balance query
│   │   ├── healthCheck.ts      # System health verification
│   │   ├── logger.ts           # Winston logger setup
│   │   ├── postOrder.ts        # Order submission helper
│   │   └── spinner.ts          # CLI spinner for terminal output
│   └── scripts/                # 30+ one-off utility/diagnostic scripts
│       ├── findBestTraders.ts  # Scan for profitable traders to copy
│       ├── simulateProfitability.ts  # Backtest simulation
│       ├── closeResolvedPositions.ts # Position cleanup
│       ├── manualSell.ts       # Manual sell override
│       └── ...                 # Many other diagnostic scripts
├── package.json
├── tsconfig.json
├── jest.config.js
└── README.md
```

## `shared/` — Cross-Boundary Types

```
shared/
└── types.ts                    # TypeScript types shared between server and frontend
```

## `data/` — Runtime Database

```
data/
├── polyfive_copycat.db         # Primary SQLite database
├── polyfive_copycat.db-shm     # SQLite shared memory
├── polyfive_copycat.db-wal     # SQLite write-ahead log
├── polyfive.db-shm             # Secondary DB shared memory
└── polyfive.db-wal             # Secondary DB WAL
```

## Naming Conventions

| Context | Convention | Example |
|---------|-----------|---------|
| React components | PascalCase files | `ActivePositions.tsx` |
| Hooks | `use-` prefix, kebab-case | `use-mobile.tsx` |
| Utilities | camelCase | `fetchData.ts`, `getMyBalance.ts` |
| Config files | camelCase | `copyStrategy.ts`, `db.ts` |
| Scripts | camelCase, verb-first | `checkAllowance.ts`, `findBestTraders.ts` |
| Constants | `UPPER_SNAKE_CASE` values, camelCase file | `constants.ts` |
| DB models | camelCase, noun | `userHistory.ts` |
| CSS | kebab-case classes (Tailwind utilities) | — |

## Key Entry Points

| Entry | Path | Purpose |
|-------|------|---------|
| Frontend | `src/main.tsx` | React app bootstrap |
| Backend | `server/index.ts` | Express API server |
| Bot | `seungmaeda_repo/src/index.ts` | Copycat trading loop |
| Root page | `src/pages/Index.tsx` | Dashboard UI |

## Where to Add New Code

| What | Where |
|------|-------|
| New UI component | `src/components/` |
| New page/route | `src/pages/` |
| New hook | `src/hooks/` |
| New shared type | `shared/types.ts` |
| New API endpoint | `server/index.ts` |
| New bot service | `seungmaeda_repo/src/services/` |
| New bot utility | `seungmaeda_repo/src/utils/` |
| New diagnostic script | `seungmaeda_repo/src/scripts/` |
| New constant | `src/data/constants.ts` |

---
*Generated by gsd-codebase-mapper — arch focus*
