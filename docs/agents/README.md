# Agent Contexts

Role-specific instructions live in **folders** under `docs/agents/`. Each folder has **`BASE.md`** (required checklist + mission) and optional auxiliary `.md` files.

See [AGENT_LAYOUT.md](AGENT_LAYOUT.md) for structure rules.

---

## Start here

| Step | File |
|------|------|
| 1 | [BASE_AGENT.md](BASE_AGENT.md) — every agent |
| 2 | [WORK_ORDERS.md](WORK_ORDERS.md) — typed work, dispatch prompts |
| 3 | `<agent>/BASE.md` — specialist checklist |

---

## Agent folders

| Work type | Folder | Entry |
|-----------|--------|--------|
| — | (global) | [BASE_AGENT.md](BASE_AGENT.md) |
| `docs` | [documentation/](documentation/) | [BASE.md](documentation/BASE.md) |
| `architecture` | [architecture/](architecture/) | [BASE.md](architecture/BASE.md) |
| `persistence` | [persistence/](persistence/) | [BASE.md](persistence/BASE.md) |
| `api` | [api/](api/) | [BASE.md](api/BASE.md) |
| `client` | [client/](client/) | [BASE.md](client/BASE.md) |
| `unit-test` | [unit-test/](unit-test/) | [BASE.md](unit-test/BASE.md) |
| `review` | [review/](review/) | [BASE.md](review/BASE.md) |
| `maintenance` | [maintenance/](maintenance/) | [BASE.md](maintenance/BASE.md) |
| `full-stack` | [implementation/](implementation/) | [BASE.md](implementation/BASE.md) |
| (planning) | [test-strategy/](test-strategy/) | [BASE.md](test-strategy/BASE.md) |

**Client auxiliary docs (example):** [client/overview.md](client/overview.md), [client/page-flows.md](client/page-flows.md)

---

## Coordination docs

| Document | Purpose |
|----------|---------|
| [Work Orders](WORK_ORDERS.md) | Dispatch by work type |
| [Work Queue](WORK_QUEUE.md) | Global/tooling backlog |
| [Feature work orders](../work-orders/README.md) | Per-feature typed tasks |
| [Templates](TEMPLATES.md) | WO + agent folder formats |

---

## Dispatch example (client)

```text
Act as the LapViewer Client Agent.
Read docs/agents/BASE_AGENT.md, docs/agents/client/BASE.md, docs/agents/WORK_ORDERS.md.
Process every Ready item with Work type `client` in docs/work-orders/ and WORK_QUEUE.md.
```

---

## Adding a new agent folder

1. Create `docs/agents/<folder>/BASE.md` with **Agent checklist (required)**.
2. Add `README.md` listing auxiliary docs.
3. Register in [WORK_ORDERS.md](WORK_ORDERS.md) work types table.
4. Use [TEMPLATES.md](TEMPLATES.md) agent folder template.
