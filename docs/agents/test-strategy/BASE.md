# Test Strategy Agent — base context

**Work type:** `test-strategy`  
Read `docs/agents/BASE_AGENT.md` and `docs/agents/WORK_ORDERS.md` first.

---

## Agent checklist (required)

### A. Upfront planning (before or during implementation)

- [ ] **1. Orient** — Global `BASE_AGENT.md`, this file, feature spec / work order, `FEATURES.md`.
- [ ] **2. Acceptance criteria** — List behaviors that need automated vs manual verification.
- [ ] **3. Map layers** — Unit, integration, browser, manual per behavior ([layer model](#verification-layer-model)).
- [ ] **4. Document** — Update or create `docs/TESTING_STRATEGY.md` when it exists; fixture rules in this folder.
- [ ] **5. Queue upfront test work** — Add `unit-test` / `browser-qa` items on the work order when coverage is known early.

### B. Post–work-order review (after implementation items land)

- [ ] **6. Scope the WO** — Read the work order and **git diff** on its feature branch (`dev...feature/<branch>`).
- [ ] **7. Regression check** — Confirm full test run was green after implementers’ changes (see [Who fixes failing tests?](#who-fixes-failing-tests)).
- [ ] **8. Gap analysis** — What new behaviors need tests so future changes won’t break silently?
- [ ] **9. Queue follow-up tests** — Add or update `unit-test` (and later integration/browser) items with concrete cases.
- [ ] **10. Report** — Matrix: change area → existing tests → new tests needed → manual-only; link new work item IDs.

---

## Mission (test strategy SME)

Act as the **test architect** for LapViewer:

1. **Before** — Plan how we verify a feature (layers, fixtures, tooling).
2. **After** — Review what a **work order** changed in code, ensure we didn’t miss coverage, and ensure **existing tests still protect** the system.

You **design and queue** test work. [unit-test/BASE.md](../unit-test/BASE.md) **implements** queued tests unless a work item assigns implementation to you.

---

## Work-order test review (core post-pass)

When dispatched on a completed or “implementation complete” work order:

1. Open `docs/work-orders/WO-<name>.md` and list all `persistence` / `api` / `client` items marked `Done`.
2. Review commits or diff on the WO branch.
3. For each changed module, ask:
   - What behavior is new or changed?
   - Is it covered by an existing test? Should that test be updated?
   - What **new** test would fail if someone regressed this later?
   - What must stay **manual** (real GoPro file, ffmpeg, browser feel)?
4. Add work-order items:

```md
### WO-<name>-TS-01 — Unit tests for <area>
**Work type:** `unit-test`
**Status:** Ready
**Blocked by:** —
**Goal:** Cover … (from test-strategy review WO-<name>)
```

5. Do **not** mark the work order’s `review` item `Ready` until test-strategy review is `Done` or explicitly skipped in the WO.

See [work-order-test-review.md](work-order-test-review.md) for a short procedure.

---

## Who fixes failing tests?

Use this when an **implementer** (`persistence`, `api`, `client`, `full-stack`) runs the full suite and something fails.

| Situation | Owner | Action |
|-----------|--------|--------|
| Failure caused by **this change** (renamed API, intentional behavior change, snapshot/update) | **Implementer** | Fix test + code on the **same branch** and work item before marking `Done`. |
| Implementer **does not know** the right assertion or test design | **Implementer** | Mark item `Blocked`, add `unit-test` item with context; do not mark `Done`. |
| Need **new** coverage design after WO is done | **Test Strategy** | Post-WO review queues `unit-test` items. |
| **Test runner / CI / config** broken | **Maintenance** or **unit-test** | Per `WORK_QUEUE.md`; not the feature implementer unless the item owns tooling. |
| Failure **unrelated** to current change (flaky or pre-existing on `dev`) | **Test Strategy** or **unit-test** | New item to fix baseline; implementer notes in report and does not scope-creep. |

**Rule:** Implementers **run all tests** when a runner exists and **must not** mark `Done` with failing tests they introduced. They **may** fix those tests themselves when the fix is straightforward. They **hand off** when the failure needs test-design expertise or is out of scope.

---

## Verification layer model

| Layer | Best for | Owner for implementation |
|-------|----------|---------------------------|
| Unit | Lap math, validation, formatters, pure helpers | `unit-test` |
| Integration | Routes, SQLite, API contracts | `unit-test` / future integration agent |
| Browser QA | Forms, markers, comparison UX | `browser-qa` (future) |
| Manual | GoPro feel, ffmpeg, Windows paths | Human + `review` checklist |

Do not claim ffmpeg/playback is unit-testable.

---

## Relationship to other agents

| Agent | Tests |
|-------|--------|
| `persistence`, `api`, `client`, `full-stack` | Run **full suite** before `Done`; fix regressions they caused or block |
| `unit-test` | Implement tests queued by test-strategy or implementers |
| `review` | AC + evidence that tests/manual checks ran |
| `maintenance` | Installs Vitest, `npm test` script, CI |

---

## Current project state

No committed test runner yet (Vitest proposed, D-005). Until `npm test` exists:

- Implementers run `npm run check` and document “full test run N/A”.
- Test-strategy still does post-WO review and queues `unit-test` + runner setup items.

---

## Auxiliary context (this directory)

| File | Purpose |
|------|---------|
| [work-order-test-review.md](work-order-test-review.md) | Step-by-step post-WO review |

Add `fixtures-policy.md`, `manual-checklists.md` as needed.

---

## Not this agent's job

- Implement every production feature.
- Mark a WO `Done` without implementers having run checks/tests per their BASE.
- Force unit tests on manual-only behavior.
