# Agent directory layout

Each specialized agent has a **folder** under `docs/agents/`. Agents always start from that folder's **`BASE.md`**, which includes a **required checklist** and **pickup workflow** pointing at [PICKUP.md](PICKUP.md).

All agent documentation lives in **this repo** — there is no external platform pack to sync ([D-031](../DECISIONS.md)).

---

## Structure

```text
docs/agents/
  BASE_AGENT.md          # project-wide (read first for any agent)
  PICKUP.md              # discover, filter, branch, close-out
  WORK_ORDERS.md
  WORK_QUEUE.md
  PROJECT_STATE.md       # test runner status, quick refs
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

  archive/               # Retired process docs kept for reference (not active workflow)

  <folder>/
    BASE.md              # entry point + checklist (required)
    README.md            # index of auxiliary docs
    …                    # optional deep context .md files
```

---

## Rules

1. **`BASE.md` is mandatory** — every agent folder has one; includes pickup workflow and per-item checklist.
2. **`PICKUP.md` is mandatory** at `docs/agents/` root — shared mechanics for all agents.
3. **Auxiliary docs are optional** — add `.md` files in the agent folder as needed; link from work orders via **Auxiliary context**.
4. **Dispatch path** — `docs/agents/<folder>/BASE.md` (e.g. `docs/agents/client/BASE.md`).
5. **New agent** — copy `client/` as reference; register work type in [WORK_ORDERS.md](WORK_ORDERS.md).

---

## Work order field

```md
**Auxiliary context:** `docs/agents/client/page-flows.md`, `docs/agents/client/overview.md`
```

Agents read these in checklist step 4 (after starting the item).

---

## LapViewer auxiliary docs (examples)

| File | Work types |
|------|------------|
| [client/overview.md](client/overview.md) | `client` |
| [client/page-flows.md](client/page-flows.md) | `client`, `browser-qa` |
| [api/routes.md](api/routes.md) | `api` |
| [persistence/schema-notes.md](persistence/schema-notes.md) | `persistence` |
| [test-strategy/fixtures-policy.md](test-strategy/fixtures-policy.md) | `test-strategy`, `unit-test` |
| [unit-test/runner-setup.md](unit-test/runner-setup.md) | `unit-test`, `maintenance` |

Add new auxiliary docs in place when a work order needs deeper context — do not maintain separate template copies.
