# Roadmap: Creative Copycat Bot

## Overview

The existing codebase is nearly complete — React dashboard, Express backend, copy-trading engine, and SQLite persistence are all in place. Three phases ship the project: fix the build and ROI data bugs, patch the handful of copy-trading language still visible in the UI, then deploy to VPS with PM2/nginx and donor wallet configuration.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Bug Fixes** - Fix ROI calculation, remove bad dependency, and get the build passing clean
- [ ] **Phase 2: AI Narrative UX** - Patch the small number of copy-trading strings still leaking into the rendered UI
- [ ] **Phase 3: Deploy + Bot Config** - Ship to VPS with PM2, nginx, and donor wallet configuration

## Phase Details

### Phase 1: Bug Fixes
**Goal**: The project builds without errors and displays correct trade data
**Depends on**: Nothing (first phase)
**Requirements**: FIX-01, FIX-02, FIX-03
**Success Criteria** (what must be TRUE):
  1. Opening a trade shows entry price, position, and side; closing it shows P&L, win/loss, and cumulative ROI with correct values
  2. Running `npm run build` completes without errors and produces a working `dist/` directory
  3. `better-sqlite3` is absent from root `package.json` and Vite build succeeds without native-module errors
**Plans**: TBD

### Phase 2: AI Narrative UX
**Goal**: No copy-trading language is visible anywhere in the rendered UI
**Depends on**: Phase 1
**Requirements**: UX-01, UX-02, UX-03
**Success Criteria** (what must be TRUE):
  1. The empty-state message in TradeHistory no longer reads "Waiting for copy trades..." — it shows neutral or AI-framed text
  2. Every trade entry surfaces a short human-readable reason (the existing TRADE_ANALYSES pool already covers this for ActivePositions; confirm DecisionFeed and TradeHistory match)
  3. A full scan of all rendered text finds zero instances of "copy", "donor", or "wallet"
**Plans**: TBD

### Phase 3: Deploy + Bot Config
**Goal**: The site is live on a VPS, the bot runs 24/7 under process management, and adding donor wallets requires no code changes
**Depends on**: Phase 2
**Requirements**: DEP-01, DEP-02, DEP-03, DEP-04, DEP-05, BOT-01, BOT-02
**Success Criteria** (what must be TRUE):
  1. A single startup command builds and launches the server on the VPS
  2. The server automatically restarts after a crash and after a VPS reboot (PM2 ecosystem config in place)
  3. The site is reachable in a browser via the server's public IP or domain on port 80/443
  4. A step-by-step `.env` setup guide exists and the production environment boots correctly from it
  5. Donor wallet addresses can be added by editing one config location and restarting — no code changes required
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Bug Fixes | 0/TBD | Not started | - |
| 2. AI Narrative UX | 0/TBD | Not started | - |
| 3. Deploy + Bot Config | 0/TBD | Not started | - |
