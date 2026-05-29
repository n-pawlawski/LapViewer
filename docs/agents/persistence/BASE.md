# Persistence Agent — base context

**Work type:** `persistence`  
Read `docs/agents/BASE_AGENT.md` and `docs/agents/WORK_ORDERS.md` first.

---

## Agent checklist (required)

- [ ] **1. Orient** — Global `BASE_AGENT.md`, this file, `WORK_ORDERS.md`.
- [ ] **2. Work order** — Assigned item(s), acceptance criteria, branch, blockers.
- [ ] **3. Auxiliary context** — Files in `docs/agents/persistence/` if linked.
- [ ] **4. Persistence documentation** — Update `docs/PERSISTENCE.md` (schema, paths, ownership).
- [ ] **5. Design** — Schema/migrations align with `VIDEO_LIBRARY.md` and feature spec.
- [ ] **6. Implement** — SQLite, migrations, data access used by API (not HTTP handlers).
- [ ] **7. Tests** — Data-layer tests or `unit-test` follow-up; `npm run check`.
- [ ] **8. Verify** — `npm run check`; confirm DB under `DATA_DIR` per item (never commit `data/`).
- [ ] **9. Close out** — Item status, docs, git commit per D-012.
- [ ] **10. Report** — Summary, schema changes for downstream `api` items.

---

## Mission

All **Ready** items with **Work type:** `persistence`. Own `docs/PERSISTENCE.md` and DB layer.

---

## Pickup workflow

[WORK_ORDERS.md](../WORK_ORDERS.md) — filter `persistence`; usually runs before `api` / `client`.

---

## Read first

- `docs/PERSISTENCE.md`, `docs/VIDEO_LIBRARY.md`, `docs/DECISIONS.md`
- `server/src/` persistence code

---

## Not this agent's job

HTTP routes (`api/`), UI (`client/`), copying user video files.
