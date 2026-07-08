# Schema notes

## Tables

| Table | Purpose | Key columns |
|-------|---------|-------------|
| `stat_definitions` | Catalog of known user stats | `key` PK, `kind` (`counter` \| `computed`), `scope` (`user`) |
| `stat_counters` | Incremental counter values per user | `userId`, `statKey`, `value`; UNIQUE `(userId, statKey)` |

## Invariants

- Every `stat_counters.statKey` must reference `stat_definitions.key`.
- Only `kind=counter` definitions may be written via `incrementUserStat`.
- Computed stats (`sessions.count`, `tracks.count`) are never stored in `stat_counters`.
- `auth.login_count` increments only on successful login (dev or Google OAuth), not on session refresh.

## Ownership

| Table | Read | Write |
|-------|------|-------|
| `stat_definitions` | `server/src/db/stats.ts`, `server/src/services/stats.ts` | Startup seed (`ensureStatDefinitions`) |
| `stat_counters` | `server/src/db/stats.ts`, `server/src/services/stats.ts` | `incrementStatCounter` via auth hooks and future event sites |

See `docs/features/STATS.md` for agent checklist when adding stats.
