# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-23)

**Core value:** Every trade by every agent appears on-site in real time without lag, with balances and charts that honestly reflect real wallet data
**Current focus:** Phase 1 — Bug Fixes

## Current Position

Phase: 1 of 3 (Bug Fixes)
Plan: 0 of TBD in current phase
Status: Ready to plan
Last activity: 2026-02-23 — Roadmap created, ready to begin planning Phase 1

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**
- Total plans completed: 0
- Average duration: -
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

*Updated after each plan completion*

## Accumulated Context

### Decisions

- Copy-trade vs AI-trading: Agents copy donors, do not reason independently
- SQLite vs Postgres: Single-file SQLite chosen, stays as-is
- SSE vs WebSocket for frontend: SSE chosen, read-only display

### Code Context (from review)

- ActivePositions.tsx already has full TRADE_ANALYSES pool (10 phrases, deterministic by trade ID)
- TradeHistory.tsx line 185 has one leaking string: "Waiting for copy trades..."
- DecisionFeed.tsx shows marketQuestion directly — no copy-trade language visible
- Two SQLite files exist: `polyfive_copycat.db` (active) and `polyfive.db` (old/unknown)
- Phase 2 is a small patch job, not a big UX rewrite

### Pending Todos

None yet.

### Blockers/Concerns

- CONCERNS.md flags race conditions in polling and missing DB indexes — may surface during Phase 1 ROI fix work
- Two SQLite files — confirm which is active before touching DB logic

## Session Continuity

Last session: 2026-02-23
Stopped at: Roadmap and STATE written, code reviewed
Resume file: None
