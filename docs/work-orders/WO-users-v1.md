# Work order: Users & dev account v1

**Work order ID:** WO-users-v1  
**Feature status:** In progress  
**Priority:** P0  
**Git branch:** `feature/users-v1`

## Source of truth (read before implementing)

- Feature / product: `docs/features/USERS_V1.md`
- UX: `docs/UI_DESIGN.md` — header user badge
- Architecture: `docs/ARCHITECTURE.md`
- Persistence: `docs/PERSISTENCE.md`
- Decisions: `docs/DECISIONS.md` — D-018

## Feature summary

Add a user model, session/track ownership, dev-only seeded account, auth middleware on data routes, and client auth UX with **Continue as Dev** login.

## Acceptance criteria (feature level)

- [ ] Dev user seeded only when dev mode env is set
- [ ] `npm start` without dev flag does not seed dev user
- [ ] Sessions list/create scoped to authenticated userId
- [ ] Tracks scoped per-user
- [ ] Second user cannot read another user's sessions via API
- [ ] Header shows display name + DEV ACCOUNT badge
- [ ] Env vars documented in DEVELOPMENT.md

## Item index

| ID | Work type | Status | Title |
|----|-----------|--------|-------|
| WO-users-v1-01 | persistence | Ready | Schema, migration, dev seed |
| WO-users-v1-02 | api | Ready | Auth routes, middleware, scoping |
| WO-users-v1-03 | client | Ready | AuthProvider, DevLoginGate, header |
| WO-users-v1-04 | unit-test | Ready | Auth isolation script |
| WO-users-v1-TS | test-strategy | Draft | Post-WO test review |
| WO-users-v1-05 | review | Draft | AC review |

---

## WO-users-v1-01 — Schema, migration, dev seed

**Work type:** `persistence`  
**Status:** Ready  
**Priority:** P0  
**Blocked by:** —

**Goal:** Add `users` table, `userId` on sessions/tracks, migration backfill, dev user seed.

**Docs to update when Done:** `docs/PERSISTENCE.md`

---

## WO-users-v1-02 — Auth routes, middleware, scoping

**Work type:** `api`  
**Status:** Ready  
**Priority:** P0  
**Blocked by:** WO-users-v1-01

**Goal:** `/api/auth/*`, signed cookie session, `requireAuth` on data routes, user-scoped services.

**Docs to update when Done:** `docs/agents/api/routes.md`, `docs/ARCHITECTURE.md`

---

## WO-users-v1-03 — AuthProvider, DevLoginGate, header

**Work type:** `client`  
**Status:** Ready  
**Priority:** P0  
**Blocked by:** WO-users-v1-02

**Goal:** Client auth context, login gate, credentials on fetch, header badge/logout.

---

## WO-users-v1-04 — Auth isolation script

**Work type:** `unit-test`  
**Status:** Ready  
**Priority:** P1  
**Blocked by:** WO-users-v1-02

**Goal:** Script verifying dev seed, 401 without auth, cross-user isolation.

---

## WO-users-v1-05 — AC review

**Work type:** `review`  
**Status:** Draft  
**Blocked by:** WO-users-v1-03, WO-users-v1-04

**Goal:** Compare implementation to USERS_V1 acceptance criteria.
