# Testing Strategy

**Status:** Active  
**Last updated:** 2026-07-07  
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

| Area | Location | Notes |
|------|----------|-------|
| Permission parsing / admin | `server/src/auth/permissions.test.ts` | `canManagePermissions`, `userHasPermission`, key sanitization |
| Auth flows | `server/scripts/auth-test.mjs` | Login, session cookie, dev user |
| Public session isolation | `server/scripts/public-sessions-test.mjs` | Cross-account read, sanitized payloads |
| Split detection math | `server/src/services/splitDetectionMath.test.ts` | Eligibility helpers |

---

## Planned expansion (Roadmap Phase 4C)

1. **Permission middleware** — HTTP-level tests that `tracks.manage`, `sessions.delete`, and `stats.view` return 403 without the grant.
2. **Client route guards** — Lightweight tests for `hasPermission` and `RequirePermission` redirect targets.
3. **Split workflow** — Unit tests for `useSplitDetectionWorkflow` job queue / batch labeling (mock API).
4. **CI wiring** — GitHub Actions job running `npm run check` + `npm test` on PRs to `dev` and `master`.

Add new `*.test.ts` files next to the module under test; keep long-running browser/E2E tests as optional scripts until Playwright (or similar) is adopted.

**Work order:** Implementation tasks are broken down in [work-orders/WO-unit-test-gate.md](work-orders/WO-unit-test-gate.md). An archived parallel-agent dispatch guide is preserved at [agents/archive/MULTIAGENT_DISPATCH_4C.md](agents/archive/MULTIAGENT_DISPATCH_4C.md) (not the default workflow).

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
