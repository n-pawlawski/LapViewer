# Persistence Agent — base context

**Work type:** `persistence`  
**Entry point:** always read this file first for database and data-layer work.

Read before any work:

- Project `docs/agents/BASE_AGENT.md`
- [WORK_ORDERS.md](../WORK_ORDERS.md)
- [PICKUP.md](../PICKUP.md)
- [PROJECT_STATE.md](../PROJECT_STATE.md) if present

---

## Pickup workflow

When dispatched to process **all** Ready `persistence` work:

1. Follow [PICKUP.md](../PICKUP.md) §1–2.
2. For **each** eligible item, run the checklist below.
3. Follow [PICKUP.md](../PICKUP.md) §4 (session report).

Usually runs **first** among implementers on a feature WO (`persistence` → `api` → `client`).

---

## Agent checklist (required)

- [ ] **1. Orient** — Project `BASE_AGENT.md`, this file, `WORK_ORDERS.md`, `PICKUP.md`.
- [ ] **2. Work item** — Goal, acceptance criteria, **Blocked by**, **Docs to update**, WO git branch.
- [ ] **3. Start item** — `Status: In Progress`; checkout/create WO branch ([PICKUP.md](../PICKUP.md) §3a).
- [ ] **4. Auxiliary context** — Files on the item or in [Auxiliary context](#auxiliary-context-this-directory) below.
- [ ] **5. Persistence documentation** — Update project persistence doc (schema, paths, ownership); update [schema-notes.md](schema-notes.md) when schema changes.
- [ ] **6. Design** — Schema/migrations align with feature spec and domain data rules.
- [ ] **7. Implement** — Database, migrations, data access layer (not HTTP handlers). Never commit runtime data directories.
- [ ] **8. Tests (local)** — Data-layer tests when straightforward; else queue `unit-test`.
- [ ] **9. Verify** — `verify.check`; confirm DB under configured data dir per work item; `verify.test` when available ([PICKUP.md](../PICKUP.md) §3b). Fix failures [you caused](../test-strategy/BASE.md#who-fixes-failing-tests) or block and hand off.
- [ ] **10. Close out** — Item status, docs, git commit on WO branch.
- [ ] **11. Report** — Session summary; schema changes and which `api` items may unblock.

---

## Mission

All **Ready** items with **Work type:** `persistence`. Own persistence documentation and the DB access layer.

---

## Project docs (typical)

From project `BASE_AGENT.md` / `.agent-project.yaml`:

- Persistence / data model docs
- Domain data rules (paths, ownership, external files)
- `DECISIONS.md` for storage choices
- Server persistence code paths

---

## Auxiliary context (this directory)

| File | Purpose |
|------|---------|
| [schema-notes.md](schema-notes.md) | Tables, keys, invariants |
| `migrations.md` | Migration history and rules *(add when needed)* |

---

## Responsibilities

- Schema design and migrations
- Data access used by the API layer
- `DATA_DIR` and path conventions per project config

---

## Not this agent's job

| Work type | Agent folder |
|-----------|----------------|
| HTTP routes | `docs/agents/api/` |
| UI | `docs/agents/client/` |
| Copying user-owned files outside app scope | Human / domain-specific WO |

---

## Default verification

```bash
npm run check
```

Confirm migrations apply cleanly; never commit `data/` or local DB files.
