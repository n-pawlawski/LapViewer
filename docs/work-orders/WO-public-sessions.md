# WO-public-sessions — Public session sharing

**Work order ID:** WO-public-sessions  
**Feature status:** Done  
**Priority:** P1  
**Git branch:** `feature/public-sessions`

## Source of truth (read before implementing)

- Feature: `docs/features/PUBLIC_SESSIONS_V1.md`
- UX: `docs/UI_DESIGN.md` — Data form
- Persistence: `docs/PERSISTENCE.md`
- Decisions: `docs/DECISIONS.md` — D-030

## Feature summary

Session-level public sharing for uploaded (S3) sessions so other authenticated accounts can browse laps, stream video, and compare—with ignored intake laps excluded from shared payloads.

## Acceptance criteria (feature level)

- [x] `sessions.isPublic` column (SQLite + Postgres)
- [x] `GET /api/sessions/public`, public read on session detail and video
- [x] `PATCH` supports `isPublic` (S3 complete upload only)
- [x] Non-owner responses strip ignored laps and private fields
- [x] Data UI: My sessions \| Public sessions tabs + Make public toggle
- [x] Compare disables marker adjust on non-owned sessions
- [x] `public-sessions-test.mjs` passes

## Item index

| ID | Work type | Status | Title |
|----|-----------|--------|-------|
| WO-public-sessions-01 | persistence | Done | `isPublic` schema + migration |
| WO-public-sessions-02 | api | Done | Access resolver + public endpoints |
| WO-public-sessions-03 | client | Done | Data tabs + visibility toggle |
| WO-public-sessions-04 | unit-test | Done | `public-sessions-test.mjs` |
| WO-public-sessions-TS | test-strategy | Done | Script + manual compare check |
| WO-public-sessions-05 | review | Done | Feature doc + D-030 |
