# Architecture

**Analysis Date:** 2026-02-23

## Pattern Overview

**Overall:** Multi-tier full-stack application with separated frontend (React SPA) and backend (Node.js Express server). The system implements a **copy-trading bot** that monitors blockchain/Polymarket activities and executes derivative trades across multiple AI agent wallets.

**Key Characteristics:**
- Frontend-backend separation with REST API + Server-Sent Events (SSE) real-time push
- Multi-agent pattern: 5 independent trading agents (Claude, ChatGPT, Gemini, Grok, DeepSeek)
- Event-driven backend with WebSocket subscriptions, polling fallback, and on-chain listeners
- Single-file SQLite database (better-sqlite3) for persistent trade history and agent stats
- Real-time data flow from external services (Polymarket API, blockchain) → Database → Frontend

## Layers

**Presentation Layer (Frontend):**
- Purpose: Provides interactive UI for monitoring agent trading activity, performance metrics, and trade history
- Location: `src/pages/`, `src/components/`
- Contains: React components, page layouts, UI composites (shadcn-based)
- Depends on: React Query (data fetching), React Router (navigation), TailwindCSS + Radix UI (styling)
- Used by: Browser clients via Vite dev server or Express static serve

**Application/Logic Layer (Frontend):**
- Purpose: Manages client-side state, data fetching, and real-time event subscriptions
- Location: `src/pages/Index.tsx` (primary), hooks in `src/hooks/`
- Contains: Component state management, fetch logic, SSE event listeners
- Depends on: Frontend REST API, SSE endpoint
- Used by: Presentation components

**API Layer (Backend):**
- Purpose: Exposes HTTP endpoints for frontend data access and control operations
- Location: `server/index.ts` (all endpoints defined inline)
- Contains: REST routes for `/api/trades`, `/api/stats`, `/api/balances`, `/api/prices`, `/api/events` (SSE)
- Depends on: Database models, services (copyTrader, realTrader, onChainListener)
- Used by: Frontend via fetch/EventSource

**Business Logic Layer (Backend):**
- Purpose: Implements core trading operations and multi-agent coordination
- Location: `server/services/`
- Contains:
  - `copyTrader.ts`: Donor trade detection, agent mapping, trade execution coordination
  - `realTrader.ts`: CLOB order execution, position management, token caching
  - `onChainListener.ts`: Polygon chain monitoring for on-chain market events
- Depends on: Database models, external APIs (Polymarket, blockchain RPC)
- Used by: API layer, scheduled tasks in main server loop

**Data Layer:**
- Purpose: Persistent storage and state management for all trading data
- Location: `server/models/db.ts`
- Contains: SQLite schema, trade records, balance snapshots, agent statistics
- Depends on: better-sqlite3 library, data directory at `/data/polyfive_copycat.db`
- Used by: All business logic and API routes

**Configuration/Constants:**
- Purpose: Centralized configuration for agent definitions, donor mappings, and crypto mappings
- Location: `src/data/constants.ts`, `shared/types.ts`
- Contains: MODELS array (5 AI agents), AGENT_DONORS mapping, type definitions
- Depends on: None (pure data)
- Used by: Frontend, backend services, configuration initialization

## Data Flow

**Real-Time Trade Capture Flow:**

1. External Donor Activity: Blockchain/Polymarket detects trade from configured donor wallet
2. Multiple Detection Paths (concurrent):
   - **WebSocket Path**: Polymarket RealTimeDataClient emits trade event
   - **Polling Path**: 3-second backup poll to Data API if WS gap
   - **On-Chain Path**: Polygon listener detects market creation/execution
3. Copy Trader Service (`copyTrader.ts`):
   - Identifies donor wallet in event
   - Maps donor → agent IDs from `AGENT_DONORS` config
   - For each mapped agent: create TradeEntry object with donor details
4. Real Trader Execution (`realTrader.ts`):
   - Retrieves/caches token ID from Polymarket market
   - Constructs CLOB order matching donor's direction and position size
   - Executes signed order via ClobClient
   - Stores executed trade in database
5. Database Persistence (`db.ts`):
   - Inserts trade record with all metadata
   - Updates agent stats (balance, PnL, win/loss count)
   - Records equity snapshots
6. Frontend Update (SSE):
   - Server emits `trade:open` event to all connected clients
   - Frontend receives event via `/api/events` EventSource
   - UI updates with toast notification and trade table refresh

**Trade Closure Flow:**

1. Market Resolution or Manual Close detected
2. Real Trader: Closes position via CLOB (market or limit order)
3. Database: Updates trade record with `exitPrice`, `pnl`, `pnlPercent`, `closeTimestamp`, `status`
4. Balance Sync:
   - 4-second immediate sync: `syncClobBalances()` queries Polymarket balance
   - 15-second second sync: Re-query for CLOB propagation
   - 2-minute periodic sync: Fallback background sync
5. Frontend: Receives `trade:close` and `stats:update` SSE events, refreshes display

**State Management:**

Frontend state (React hooks in `Index.tsx`):
- `modelStats`: Aggregated per-agent metrics (equity, PnL, win rate)
- `trades`: Array of all trades (open + closed)
- `equityData`: Historical balance snapshots for charting
- `prices`: Real-time crypto prices (cached 5-min fallback)
- `connected`: Server connection status

Backend state:
- In-memory maps: `donorWalletSet`, `donorToAgent`, `lastSeenTs` (trade deduplication)
- SQLite DB: Single source of truth for all trade history and agent stats
- Token cache: `tokenId` cached per market for 1 hour to reduce API calls

## Key Abstractions

