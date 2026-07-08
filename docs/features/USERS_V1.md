# Users & Accounts — v1 (Local Dev Foundation)

**Status:** Ready for implementation — **Implemented** on `feature/users-v1`  
**Phase:** Roadmap Phase 1  
**Related:** [ROADMAP.md](../ROADMAP.md), [PERSISTENCE.md](../PERSISTENCE.md), [ARCHITECTURE.md](../ARCHITECTURE.md), [DECISIONS.md](../DECISIONS.md) D-029

---

## Intent

Add a **user model** and **session ownership** so LapViewer can grow toward multi-user hosting without rewriting the data layer later. Phase 1 focuses on a **dev-only seeded account** for local work. Production sign-in uses **Google OAuth** ([D-029](DECISIONS.md)).

---

## Non-goals (Phase 1)

- AWS Cognito or other hosted auth brokers
- Email/password registration in production
- Email verification, password reset
- Cross-user lap compare or leagues

---

## Dev account pattern

| Environment | Behavior |
|-------------|----------|
| `NODE_ENV=development` or `LAPVIEWER_DEV_USER=1` | Seed dev user if missing; offer **Dev login** (`root` / `root`) |
| `npm start` without dev flags | No seed — unauthenticated API returns 401 |
| Hosted production | No dev seed ever; Google OAuth only |

**Dev user (seed):**

| Field | Value |
|-------|--------|
| Login | `root` |
| Password | `root` |
| Display name | `Root` |
| ID | `00000000-0000-4000-8000-000000000001` (fixed; see D-018) |
| UI | Header badge: **DEV ACCOUNT** |

---

## Production sign-in (Google OAuth)

| Step | Behavior |
|------|----------|
| Gate | **Continue with Google** → `/api/auth/google` |
| Callback | `/api/auth/google/callback` sets `lapviewer_uid` cookie |
| Account | Create or link user by `googleSub`; email must be verified by Google |

Setup: [DEVELOPMENT.md](../DEVELOPMENT.md#google-cloud-oauth-setup-one-time)

---

## Data model

### Table: `users`

| Column | Type | Notes |
|--------|------|-------|
| `id` | TEXT PK | UUID |
| `email` | TEXT UNIQUE | |
| `displayName` | TEXT | |
| `passwordHash` | TEXT NULL | Dev user only in practice |
| `googleSub` | TEXT UNIQUE NULL | Google account subject id |
| `role` | TEXT | e.g. `user`, `admin` — optional v1 |
| `createdAt` | TEXT | ISO timestamp |

### `sessions` — column

| Column | Type | Notes |
|--------|------|-------|
| `userId` | TEXT NOT NULL FK → `users(id)` | All session queries filter by this |

### Tracks / detection

**Decision:** Add `userId` to `tracks` with `UNIQUE(userId, name)`. Detection tables remain keyed by `trackId`; ownership enforced via track join.

---

## API

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/api/auth/config` | — | `googleAuthEnabled`, `devUserMode` |
| GET | `/api/auth/google` | — | Redirect to Google OAuth |
| GET | `/api/auth/google/callback` | — | Complete OAuth; set cookie |
| POST | `/api/auth/login` | — | **Dev mode only** — `root` / `root` |
| POST | `/api/auth/register` | — | **410** — disabled |
| GET | `/api/auth/me` | cookie | Returns current user or 401 |
| POST | `/api/auth/logout` | cookie | Clears session |

All existing session/marker routes require authenticated user; scope reads/writes to `req.userId`.

---

## Client

- `useAuth` context: load `/api/auth/me` and `/api/auth/config` on mount
- Unauthenticated → **Continue with Google** (when configured) + optional **Dev login**
- Header: display name + dev badge when applicable
- API fetch includes credentials (`credentials: 'include'`)

---

## Acceptance criteria

- [x] Dev user seeded **only** when dev mode env is set
- [x] `npm start` without dev flag does **not** seed dev user
- [x] Google OAuth creates/links users by `googleSub`
- [x] Password registration disabled in production API
- [x] Sessions list/create scoped to authenticated `userId`
- [x] Tracks scoped per-user
- [x] Second user in DB cannot read another user's sessions via API
- [x] Env vars documented in [DEVELOPMENT.md](../DEVELOPMENT.md)

---

## Decision recorded

**D-018 — Dev-only seeded account:** Local development may seed a fixed dev user; production environments never auto-create it. See [DECISIONS.md](../DECISIONS.md).

**D-029 — Google OAuth:** Production sign-in via Google only; dev password login retained for `root`. See [DECISIONS.md](../DECISIONS.md).
