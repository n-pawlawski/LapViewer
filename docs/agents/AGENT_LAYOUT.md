# Agent directory layout

Each specialized agent has a **folder** under `docs/agents/`. Agents always start from that folder's **`BASE.md`**, which includes a **required checklist**.

---

## Structure

```text
docs/agents/
  BASE_AGENT.md          # project-wide (read first for any agent)
  WORK_ORDERS.md
  WORK_QUEUE.md
  README.md
  TEMPLATES.md
  AGENT_LAYOUT.md        # this file

  client/                # Work type: client
    BASE.md              # entry point + checklist (required)
    README.md            # index of auxiliary docs
    overview.md          # optional deep context
    page-flows.md
    …                    # add more .md as needed

  api/                   # Work type: api
  persistence/           # Work type: persistence
  documentation/         # Work type: docs
  architecture/          # Work type: architecture
  unit-test/             # Work type: unit-test
  review/                # Work type: review
  maintenance/           # Work type: maintenance
  implementation/        # Work type: full-stack (exception)
  test-strategy/         # planning (often docs-only)
```

---

## Rules

1. **`BASE.md` is mandatory** — every agent folder has one; it ends with a numbered checklist agents must complete per work item.
2. **Auxiliary docs are optional** — add `.md` files for diagrams, schemas, route tables, etc.; link from work orders via **Auxiliary context**.
3. **Dispatch path** — `docs/agents/<folder>/BASE.md` (e.g. `docs/agents/client/BASE.md`).
4. **New agent** — copy `client/` or `api/` as a template; register in [README.md](README.md) and [WORK_ORDERS.md](WORK_ORDERS.md).

---

## Work order field

```md
**Auxiliary context:** `docs/agents/client/page-flows.md`, `docs/agents/client/overview.md`
```

Agents read these after the work item and before implementation (checklist step 3).
