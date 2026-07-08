# Agent Contexts

Role-specific instructions live in **folders** under `docs/agents/`. Each folder has **`BASE.md`** (pickup workflow + per-item checklist) and optional auxiliary `.md` files.

See [AGENT_LAYOUT.md](AGENT_LAYOUT.md) and [PICKUP.md](PICKUP.md).

---

## Start here

| Step | File / skill |
|------|----------------|
| 1 | [BASE_AGENT.md](BASE_AGENT.md) — project doc map + process tiers |
| 2 | **Skill:** `lapviewer-feature` (design) or `lapviewer-pickup` (implement) |
| 3 | [PICKUP.md](PICKUP.md) — discover, filter, branch, close-out (authoritative) |
| 4 | [WORK_ORDERS.md](WORK_ORDERS.md) — work types, dispatch |
| 5 | `<agent>/BASE.md` — specialist checklist |
| 6 | [PROJECT_STATE.md](PROJECT_STATE.md) + generated snapshot — live git/verify facts |

**Skills** (`.cursor/skills/`): `lapviewer-feature`, `lapviewer-pickup`, `lapviewer-promote` — thin orchestrators; read the linked docs for full detail.

---

## Agent folders

| Work type | Folder | Workflow ready |
|-----------|--------|----------------|
| — | [BASE_AGENT.md](BASE_AGENT.md) | Coordinator |
| `docs` | [documentation/](documentation/) | ✅ |
| `architecture` | [architecture/](architecture/) | ✅ |
| `persistence` | [persistence/](persistence/) | ✅ |
| `api` | [api/](api/) | ✅ |
| `client` | [client/](client/) | ✅ |
| `test-strategy` | [test-strategy/](test-strategy/) | ✅ |
| `unit-test` | [unit-test/](unit-test/) | ✅ |
| `browser-qa` | [browser-qa/](browser-qa/) | ✅ |
| `review` | [review/](review/) | ✅ |
| `maintenance` | [maintenance/](maintenance/) | ✅ |
| `full-stack` | [implementation/](implementation/) | ✅ (exception) |

---

## Coordination docs

| Document | Purpose |
|----------|---------|
| [Work Orders](WORK_ORDERS.md) | Dispatch by work type |
| [Work Queue](WORK_QUEUE.md) | Global/tooling backlog |
| [Feature work orders](../work-orders/README.md) | Per-feature typed tasks |
| [Templates](TEMPLATES.md) | WO + agent folder formats |

**Client auxiliary:** [client/overview.md](client/overview.md), [client/page-flows.md](client/page-flows.md)

---

## Dispatch example (client)

```text
Use the lapviewer-pickup skill as the LapViewer Client Agent.
Process every Ready item with Work type `client`.
```

---

## Keeping the doc map current

When adding or renaming project docs, update:

1. `.agent-project.yaml` `paths`
2. [BASE_AGENT.md](BASE_AGENT.md) documentation map table
3. [DOCUMENTATION_SYSTEM.md](../DOCUMENTATION_SYSTEM.md) source-of-truth table
