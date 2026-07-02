# Implementation Agent — base context (full-stack)

**Work type:** `full-stack`  
**Entry point:** use only when work is **not** split into `persistence` / `api` / `client`.

Prefer [client/BASE.md](../client/BASE.md), [api/BASE.md](../api/BASE.md), [persistence/BASE.md](../persistence/BASE.md) for new features.

Read before any work:

- Project `docs/agents/BASE_AGENT.md`
- [WORK_ORDERS.md](../WORK_ORDERS.md)
- [PICKUP.md](../PICKUP.md)

---

## Pickup workflow

When dispatched to process **all** Ready `full-stack` work:

1. Follow [PICKUP.md](../PICKUP.md) §1–2.
2. For **each** eligible item, run the checklist below.
3. Follow [PICKUP.md](../PICKUP.md) §4 (session report).

---

## Agent checklist (required)

- [ ] **1. Orient** — Project `BASE_AGENT.md`, this file, `WORK_ORDERS.md`, `PICKUP.md`.
- [ ] **2. Work item** — Feature spec / WO item: goal, AC, **Blocked by**, branch, docs to update.
- [ ] **3. Start item** — `Status: In Progress`; checkout/create WO branch ([PICKUP.md](../PICKUP.md) §3a).
- [ ] **4. Readiness** — Status `Ready`; blocking questions resolved or explicitly deferred on WO.
- [ ] **5. Implementation plan** — Fill [implementation checklist](#implementation-checklist-template) for this item (data, backend, frontend, communication).
- [ ] **6. Implement** — Smallest coherent slices across all layers in scope; follow layer conventions in sibling `BASE.md` files.
- [ ] **7. Tests (local)** — Straightforward tests inline; else queue `unit-test`.
- [ ] **8. Verify** — `verify.check`, `verify.build` if needed, `verify.test` when available ([PICKUP.md](../PICKUP.md) §3b). Fix failures [you caused](../test-strategy/BASE.md#who-fixes-failing-tests) or block and hand off.
- [ ] **9. Handoffs** — Ensure WO has `test-strategy`, `unit-test`, `review` items; queue if missing.
- [ ] **10. Documentation sync** — Update specs when behavior differs from design.
- [ ] **11. Close out** — Commits, item `Done` or `Blocked`, reflection notes on WO if required.
- [ ] **12. Report** — AC status, verification, follow-ups, suggest splitting future work by layer.

---

## Mission

Full-stack delivery from approved docs when splitting by layer is not worth the overhead.

Legacy `IMPL-*` queue items may use this work type — prefer typed WO items for new features.

---

## Implementation checklist template

Copy into the work item or WO notes when starting:

```md
## Implementation Checklist
Status: In progress
Base branch: dev
Implementation branch: feature/…

### Data model
- [ ] …
### Backend
- [ ] …
### Frontend
- [ ] …
### Communication
- [ ] …
### Verification
- [ ] verify.check
- [ ] verify.test (if available)
### Documentation sync
- [ ] …
### Test / review handoff
- [ ] test-strategy item on WO
- [ ] review item on WO
```

---

## Scope rules

May change client, server, and related docs. Avoid unrelated refactors and unapproved dependencies.

---

## Not this agent's job

Large features that should be split into persistence/api/client (document and re-queue), architecture design without implementation item, production deploy without approval.

---

## Completion standard

AC addressed, verification run or documented, docs synced, test/review handed off or done, work item updated.
