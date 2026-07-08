# WO-unit-test-gate — Phase 4C automated test gate

**Work order ID:** WO-unit-test-gate  
**Feature status:** Ready for implementation  
**Priority:** P1  
**Git branch:** `feature/unit-test-gate`

## Source of truth (read before implementing)

- Roadmap: `docs/ROADMAP.md` — Phase 4C
- Testing ladder: `docs/TESTING_STRATEGY.md`
- Permissions: `server/src/auth/permissions.ts`, `client/src/lib/permissions.ts`, `client/src/components/RequirePermission.tsx`
- Split workflow: `client/src/hooks/useSplitDetectionWorkflow.ts`
- Multi-agent coordinator (archived): `docs/agents/archive/MULTIAGENT_DISPATCH_4C.md`
- Agent pickup: `docs/agents/PICKUP.md`, `docs/agents/WORK_ORDERS.md`

## Feature summary

Expand automated coverage so permission enforcement, route guards, and split-suggestion orchestration regressions are caught before `dev` → `master`. Wire scripts into the root `npm test` ladder and document browser checks for redirects.

**Baseline (already on `dev`):** permission middleware on track mutations and session delete; client `RequirePermission` on `/tracks` and `/account/stats`; `useSplitDetectionWorkflow` extracted from Intake marking panel.

## Acceptance criteria (feature level)

- [ ] HTTP/script tests prove `tracks.manage`, `sessions.delete`, and `stats.view` return **403** without the grant (and **2xx** with grant)
- [ ] Client unit tests cover `hasPermission`, `canViewStats`, and `RequirePermission` redirect behavior
- [ ] Client unit tests cover `useSplitDetectionWorkflow` batch queue and proposal merge (mocked API)
- [ ] Root `npm test` runs server unit tests **and** new integration scripts; CI unchanged or updated only if script paths change
- [ ] Browser QA checklist executed for permission redirects (Tracks tab, manage-users hash, stats route)
- [ ] `docs/TESTING_STRATEGY.md` updated with new script names and ownership

## Parallelization summary

| Wave | Items | Agents (parallel) | Shared files risk |
|------|-------|-------------------|-------------------|
| **1** | 01, 05 | unit-test + maintenance | Low — different trees |
| **2** | 00 | maintenance | Blocks 02, 03 |
| **3** | 02, 03 | unit-test × 2 | Low — different test files |
| **4** | 04 | browser-qa | None |
| **5** | TS, 06 | test-strategy → review | Docs only |

See `docs/agents/archive/MULTIAGENT_DISPATCH_4C.md` (archived) for copy-paste dispatch prompts.

## Item index

| ID | Work type | Status | Title | Blocked by |
|----|-----------|--------|-------|------------|
| WO-unit-test-gate-01 | unit-test | **Ready** | API permission middleware script | — |
| WO-unit-test-gate-05 | maintenance | **Ready** | Root test script aggregation | — |
| WO-unit-test-gate-00 | maintenance | Draft | Client Vitest runner | — |
| WO-unit-test-gate-02 | unit-test | Draft | Client permission helpers + route guard tests | 00 |
| WO-unit-test-gate-03 | unit-test | Draft | `useSplitDetectionWorkflow` hook tests | 00 |
| WO-unit-test-gate-04 | browser-qa | Draft | Permission redirect manual checklist | 01, 02 |
| WO-unit-test-gate-TS | test-strategy | Draft | Post-WO test review | 01, 02, 03, 05 |
| WO-unit-test-gate-06 | review | Draft | AC sign-off | TS, 04 |

**Coordinator:** After Wave 1 completes, set **00** to `Ready`. After **00** is `Done`, set **02** and **03** to `Ready` in parallel. After **02** is `Done`, set **04** to `Ready`.

---

## WO-unit-test-gate-01 — API permission middleware script

**Work type:** `unit-test`  
**Status:** Ready  
**Priority:** P0  
**Blocked by:** —  
**Auxiliary context:** `docs/agents/unit-test/context/permission-api-middleware.md`

**Goal:** Add `server/scripts/permissions-test.mjs` that boots an isolated DB, creates users with/without grants, and asserts HTTP 403/2xx on protected routes.

**Context:** Pattern matches `auth-isolation-test.mjs` and `public-sessions-test.mjs` (temp `DATA_DIR`, import services/routes). Middleware lives in `requireUserPermission` on tracks mutations, session delete, stats.

**Work to perform when Ready:**

- Implement script per auxiliary context (routes matrix, user fixtures, assertions)
- Add `npm run test:permissions --prefix server`
- Optionally chain from root `package.json` `test` script (or leave for WO-05)

**Acceptance criteria:**

- Without `tracks.manage`: `POST /api/tracks` → 403; `GET /api/tracks` → 200
- Without `sessions.delete`: `DELETE /api/sessions/:id` → 403 for owner
- Without `stats.view`: `GET /api/stats` → 403
- With grants: corresponding success responses
- Script exits 0; documented in `TESTING_STRATEGY.md`

**Verification:**

- `npm run test:permissions --prefix server`
- `npm run check`

**Docs to update when Done:**

- `docs/TESTING_STRATEGY.md` — row in “What we test today”

---

## WO-unit-test-gate-05 — Root test script aggregation

**Work type:** `maintenance`  
**Status:** Ready  
**Priority:** P0  
**Blocked by:** —  
**Auxiliary context:** `docs/agents/maintenance/context/root-test-scripts.md`

**Goal:** Make `npm test` at repo root run server unit tests **plus** integration scripts (`test:auth`, `test:public`, `test:permissions` when 01 lands).

