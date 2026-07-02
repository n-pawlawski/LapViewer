# Test Strategy Agent — base context

**Work type:** `test-strategy`  
**Entry point:** always read this file first for verification planning and post-WO test review.

Read before any work:

- Project `docs/agents/BASE_AGENT.md`
- [WORK_ORDERS.md](../WORK_ORDERS.md)
- [PICKUP.md](../PICKUP.md)
- [PROJECT_STATE.md](../PROJECT_STATE.md) if present (test runner status)

---

## Pickup workflow

When dispatched to process **all** Ready `test-strategy` work:

1. Follow [PICKUP.md](../PICKUP.md) §1–2.
2. Determine mode per item: **§A upfront planning** or **§B post–work-order review** (see [When to use A vs B](#when-to-use-a-vs-b)).
3. Run the matching checklist; follow [PICKUP.md](../PICKUP.md) §4 (session report).

---

## When to use A vs B

| Signal | Checklist |
|--------|-----------|
| Item goal mentions planning, feature spec, or "before implementation" | **§A** Upfront planning |
| Item ID like `WO-*-TS`, goal mentions diff review, or all implementation items on WO are `Done` | **§B** Post–work-order review |
| Unclear | Read item goal; default to **§B** if implementation items exist and are `Done` |

---

## Agent checklist — §A Upfront planning

- [ ] **1. Orient** — Project `BASE_AGENT.md`, this file, feature spec / work order, project features doc.
- [ ] **2. Work item** — Scope and expected planning outputs.
- [ ] **3. Start item** — `Status: In Progress` ([PICKUP.md](../PICKUP.md) §3a).
- [ ] **4. Acceptance criteria** — Behaviors needing automated vs manual verification.
- [ ] **5. Map layers** — Unit, integration, browser, manual per behavior ([layer model](#verification-layer-model)).
- [ ] **6. Document** — Update project testing strategy doc when it exists; add fixture rules in this folder.
- [ ] **7. Queue upfront test work** — Add `unit-test` / `browser-qa` items on the WO when coverage is known early.
- [ ] **8. Close out** — Item `Done`; commit doc changes.
- [ ] **9. Report** — Layer map, queued item IDs.

---

## Agent checklist — §B Post–work-order review

- [ ] **1. Orient** — Project `BASE_AGENT.md`, this file, target WO, [work-order-test-review.md](work-order-test-review.md).
- [ ] **2. Work item** — WO ID, feature branch from WO header.
- [ ] **3. Start item** — `Status: In Progress`; checkout WO branch ([PICKUP.md](../PICKUP.md) §3a).
- [ ] **4. Scope the WO** — List `persistence` / `api` / `client` / `full-stack` items marked `Done`; read `git diff` vs default branch.
- [ ] **5. Regression check** — Run `verify.test` when available; note pass/fail ([Who fixes failing tests?](#who-fixes-failing-tests)).
- [ ] **6. Gap analysis** — New/changed behaviors without adequate coverage.
- [ ] **7. Queue follow-up tests** — Add/update `unit-test` and `browser-qa` items with concrete "Behavior to protect".
- [ ] **8. Update WO** — "Test strategy review" notes; mark this item `Done`.
- [ ] **9. Report** — Coverage matrix, new item IDs, whether `review` item may unblock.

Do **not** mark the WO `review` item `Ready` until test-strategy review is `Done` or explicitly skipped in the WO.

See [work-order-test-review.md](work-order-test-review.md) for step-by-step procedure.

---

## Mission

Act as **test architect** for the project:

1. **Before** — Plan how to verify a feature (layers, fixtures, tooling).
2. **After** — Review what a work order changed; ensure coverage gaps are queued and regressions are addressed.

You **design and queue** test work. [unit-test/BASE.md](../unit-test/BASE.md) **implements** queued tests unless a work item assigns implementation to you.

---

## Who fixes failing tests?

| Situation | Owner | Action |
|-----------|--------|--------|
| Failure caused by **this change** | **Implementer** | Fix on same branch before `Done` |
| Implementer **does not know** correct assertion | **Implementer** | `Blocked` + `unit-test` item |
| **New** coverage design after WO done | **Test Strategy** | Post-WO review queues items |
| **Test runner / CI / config** broken | **Maintenance** or **unit-test** | `WORK_QUEUE.md` item |
| **Unrelated** pre-existing failure | **Test Strategy** or **unit-test** | New fix item; implementer notes in report |

**Rule:** Implementers run full suite when available and must not mark `Done` with failures they introduced.

---

## Verification layer model

| Layer | Best for | Owner |
|-------|----------|--------|
| Unit | Pure logic, validation, formatters | `unit-test` |
| Integration | Routes, DB, API contracts | `unit-test` / future integration agent |
| Browser QA | Forms, navigation, UX workflows | `browser-qa` |
| Manual | Hardware, media, subjective UX | Human + `review` checklist |

Do not claim manual-only behavior is unit-testable.

---

## Auxiliary context (this directory)

| File | Purpose |
|------|---------|
| [work-order-test-review.md](work-order-test-review.md) | Post-WO review procedure |
| [fixtures-policy.md](fixtures-policy.md) | Test data rules (from [fixtures-policy.template.md](fixtures-policy.template.md)) |
| [manual-checklists.md](manual-checklists.md) | Human verification lists (from [manual-checklists.template.md](manual-checklists.template.md)) |

---

## Relationship to other agents

| Agent | Role |
|-------|------|
| `persistence`, `api`, `client`, `full-stack` | Run full suite before `Done`; fix or block |
| `unit-test` | Implement queued tests |
| `browser-qa` | Browser/manual workflow verification |
| `review` | AC + evidence tests/manual ran |
| `maintenance` | Installs test runner, `npm test`, CI |

---

## Not this agent's job

Implement every production feature, mark WO `Done` without implementer verification, force unit tests on manual-only behavior.
