# Agent directory layout

Each specialized agent has a **folder** under `docs/agents/`. Agents always start from that folder's **`BASE.md`**, which includes a **required checklist** and **pickup workflow** pointing at [PICKUP.md](PICKUP.md).

---

## Structure

```text
docs/agents/
  BASE_AGENT.md          # project-wide (read first for any agent)
  PICKUP.md              # discover, filter, branch, close-out (from platform core/)
  WORK_ORDERS.md
  WORK_QUEUE.md
  PROJECT_STATE.md       # optional; copy from PROJECT_STATE.template.md
  README.md
  TEMPLATES.md
  AGENT_LAYOUT.md        # this file

  documentation/         # Work type: docs
  architecture/          # Work type: architecture
  test-strategy/         # Work type: test-strategy
  persistence/           # Work type: persistence
  api/                   # Work type: api
  client/                # Work type: client
  unit-test/             # Work type: unit-test
  browser-qa/            # Work type: browser-qa
  review/                # Work type: review
  maintenance/           # Work type: maintenance
  implementation/        # Work type: full-stack (exception)

  <folder>/
    BASE.md              # entry point + checklist (required)
    README.md            # index of auxiliary docs
    *.template.md        # copy to *.md in project when adopting
    …                    # optional deep context .md files
```

---

## Rules

1. **`BASE.md` is mandatory** — every agent folder has one; includes pickup workflow and per-item checklist.
2. **`PICKUP.md` is mandatory** at agent workspace root — shared mechanics for all agents.
3. **Auxiliary docs are optional** — copy from `*.template.md` in each folder; link from work orders via **Auxiliary context**.
4. **Dispatch path** — `docs/agents/<folder>/BASE.md` (e.g. `docs/agents/client/BASE.md`).
5. **New agent** — copy `client/` as reference; register in `WORK_ORDERS.md` and `pack.yaml` work_types.

---

## Work order field

```md
**Auxiliary context:** `docs/agents/client/page-flows.md`, `docs/agents/client/overview.md`
```

Agents read these in checklist step 4 (after starting the item).

---

## Adoption templates

| Template | Copy to |
|----------|---------|
| `client/overview.template.md` | `client/overview.md` |
| `client/page-flows.template.md` | `client/page-flows.md` |
| `api/routes.template.md` | `api/routes.md` |
| `persistence/schema-notes.template.md` | `persistence/schema-notes.md` |
| `PROJECT_STATE.template.md` | `PROJECT_STATE.md` |
| `templates/WORK_QUEUE.template.md` | `WORK_QUEUE.md` |

See [pack README](../packs/default-web-app/README.md) for full copy commands.
