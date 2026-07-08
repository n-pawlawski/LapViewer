# Testing Strategy

**Status:** Active  
**Last updated:** 2026-07-08  
**Related:** [PROCESS_HYGIENE.md](PROCESS_HYGIENE.md), [ROADMAP.md](ROADMAP.md), [docs/agents/unit-test/BASE.md](agents/unit-test/BASE.md)

---

## Goal

Every merge to `dev` and promotion to `master` should be backed by automated checks that catch regressions in auth, permissions, session access, and core API behavior — not only TypeScript compile and lint.

---

## Verification ladder

| Step | Command | When |
|------|---------|------|
| Typecheck + lint | `npm run check` | Every meaningful change |
| Server unit / integration scripts | `npm test` (root) | Every change touching server behavior |
| Targeted scripts | `npm run test:auth --prefix server`, `npm run test:public --prefix server`, etc. | When touching those areas |
| Manual smoke | Data → Intake → Compare on a real session | Before merging large UI or intake work |

**Gate before push to `master`:** `npm run check` and `npm test` must pass locally (CI will enforce the same once a remote is configured).

---

## What we test today

| Area | Command / location | Notes |
|------|-------------------|-------|
| Permission parsing / admin | `server/src/auth/permissions.test.ts` | `canManagePermissions`, `userHasPermission`, key sanitization |
| Auth / Google user flows | `server/src/services/auth.google.test.ts` | Google account create, link, reject unverified |
| Lap / split / track math | `server/src/services/*Math.test.ts`, `trackProgressMath.test.ts` | Pure detection helpers |
| User stats catalog | `server/src/services/stats.test.ts` | Counters, computed stats, login recording |
| Auth isolation (HTTP stack) | `npm run test:auth --prefix server` | Login, session cookie, dev user, cross-user session read |
| Public session sharing | `npm run test:public --prefix server` | Cross-account read, sanitized payloads, `isPublic` |
| Permission middleware (HTTP) | `npm run test:permissions --prefix server` | 403/2xx for `tracks.manage`, `sessions.delete`, `stats.view` |

**Root gate:** `npm test` runs all server unit tests plus the three integration scripts above (fail fast).

---

## CI

| Platform | File | When |
|----------|------|------|
| GitLab | `.gitlab-ci.yml` | MRs and pushes to **`master`** (full gate: check + test + build); MRs/pushes to **`dev`** (check + test) |
| GitHub | `.github/workflows/ci.yml` | Push/PR to `dev` or `master` (check + test + build) |

Local parity before promoting `dev` → `master`: `npm run check && npm test && npm run build`.

---

## Planned expansion (Roadmap Phase 4C — remaining)

1. **Client route guards** — Vitest tests for `hasPermission` and `RequirePermission` redirect targets.
2. **Split workflow** — Unit tests for `useSplitDetectionWorkflow` job queue / batch labeling (mock API).
3. **Browser QA** — Manual checklist for permission redirects (Tracks tab, stats route); not automated in CI yet.

Add new `*.test.ts` files next to the module under test; keep long-running browser/E2E tests as optional scripts until Playwright (or similar) is adopted.

**Work order:** Remaining items in [work-orders/WO-unit-test-gate.md](work-orders/WO-unit-test-gate.md) (client Vitest, browser QA). Server permission script and root test aggregation are **done**.

---

## What we defer

- Full browser E2E for Intake video playback (ffmpeg + codec variance).
- Visual regression for timeline UI.
- Load testing object-storage upload paths.

---

## Traceability

| Doc | Role |
|-----|------|
| This file | What to run, what to add, promotion gates |
| [ROADMAP.md](ROADMAP.md) | Phase 4C — automated test gate |
| [PROCESS_HYGIENE.md](PROCESS_HYGIENE.md) | Branch merge discipline |
| [agents/unit-test/BASE.md](agents/unit-test/BASE.md) | Agent checklist for new tests |
