# Client Agent — base context

**Work type:** `client`  
**Entry point:** always read this file first for frontend work.

Also read `docs/agents/BASE_AGENT.md` (project-wide) and `docs/agents/WORK_ORDERS.md` (pickup rules).

---

## Agent checklist (required)

Complete **every step** for each work item. Do not mark `Done` until all apply or are explicitly skipped in the work item.

- [ ] **1. Orient** — Read global `BASE_AGENT.md`, this file, and `WORK_ORDERS.md`.
- [ ] **2. Work order** — Read the assigned item(s) in `docs/work-orders/` (or `WORK_QUEUE.md`). Note acceptance criteria, branch, **Blocked by**, and **Docs to update**.
- [ ] **3. Auxiliary context** — Read any extra files listed on the work item or below (e.g. [overview.md](overview.md), [page-flows.md](page-flows.md)).
- [ ] **4. Client documentation** — Update docs for what the client is gaining (UI behavior, routes, state). Prefer `docs/UI_FORMS.md`, `docs/UI_DESIGN.md`, or a short note in the work order; add auxiliary docs in this folder when useful.
- [ ] **5. Design** — Confirm component/route structure matches specs; note non-obvious choices in the work item or client docs.
- [ ] **6. Implement** — Code under `client/` only; keep mock data labeled until `api` / `persistence` items land.
- [ ] **7. Tests (local)** — Add or update tests for straightforward UI logic you changed. If design is unclear, queue `unit-test` and mark `Blocked` — do not guess.
- [ ] **8. Run full verification** — `npm run check`; `npm run build` if build config changed; **`npm test` (entire suite) when a runner exists — all tests must pass** before `Done`. Fix failures [you caused](../test-strategy/BASE.md#who-fixes-failing-tests) on this branch, or block and hand off. Manual UI steps when required.
- [ ] **9. Close out** — Work item → `Done` (or `Blocked` with reason); update linked docs; git commit on the WO branch per D-012.
- [ ] **10. Report** — Summarize items completed, verification run, commits, and follow-ups.

---

## Mission

Implement all **Ready** work items with **Work type:** `client`. You own everything under `client/`.

---

## Auxiliary context (this directory)

| File | Purpose |
|------|---------|
| [overview.md](overview.md) | How the client is built (stack, folders, dev proxy) |
| [page-flows.md](page-flows.md) | Routes, screens, and API touchpoints (update as features land) |

Add new `.md` files here for deep dives (e.g. `comparison-playback.md`). Link them from work items when an agent should read them.

---

## Pickup workflow

When dispatched to process **all** Ready `client` work, follow [WORK_ORDERS.md](../WORK_ORDERS.md) (list → filter blockers → priority → per-item checklist above).

---

## Responsibilities

- React, TypeScript, Vite, routing, components, hooks, CSS/theme
- Consume `/api/*` contracts from docs or `api` work items — do not invent server shapes
- Dark theme per D-006; three forms per `UI_FORMS.md`

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

```bash
npm run check
```

Add `npm run build` for bundler/config changes. Document manual UI verification when needed.
