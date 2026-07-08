# Context: API permission middleware tests (WO-unit-test-gate-01)

**Work item:** WO-unit-test-gate-01  
**Output file:** `server/scripts/permissions-test.mjs`  
**npm script:** `test:permissions` in `server/package.json`

---

## Pattern to follow

Copy structure from:

- `server/scripts/auth-isolation-test.mjs` — temp DB, dev seed
- `server/scripts/public-sessions-test.mjs` — multi-user setup

Do **not** add supertest or new dependencies unless maintenance approves. Prefer:

1. Temp `DATA_DIR` + `initDatabase()` + `seedDevUserIfNeeded()`
2. Create users via `createUser` / `updateUserPermissions` from `server/src/db/users.ts`
3. Build minimal Express app or call route handlers with mocked `req`/`res` — **or** start server on ephemeral port

**Recommended:** Import `app` from `server/src/index.ts` if exportable; otherwise extract `createApp()` for tests (small refactor allowed if item scope).

Alternative without HTTP server: unit-test middleware directly:

```typescript
// server/src/middleware/requirePermission.test.ts
// Mock req.user.permissions, assert res.status(403)
```

If middleware unit tests are faster, use `node --test` colocated `requirePermission.test.ts` **instead of** script — update WO item and TESTING_STRATEGY accordingly. Script is preferred for full route stack coverage.

---

## Users to seed

| User | Permissions | Purpose |
|------|-------------|---------|
| `dev` (root) | All keys (dev seed) | Positive control |
| `restricted` | `[]` | Negative control |
| `deleter` | `["sessions.delete"]` | Delete-only |
| `trackAdmin` | `["tracks.manage"]` | Track mutations only |
| `statsViewer` | `["stats.view"]` | Stats only |

Create `restricted` with `findOrCreateGoogleUser` or `createUser`; set permissions via `updateUserPermissions`.

---

## Routes matrix (must assert)

| Method | Path | Permission | Expect without grant | Expect with grant |
|--------|------|------------|----------------------|-------------------|
| GET | `/api/tracks` | *(none)* | 200 | 200 |
| POST | `/api/tracks` | `tracks.manage` | 403 | 201 |
| PATCH | `/api/tracks/:id` | `tracks.manage` | 403 | 200 |
| DELETE | `/api/tracks/:id` | `tracks.manage` | 403 | 204 |
| PUT | `/api/tracks/:id/splits` | `tracks.manage` | 403 | 200 |
| DELETE | `/api/sessions/:id` | `sessions.delete` | 403 | 204 |
| GET | `/api/stats` | `stats.view` | 403 | 200 |

Also cover one **track detection** mutation if low cost:

| PUT | `/api/tracks/:trackId/detection-profile` | `tracks.manage` | 403 | 200 |

Session delete: create session owned by `deleter`, attempt delete as same user.

---

## Auth cookie / session

Reuse session signing from `server/src/auth/session.ts` (`signUserId`) and set `Cookie` header on requests, or call internal test helper used by other scripts.

Inspect `server/src/middleware/requireAuth.ts` for how `req.user` is populated.

---

## Assertions

```javascript
function assert(condition, message) {
  if (!condition) throw new Error(message);
}
```

Exit code 0 on success; print `permissions-test: all checks passed`.

---

## Verification commands

```bash
npm run test:permissions --prefix server
npm run check
```

---

## Docs

Update `docs/TESTING_STRATEGY.md` table with new script row.
