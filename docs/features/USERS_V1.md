# Users & Accounts — v1 (Local Dev Foundation)

**Status:** Ready for implementation — **Implemented** on `feature/users-v1`  
**Phase:** Roadmap Phase 1  
**Related:** [ROADMAP.md](../ROADMAP.md), [PERSISTENCE.md](../PERSISTENCE.md), [ARCHITECTURE.md](../ARCHITECTURE.md)

---

## Intent

Add a **user model** and **session ownership** so LapViewer can grow toward multi-user hosting without rewriting the data layer later. Phase 1 focuses on a **dev-only seeded account** for local work — not production signup.

---

## Non-goals (Phase 1)

- AWS Cognito or hosted auth
- Email verification, password reset
- Cross-user lap compare or leagues
- Production signup UI

---

## Dev account pattern

| Environment | Behavior |
|-------------|----------|
| `NODE_ENV=development` or `LAPVIEWER_DEV_USER=1` | Seed dev user if missing; offer **Continue as Dev** |
| `npm start` without dev flags | No seed — unauthenticated API returns 401 |
| Hosted production | No dev seed ever |

**Dev user (seed):**

| Field | Value |
|-------|--------|
| Email | `dev@lapviewer.local` |
| Display name | `Dev Driver` |
| ID | `00000000-0000-4000-8000-000000000001` (fixed; see D-018) |
| UI | Header badge: **DEV ACCOUNT** |

**Default:** Dev login via button, not silent auto-login.

---

## Data model

### New table: `users`

| Column | Type | Notes |
|--------|------|-------|
| `id` | TEXT PK | UUID |
| `email` | TEXT UNIQUE | |
| `displayName` | TEXT | |
| `passwordHash` | TEXT NULL | Null for dev-only user in Phase 1 |
| `role` | TEXT | e.g. `user`, `admin` — optional v1 |
| `createdAt` | TEXT | ISO timestamp |

### `sessions` — add column

| Column | Type | Notes |
|--------|------|-------|
| `userId` | TEXT NOT NULL FK → `users(id)` | All session queries filter by this |

### Migration

- On first run after migration: assign existing sessions and tracks to the dev user when dev mode is active.
- Without dev mode: startup fails with a clear error if orphan rows exist (no dev user to assign).

### Tracks / detection

**Decision:** Add `userId` to `tracks` with `UNIQUE(userId, name)`. Detection tables remain keyed by `trackId`; ownership enforced via track join.

---

## API

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| POST | `/api/auth/dev-login` | — | **Dev mode only**; sets httpOnly session cookie |
| GET | `/api/auth/me` | cookie | Returns current user or 401 |
| POST | `/api/auth/logout` | cookie | Clears session |

All existing session/marker routes require authenticated user; scope reads/writes to `req.userId`.

---

## Client

- `useAuth` context: load `/api/auth/me` on mount
- Dev mode + 401 → show **Continue as Dev** (not auto-login)
- Header: display name + dev badge when applicable
- API fetch includes credentials (`credentials: 'include'`)

---

## Acceptance criteria

- [x] Dev user seeded **only** when dev mode env is set
- [x] `npm start` without dev flag does **not** seed dev user
- [x] Sessions list/create scoped to authenticated `userId`
- [x] Tracks scoped per-user
- [x] Second user in DB cannot read another user's sessions via API
- [x] Env vars documented in [DEVELOPMENT.md](../DEVELOPMENT.md)

---

## Follow-up (Phase 4, pre-deploy)

- Real signup/login (email + password or magic link)
- Password hashing (bcrypt or argon2)
- Session cookie settings for production (Secure, SameSite)

---

## Decision recorded

**D-018 — Dev-only seeded account:** Local development may seed a fixed dev user; production environments never auto-create it. See [DECISIONS.md](../DECISIONS.md).
