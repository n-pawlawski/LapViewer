# API Agent — base context

**Work type:** `api`  
**Entry point:** always read this file first for server/API work.

Read before any work:

- Project `docs/agents/BASE_AGENT.md`
- [WORK_ORDERS.md](../WORK_ORDERS.md)
- [PICKUP.md](../PICKUP.md)
- [PROJECT_STATE.md](../PROJECT_STATE.md) if present

---

## Pickup workflow

When dispatched to process **all** Ready `api` work:

1. Follow [PICKUP.md](../PICKUP.md) §1–2.
2. For **each** eligible item, run the checklist below.
3. Follow [PICKUP.md](../PICKUP.md) §4 (session report).

Usually runs **after** `persistence` items on the same WO are `Done`.

---

## Agent checklist (required)

- [ ] **1. Orient** — Project `BASE_AGENT.md`, this file, `WORK_ORDERS.md`, `PICKUP.md`.
- [ ] **2. Work item** — Goal, acceptance criteria, **Blocked by**, **Docs to update**, WO git branch.
- [ ] **3. Start item** — `Status: In Progress`; checkout/create WO branch ([PICKUP.md](../PICKUP.md) §3a).
- [ ] **4. Auxiliary context** — Files on the item or in [Auxiliary context](#auxiliary-context-this-directory) below.
- [ ] **5. API documentation** — Update [routes.md](routes.md) for new routes and contracts when useful.
- [ ] **6. Design** — Request/response shapes match feature spec and architecture contracts; persistence layer exists or is stubbed per WO plan.
- [ ] **7. Implement** — Server routes, services, validation only (not DB schema — see `persistence/`).
- [ ] **8. Tests (local)** — Add/update server tests when straightforward; else queue `unit-test`.
- [ ] **9. Verify** — `verify.check`; exercise endpoints per work item; `verify.test` when available ([PICKUP.md](../PICKUP.md) §3b). Fix failures [you caused](../test-strategy/BASE.md#who-fixes-failing-tests) or block and hand off.
- [ ] **10. Close out** — Item status, docs, git commit on WO branch.
- [ ] **11. Report** — Session summary row; note contract changes for downstream `client` items.

---

## Mission

All **Ready** items with **Work type:** `api`. Own HTTP routes and server services (not SQLite schema).

---

## Project docs (typical)

From project `BASE_AGENT.md` / `.agent-project.yaml`:

- Architecture and persistence docs
- Domain data rules (if API exposes domain entities)
- Feature specs and WO acceptance criteria
- Server source tree (path in project `BASE_AGENT.md`)

---

## Auxiliary context (this directory)

| File | Purpose |
|------|---------|
| [routes.md](routes.md) | Route table, methods, auth |
| [validation.md](validation.md) | Shared validation rules *(create when needed)* |

---

## Responsibilities

- Express (or project server framework) routes and handlers
- Request validation, error responses, service layer
- Document API contracts before or with implementation

---

## Not this agent's job

| Work type | Agent folder |
|-----------|----------------|
| `persistence` | `docs/agents/persistence/` |
| `client` | `docs/agents/client/` |
| `docs` | `docs/agents/documentation/` |
| `unit-test` | `docs/agents/unit-test/` |

---

## Default verification

```bash
# from .agent-project.yaml verify.check
npm run check
```

Exercise endpoints manually or via tests per work item **Verification** section.
