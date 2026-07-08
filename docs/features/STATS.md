# User stats

Extensible per-user statistics: incremental **counters** stored in the database and **computed** metrics resolved at read time from existing tables.

## Concepts

| Kind | Storage | When to use |
|------|---------|-------------|
| `counter` | `stat_counters` row per user | Repeatable events where history matters (e.g. logins) |
| `computed` | None — SQL at read time | Values derivable from existing data (e.g. session count) |

Do **not** store computed metrics as counters. That duplicates source of truth and drifts.

## Catalog

`stat_definitions` is the catalog. New stats are added by inserting a row (seeded at startup via `ensureStatDefinitions()` in `server/src/db/stats.ts`).

| key | kind | label | Notes |
|-----|------|-------|-------|
| `auth.login_count` | counter | Logins | Incremented on successful dev login or Google OAuth |
| `sessions.count` | computed | Sessions | `COUNT(*) FROM sessions WHERE userId = ?` |
| `tracks.count` | computed | Tracks | `COUNT(*) FROM tracks WHERE userId = ?` |

## API

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/stats/me` | Authenticated — returns current user's stats |
| GET | `/api/stats` | `stats.view` permission — all users |

Response shape (`/api/stats/me`):

```json
{ "stats": [{ "key": "auth.login_count", "label": "Logins", "kind": "counter", "value": 3 }] }
```

## Permission

- `stats.view` — assignable via the Permissions panel (root / nick only can manage permissions).
- Admin UI: `/account/stats` (client guard + server enforcement).

## Adding a counter stat

1. Add a row to `DEFAULT_STAT_DEFINITIONS` in `server/src/db/stats.ts` with `kind: "counter"`.
2. Call `incrementUserStat(userId, "<key>")` (or `recordUserLogin` pattern) at the event site — **not** on passive reads like `/api/auth/me`.
3. Add a unit test in `server/src/services/stats.test.ts`.
4. Update this doc and `docs/agents/persistence/schema-notes.md`.

## Adding a computed stat

1. Add a row to `DEFAULT_STAT_DEFINITIONS` with `kind: "computed"`.
2. Implement the resolver in `resolveComputedStat()` in `server/src/services/stats.ts`.
3. Document the SQL in the stat's `description` field.
4. Add a unit test.
5. Update admin table columns in `client/src/pages/AdminStatsPage.tsx` if the stat should appear in the default table.

## When NOT to add a stat

If you only need a one-off `COUNT(*)` in a single feature and it will not be shown in the stats catalog or admin page, query directly — do not add catalog noise.

## Related code

- DB: `server/src/db/stats.ts`, migrations in `server/src/db/database.ts`, `infra/postgres/schema.sql`
- Service: `server/src/services/stats.ts`
- Routes: `server/src/routes/stats.ts`
- Client: `client/src/pages/AdminStatsPage.tsx`, `client/src/api/stats.ts`

Decision: **D-031** in `docs/DECISIONS.md`.
