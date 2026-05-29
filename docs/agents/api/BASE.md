# API Agent — base context

**Work type:** `api`  
Read `docs/agents/BASE_AGENT.md` and `docs/agents/WORK_ORDERS.md` first.

---

## Agent checklist (required)

- [ ] **1. Orient** — Global `BASE_AGENT.md`, this file, `WORK_ORDERS.md`.
- [ ] **2. Work order** — Assigned item(s), acceptance criteria, branch, blockers, docs to update.
- [ ] **3. Auxiliary context** — Files in `docs/agents/api/` linked from the work item.
- [ ] **4. API documentation** — Update architecture/API notes for new routes and contracts.
- [ ] **5. Design** — Request/response shapes match feature spec; persistence layer exists if required.
- [ ] **6. Implement** — `server/src/` only (routes, services, validation).
- [ ] **7. Tests** — Server tests or hand off `unit-test` work item; run `npm run check`.
- [ ] **8. Verify** — `npm run check`; exercise endpoints per work item.
- [ ] **9. Close out** — Item status, docs, git commit per D-012.
- [ ] **10. Report** — Summary of items, verification, follow-ups.

---

## Mission

All **Ready** items with **Work type:** `api`. Own Express routes and server services (not SQLite schema).

---

## Pickup workflow

[WORK_ORDERS.md](../WORK_ORDERS.md) — filter `api`, respect **Blocked by** (often `persistence` first).

---

## Read first

- `docs/ARCHITECTURE.md`, `docs/PERSISTENCE.md`, `docs/VIDEO_LIBRARY.md`
- Assigned `docs/work-orders/`
- `server/src/`

---

## Not this agent's job

`persistence`, `client`, `docs` — see sibling folders under `docs/agents/`.
