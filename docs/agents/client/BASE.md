# Client Agent — base context

**Work type:** `client`  
**Entry point:** always read this file first for frontend work.

Read before any work:

- Project `docs/agents/BASE_AGENT.md` (doc map, git rules)
- [WORK_ORDERS.md](../WORK_ORDERS.md)
- [PICKUP.md](../PICKUP.md)
- [PROJECT_STATE.md](../PROJECT_STATE.md) if present

---

## Pickup workflow

When dispatched to process **all** Ready `client` work:

1. Follow [PICKUP.md](../PICKUP.md) §1–2 (discover, filter, sort).
2. For **each** eligible item, run the checklist below.
3. Follow [PICKUP.md](../PICKUP.md) §4 (session report).

---

## Agent checklist (required)

Complete **every step** per work item. Do not mark `Done` until all apply or are explicitly skipped on the item.

- [ ] **1. Orient** — Project `BASE_AGENT.md`, this file, `WORK_ORDERS.md`, `PICKUP.md`.
- [ ] **2. Work item** — Read goal, acceptance criteria, **Blocked by**, **Docs to update**, WO git branch.
- [ ] **3. Start item** — `Status: In Progress`; checkout/create WO branch ([PICKUP.md](../PICKUP.md) §3a).
- [ ] **4. Auxiliary context** — Files on the item or in [Auxiliary context](#auxiliary-context-this-directory) below.
- [ ] **5. Client documentation** — Update UI/routes/state docs per project doc map (`paths.features`, UX docs) or work item **Docs to update**; update [page-flows.md](page-flows.md) when routes change.
- [ ] **6. Design** — Confirm component/route structure matches specs; note non-obvious choices in client docs or the work item.
- [ ] **7. Implement** — Code under project client root only (see [overview.md](overview.md)); keep mock data labeled until `api` / `persistence` items land.
- [ ] **8. Tests (local)** — Add/update tests for straightforward UI logic. If design is unclear, queue `unit-test`, mark `Blocked` — do not guess.
- [ ] **9. Verify** — Run `verify.check`, `verify.build` if bundler/config changed, `verify.test` when available ([PICKUP.md](../PICKUP.md) §3b). Fix failures [you caused](../test-strategy/BASE.md#who-fixes-failing-tests) or block and hand off. Manual UI steps when required.
- [ ] **10. Close out** — Item → `Done` or `Blocked`; update linked docs; git commit on WO branch.
- [ ] **11. Report** — Add row to session summary ([PICKUP.md](../PICKUP.md) §4).

---

## Mission

Implement all **Ready** work items with **Work type:** `client`. Own the frontend application tree.

---

## Project docs (typical)

From project `BASE_AGENT.md` / `.agent-project.yaml`:

- Feature specs and acceptance criteria
- UX / forms / design docs
- Architecture and API contract notes
- Assigned `docs/work-orders/WO-*.md`

---

## Auxiliary context (this directory)

| File | Purpose |
|------|---------|
| [overview.md](overview.md) | Stack, repo layout, dev proxy |
| [page-flows.md](page-flows.md) | Routes, screens, API touchpoints |

Add feature-specific `.md` files; link from work items via **Auxiliary context**.

---

## Responsibilities

- UI framework, routing, components, hooks, styling
- Consume API contracts from specs or `api` work items — do not invent server shapes
- Follow project UX and theme decisions in `DECISIONS.md`

---

## Not this agent's job

| Work type | Agent folder |
|-----------|----------------|
| `persistence` | `docs/agents/persistence/` |
| `api` | `docs/agents/api/` |
| `docs` | `docs/agents/documentation/` |
| `unit-test` | `docs/agents/unit-test/` (unless this item includes tests in scope) |

---

## Default verification

From `.agent-project.yaml` `verify` (typical):

```bash
npm run check
```

Add `verify.build` for bundler/config changes. Document manual UI verification when required.