**Agent:**
- Purpose: Represents one AI model trading independently on Polymarket
- Examples: Claude (`claude`), ChatGPT (`chatgpt`), Gemini (`gemini`), Grok (`grok`), DeepSeek (`deepseek`)
- Pattern:
  - Defined in `src/data/constants.ts` as MODELS array (ModelInfo[])
  - Each agent has unique wallet address and Polymarket profile
  - Agents map to donor wallets via AGENT_DONORS config
- Implementation: ClobClient instance per agent in realTrader, stats table in database

**Trade Entry:**
- Purpose: Represents one position opened and eventually closed
- Pattern: Immutable record with entry metadata (asset, direction, price, size) + exit data (exit price, PnL)
- Flow: Created when donor trade detected → persisted to DB → updated when market resolves
- File: `shared/types.ts` defines TradeEntry interface, stored in `trades` table

**Donor Wallet:**
- Purpose: External trader whose activities the agents copy
- Pattern: Configured in AGENT_DONORS as proxyWallet (Polymarket/WebSocket) or onchainWallet (Polygon)
- Used by: Copy trader service to identify relevant events, map to agents
- Multiple donors: Each agent can copy different donor, or all agents copy same donor

**CLOB Order:**
- Purpose: Atomic order executed on Polymarket CLOB exchange
- Pattern: Signed by agent's private key, includes token ID, size, price, direction (YES/NO)
- Token ID Cache: Maps (conditionId, outcomeIndex) → tokenId for 1 hour to avoid redundant API calls
- File: `server/services/realTrader.ts` implements order construction and caching

**Equity Snapshot:**
- Purpose: Point-in-time record of all agent balances for charting historical performance
- Pattern: Created after each trade execution, stored in `balances` table
- Used by: Frontend PerformanceChart component
- File: `db.ts` implements `recordEquitySnapshot()`, stores in balances table

## Entry Points

**Frontend Entry:**
- Location: `src/main.tsx`
- Triggers: Browser loads `index.html`
- Responsibilities: Renders React app into DOM, initializes QueryClient and routing

**Backend Entry:**
- Location: `server/index.ts`
- Triggers: `npm run server` or deployment startup
- Responsibilities:
  - Loads environment variables from `.env`
  - Initializes database (creates tables, runs migrations)
  - Starts Express server on PORT (default 3001)
  - Initializes 5 ClobClients for agents
  - Starts three concurrent services: copyTraderSocket, onChainListener, periodic balance sync
  - Serves static frontend from `/dist` in production
  - Exposes 10+ REST endpoints and SSE stream

**Main Page:**
- Location: `src/pages/Index.tsx`
- Triggers: Route `/` via React Router
- Responsibilities:
  - Manages all frontend state (trades, stats, prices, equityData)
  - Establishes REST polling (5-min fallback)
  - Establishes SSE connection to `/api/events` for real-time updates
  - Coordinates child components (PerformanceChart, ModelStats, TradeHistory, etc.)
  - Renders resizable panel layout with dark mode toggle

## Error Handling

**Strategy:** Multi-layer resilience with fallbacks

**Patterns:**

1. **Network Resilience:**
   - REST API: Wrapped in try-catch, returns 500 JSON error
   - Frontend: Fallback to 5-minute polling if SSE fails
   - Prices API: Returns static BTC/ETH/SOL/XRP prices if Binance API unreachable
   - Crypto logos: Gracefully omit if unavailable

2. **Database Resilience:**
   - SQLite WAL (Write-Ahead Logging) for durability
   - Migrations wrapped in try-catch (CREATE TABLE IF NOT EXISTS)
   - Backfill queries for missing columns on upgrade
   - Balance sync NEVER zeros on API failure (only updates if > 0)

3. **Process Crash Guard:**
   - Global `process.on('unhandledRejection')` listener
   - Global `process.on('uncaughtException')` listener
   - Port in use detection with helpful error message
   - Graceful shutdown on SIGINT

4. **Component Error Boundary:**
   - `src/components/ErrorBoundary.tsx` catches render errors
   - Displays error message and Reload button
   - Prevents full app crash from child component failures

5. **External Service Failures:**
   - Polymarket WebSocket: Auto-reconnect enabled
   - Polling backup: 3-second intervals catch missed events
   - On-chain listener: Continuous retry on RPC failures
   - CLOB execution: Order validation before submission

## Cross-Cutting Concerns

**Logging:** Console-based with prefixes for tracing
- Format: `[Module] ✅/⚠️/❌ message`
- Examples: `[CopyTrader]`, `[RealTrader]`, `[DB]`, `[WS]`, `[Proxy]`
- Used for: Trade events, agent initialization, sync operations, errors

**Validation:**
- Trade IDs: Format `{conditionId}_{outcomeIndex}_{txHash}_{agentId}`
- Wallet addresses: Regex `/^0x[0-9a-fA-F]{40}$/` for valid Ethereum addresses
- Order precision: GCD calculation to ensure CLOB-compatible fraction ratios
- Timestamps: Unix seconds for Polymarket, milliseconds for JS Date

**Authentication:**
- Admin endpoint: Optional password via `ADMIN_PASSWORD` env var
- CLOB orders: Signed via agent's private key (BOT_N_PKEY)
- API Key auth: CLOB API key/secret/passphrase per agent (BOT_N_CLOB_*)

**Data Serialization:**
- Frontend: JSON REST API, SSE payload as stringified JSON
- Database: SQLite binary format, migrations via SQL strings
- Types: Shared TypeScript interfaces in `shared/types.ts` enforced client + server

**Performance Optimization:**
- Token ID caching: 1-hour TTL in memory to reduce Polymarket API calls
- Balance sync debouncing: 4-second + 15-second staggered queries to allow CLOB propagation
- Trade deduplication: `lastSeenTs` per wallet prevents duplicate processing
- Connection pooling: Single SQLite connection (better-sqlite3 is thread-synchronous)
