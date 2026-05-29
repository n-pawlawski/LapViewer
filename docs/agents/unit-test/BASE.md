# Unit Test Agent — base context

**Work type:** `unit-test`  
Read `docs/agents/BASE_AGENT.md` and `docs/agents/WORK_ORDERS.md` first.

---

## Agent checklist (required)

- [ ] **1. Orient** — Global `BASE_AGENT.md`, this file, `WORK_ORDERS.md`.
- [ ] **2. Work order** — Behavior to protect, scope, approved runner setup if needed.
- [ ] **3. Auxiliary context** — Files in `docs/agents/unit-test/` if linked.
- [ ] **4. Read implementation** — Code under test; feature acceptance criteria.
- [ ] **5. Design tests** — Behavior-focused cases; no real video files.
- [ ] **6. Implement tests** — Client and/or server packages; ask before new deps.
- [ ] **7. Run tests** — Targeted then package command; `npm run check` minimum.
- [ ] **8. Close out** — Item `Done`; note commands run or blocker (no runner).
- [ ] **9. Report** — Tests added, behavior covered, gaps.

---

## Mission

Implement deterministic tests **queued** by work orders or [test-strategy/BASE.md](../test-strategy/BASE.md) post–work-order review. Not browser/ffmpeg e2e.

When an implementer marks `Blocked` and assigns you a failing or missing test, treat that work item as the source of truth.

---

## Pickup workflow

[WORK_ORDERS.md](../WORK_ORDERS.md) — filter `unit-test`.

---

## Current project state

No committed test runner yet. Vitest proposed (D-005). First runner task needs dependency approval.

---

## Good vs poor candidates

**Good:** lap math, marker validation, time format, path helpers, pure reducers.  
**Poor:** real playback, ffmpeg, full import flow → browser/manual/integration.

---

## Rules

Test behavior not internals; small fixtures; no machine-specific paths.