**Work to perform when Ready:**

- Update root `package.json` `test` script to run unit tests then scripts (fail fast)
- Confirm `.github/workflows/ci.yml` still passes (already runs `npm test`)
- Document commands in `TESTING_STRATEGY.md`

**Acceptance criteria:**

- `npm test` from repo root runs all gated scripts
- No new npm dependencies without approval

**Verification:**

- `npm test`
- `npm run check`

**Docs to update when Done:**

- `docs/TESTING_STRATEGY.md`
- `docs/DEVELOPMENT.md` — test section if present

---

## WO-unit-test-gate-00 — Client Vitest runner

**Work type:** `maintenance`  
**Status:** Draft  
**Priority:** P0  
**Blocked by:** —  
**Auxiliary context:** `docs/agents/maintenance/context/client-vitest-setup.md`

**Goal:** Add Vitest (+ jsdom + Testing Library) to `client/` so hook and component tests can run in CI.

**Work to perform when Ready:**

- Add devDependencies and `vitest.config.ts`
- Add `"test": "vitest run"` to `client/package.json`
- Wire `npm run test --prefix client` into root `test` script (coordinate with WO-05 or same agent)
- Minimal smoke test file to prove runner works

**Acceptance criteria:**

- `npm run test --prefix client` passes in CI
- No changes to production Vite config that break `npm run build`

**Verification:**

- `npm run test --prefix client`
- `npm run check`
- `npm run build`

**Docs to update when Done:**

- `docs/TESTING_STRATEGY.md`
- `docs/agents/unit-test/runner-setup.md` if needed

---

## WO-unit-test-gate-02 — Client permission helpers + route guard tests

**Work type:** `unit-test`  
**Status:** Draft  
**Priority:** P1  
**Blocked by:** WO-unit-test-gate-00  
**Auxiliary context:** `docs/agents/unit-test/context/permission-client-guards.md`

**Goal:** Unit-test `hasPermission`, `canViewStats`, and `RequirePermission` redirect targets.

**Work to perform when Ready:**

- Pure tests for `client/src/lib/permissions.ts`
- Component tests with mocked `AuthContext` + `useRouter` for `RequirePermission`
- Cover: `/tracks` guard, stats guard, permission-admin hash behavior

**Acceptance criteria:**

- Tests fail if redirect target or permission key check is removed
- No real network or browser

**Verification:**

- `npm run test --prefix client`
- `npm run check`

**Docs to update when Done:**

- `docs/TESTING_STRATEGY.md`

---

## WO-unit-test-gate-03 — `useSplitDetectionWorkflow` hook tests

**Work type:** `unit-test`  
**Status:** Draft  
**Priority:** P1  
**Blocked by:** WO-unit-test-gate-00  
**Auxiliary context:** `docs/agents/unit-test/context/split-workflow-hook.md`

**Goal:** Test job queue, batch labeling, and proposal accumulation without video/ffmpeg.

**Work to perform when Ready:**

- Mock `../api/splitDetection` module
- Use `@testing-library/react` `renderHook` + fake timers for poll interval
- Cases: single lap, multi-lap batch, error mid-batch, cancel

**Acceptance criteria:**

- Batch progress and `onScanFinished` behavior covered
- Tests do not require server or media files

**Verification:**

- `npm run test --prefix client`
- `npm run check`

**Docs to update when Done:**

- `docs/TESTING_STRATEGY.md`

---

## WO-unit-test-gate-04 — Permission redirect browser checklist

**Work type:** `browser-qa`  
**Status:** Draft  
**Priority:** P1  
**Blocked by:** WO-unit-test-gate-01, WO-unit-test-gate-02  
**Auxiliary context:** `docs/agents/browser-qa/context/permission-redirects-checklist.md`

**Goal:** Manual evidence that UI hides routes and redirects match server enforcement.

**Work to perform when Ready:**

- Execute checklist with dev account + second user with stripped permissions
- Record pass/fail in work order Notes section

**Acceptance criteria:**

- All checklist rows pass or documented gaps become new work items

**Verification:**

- Checklist attached in WO Notes
- `npm run dev` smoke

**Docs to update when Done:**

- `docs/TESTING_STRATEGY.md` — manual layer pointer

---

## WO-unit-test-gate-TS — Test strategy review

**Work type:** `test-strategy`  
**Status:** Draft  
**Priority:** P1  
**Blocked by:** WO-unit-test-gate-01, WO-unit-test-gate-02, WO-unit-test-gate-03, WO-unit-test-gate-05

**Goal:** Review diff on `feature/unit-test-gate`; confirm coverage matrix; queue any gaps.

**Auxiliary context:** `docs/agents/test-strategy/work-order-test-review.md`

**Verification:**

- Report: behavior → test mapping
- Mark WO-unit-test-gate-06 `Ready` if AC met

---

## WO-unit-test-gate-06 — Review

**Work type:** `review`  
**Status:** Draft  
**Priority:** P1  
**Blocked by:** WO-unit-test-gate-TS, WO-unit-test-gate-04

**Goal:** Compare implementation to feature acceptance criteria above.

**Verification:**

- `docs/agents/review/BASE.md` checklist
- `npm run check` && `npm test` green

---

## Notes

- Permission **admin** panel uses `canManagePermissions` (root / Nick), not `users.manage` — do not test `users.manage` until product wires it.
- Dev user is seeded with all permissions in dev mode; browser QA must use a **second user** with empty permissions (grant individually for positive cases).
