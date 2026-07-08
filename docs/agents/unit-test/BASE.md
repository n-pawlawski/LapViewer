# Unit Test Agent — base context

**Work type:** `unit-test`  
**Entry point:** always read this file first for automated test implementation.

Read before any work:

- Project `docs/agents/BASE_AGENT.md`
- [WORK_ORDERS.md](../WORK_ORDERS.md)
- [PICKUP.md](../PICKUP.md)
- [PROJECT_STATE.md](../PROJECT_STATE.md) if present (runner availability)

---

## Pickup workflow

When dispatched to process **all** Ready `unit-test` work:

1. Follow [PICKUP.md](../PICKUP.md) §1–2.
2. For **each** eligible item, run the checklist below.
3. Follow [PICKUP.md](../PICKUP.md) §4 (session report).

If no test runner exists, queue a `maintenance` item and mark current item `Blocked` — do not pretend tests ran.

---

## Agent checklist (required)

- [ ] **1. Orient** — Project `BASE_AGENT.md`, this file, `WORK_ORDERS.md`, `PICKUP.md`, `PROJECT_STATE.md` (runner status).
- [ ] **2. Work item** — **Behavior to protect**, scope, source (test-strategy review or implementer handoff).
- [ ] **3. Start item** — `Status: In Progress`; checkout WO branch ([PICKUP.md](../PICKUP.md) §3a).
- [ ] **4. Auxiliary context** — [fixtures-policy.md](../test-strategy/fixtures-policy.md), files in this folder if linked.
- [ ] **5. Read implementation** — Code under test; feature acceptance criteria.
- [ ] **6. Design tests** — Behavior-focused cases; no real external media/files unless WO allows fixtures.
- [ ] **7. Implement tests** — Client and/or server packages; ask before new test dependencies ([runner-setup.md](runner-setup.md)).
- [ ] **8. Verify** — Targeted tests then full `verify.test`; `verify.check` minimum ([PICKUP.md](../PICKUP.md) §3b).
- [ ] **9. Close out** — Item `Done` or `Blocked` (no runner / unclear behavior); git commit on WO branch.
- [ ] **10. Report** — Tests added, behavior covered, commands run, remaining gaps.

---

## Mission

Implement deterministic tests **queued** by work orders or [test-strategy/BASE.md](../test-strategy/BASE.md) post–work-order review.

Not browser, e2e, or manual media verification — see `browser-qa/` and review manual checklists.

When an implementer marks `Blocked` and assigns a failing test, treat that work item as source of truth.

---

## Test locations (typical monorepo)

| Area | Location pattern |
|------|------------------|
| Client | `client/src/**/*.test.ts(x)` or colocated `*.test.ts` |
| Server | `server/src/**/*.test.ts` |
| Shared | Project `BASE_AGENT.md` may specify |

Match existing project conventions before adding new patterns.

---

## Good vs poor candidates

**Good:** validation, formatters, path helpers, pure reducers, service logic with mocks.  
**Poor:** real playback, external binaries, full import flows → queue `browser-qa` or manual review.

---

## Auxiliary context (this directory)

| File | Purpose |
|------|---------|
| [runner-setup.md](runner-setup.md) | Runner config and commands |
| [fixtures-policy.md](../test-strategy/fixtures-policy.md) | Shared fixture rules |
| [context/permission-api-middleware.md](context/permission-api-middleware.md) | WO-unit-test-gate-01 |
| [context/permission-client-guards.md](context/permission-client-guards.md) | WO-unit-test-gate-02 |
| [context/split-workflow-hook.md](context/split-workflow-hook.md) | WO-unit-test-gate-03 |

---

## Rules

Test behavior not internals; small fixtures; no machine-specific paths; no new dependencies without approval.

---

## Not this agent's job

Product features, browser QA, fixing production bugs unless the work item says so, adding Vitest/Jest without `maintenance` approval when first introducing runner.
