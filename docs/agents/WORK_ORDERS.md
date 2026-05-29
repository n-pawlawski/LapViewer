# Work Orders and Typed Agents

How LapViewer breaks a feature into **layered work items** and runs **one agent per work type** until all Ready items of that type are complete.

Read with [Base Agent](BASE_AGENT.md), [Work Queue](WORK_QUEUE.md), and [Feature Lifecycle](../FEATURE_LIFECYCLE.md).

---

## Concepts

| Term | Meaning |
|------|---------|
| **Feature** | Product capability (documented in `FEATURES.md`, specs, UI docs) |
| **Work order** | A feature's implementation plan: typed tasks in `docs/work-orders/` |
| **Work type** | Layer/discipline tag on each task — which agent owns implementation |
| **Work queue** | Global backlog in `WORK_QUEUE.md` (tooling, hygiene) plus items inside work orders |

---

## End-to-end flow for feature X

```text
You describe X
  → Documentation design (feature spec, acceptance criteria)
  → You approve → feature Ready
  → Create work order WO-… with typed work items (persistence, api, client, …)
  → Mark items Ready by dependency order
  → Start one agent per work type (see dispatch prompts below)
  → Each agent completes all Ready items of its type
  → Review / browser QA / you verify
  → Feature Done
```

Documentation design happens **before** the work order is filled in. The work order is the **implementation breakdown**, not the product spec.

---

## Work types

Every implementable task must have exactly one **Work type**:

| Work type | Agent context | Owns |
|-----------|---------------|------|
| `docs` | [Documentation Designer](DOCUMENTATION_DESIGNER_AGENT.md) | Specs, AC, open questions — no product code |
| `architecture` | [Architecture Design](ARCHITECTURE_DESIGN_AGENT.md) | Module/API/data docs — no product code |
| `persistence` | [Persistence Agent](PERSISTENCE_AGENT.md) | SQLite schema, migrations, `DATA_DIR`, DB access layer |
| `api` | [API Agent](API_AGENT.md) | Express routes, server services, validation |
| `client` | [Client Agent](CLIENT_AGENT.md) | React UI, routing, client state, styling |
| `unit-test` | [Unit Test Agent](UNIT_TEST_AGENT.md) | Vitest tests for logic covered by the feature |
| `browser-qa` | Browser QA (future dedicated doc) | Manual/browser verification notes |
| `review` | [Review / Verification](REVIEW_VERIFICATION_AGENT.md) | Compare build vs acceptance criteria |
| `maintenance` | [Project Maintenance](PROJECT_MAINTENANCE_AGENT.md) | Git, CI, scripts, tooling |
| `full-stack` | [Implementation Agent](IMPLEMENTATION_AGENT.md) | **Exception only** — one agent touches all layers when items are too small to split |

**Default for new feature work:** split into `persistence` → `api` → `client` (and `unit-test` / `review` after), not `full-stack`.

---

## Where work lives

### Feature work orders — `docs/work-orders/`

One file per feature implementation pass:

- Name: `WO-<short-name>.md` (e.g. `WO-ui-shell.md`)
- Template: [work-orders/_TEMPLATE.md](../work-orders/_TEMPLATE.md)
- Contains **all typed tasks** for that feature

### Global queue — `docs/agents/WORK_QUEUE.md`

Use for:

- Cross-feature tooling (`GIT-*`, `MAINT-*`, `UT-001`)
- Hygiene and process tasks
- Optional mirror of a work-order item (same ID) when you want one list

Feature implementation should primarily use **work orders**.

---

## Work item fields (required)

Inside a work order (or `WORK_QUEUE.md`):

```md
**Work type:** `client`
**Status:** Draft | Ready | In Progress | Blocked | Done | Cancelled
**Priority:** P0 | P1 | P2 | P3
**Blocked by:** WO-ui-shell-01, WO-ui-shell-02   # optional; empty if none
```

Rules:

- Do not implement `Draft` items.
- Respect **Blocked by** — skip items until blockers are `Done`.
- Agent picks up every item matching its work type with `Status: Ready` and no unresolved blockers.

---

## Starting an agent (dispatch by work type)

Use this prompt pattern to run **all** Ready work of one type:

```text
Act as the LapViewer <WorkType> Agent.
Read docs/agents/BASE_AGENT.md first.
Read docs/agents/<WORKTYPE>_AGENT.md.
Read docs/agents/WORK_ORDERS.md.
Process every work item with Work type `<work-type>` and Status `Ready` in:
  - docs/work-orders/*.md
  - docs/agents/WORK_QUEUE.md
Order: P0 first, then P1; respect Blocked by; skip blocked items.
For each item: mark In Progress → implement → run verification → update docs → mark Done.
Use git per D-012 (feature branch per work order or per item as noted in the item).
Report a summary table of items processed and any new follow-up items created.
```

### Examples

**Client / frontend:**

```text
Act as the LapViewer Client Agent.
Read docs/agents/BASE_AGENT.md, docs/agents/CLIENT_AGENT.md, docs/agents/WORK_ORDERS.md.
Process every Ready item with Work type `client`. Branch: feature/ui-shell if working on WO-ui-shell.
```

**API / server:**

```text
Act as the LapViewer API Agent.
Read docs/agents/BASE_AGENT.md, docs/agents/API_AGENT.md, docs/agents/WORK_ORDERS.md.
Process every Ready item with Work type `api`.
```

**Persistence / database:**

```text
Act as the LapViewer Persistence Agent.
Read docs/agents/BASE_AGENT.md, docs/agents/PERSISTENCE_AGENT.md, docs/agents/WORK_ORDERS.md.
Process every Ready item with Work type `persistence`.
```

---

## Creating a work order (after docs are Ready)

1. Copy [docs/work-orders/_TEMPLATE.md](../work-orders/_TEMPLATE.md) → `docs/work-orders/WO-<name>.md`.
2. Link feature spec sections and acceptance criteria.
3. List tasks in **dependency order** (typical: `persistence` → `api` → `client` → `unit-test` → `review`).
4. Set first wave to `Ready`; leave downstream items `Draft` or `Ready` with `Blocked by` until upstream is done.
5. Start agents **by type** (persistence agent first, then api, then client, etc.).

---

## Coordinator (you or Base Agent)

You do not need a separate coordinator agent to start. Options:

| Approach | When |
|----------|------|
| **Sequential by type** | You run persistence → api → client prompts in order (simplest) |
| **Parallel types** | Only when items have no dependencies (rare) |
| **Single feature branch** | `feature/<work-order-slug>` — all types commit to same branch for one WO |

---

## Relationship to Implementation Agent

[Implementation Agent](IMPLEMENTATION_AGENT.md) remains for:

- Legacy `IMPL-*` queue items
- `Work type: full-stack` when splitting would be overhead
- Coordinating unclear scope (should split into typed items instead)

New features should use **typed work orders**, not generic IMPL items.

---

## Status and traceability

In the work order file, keep a **Feature status** line (`Draft` → `Done`) and a table of items.

When all items are `Done` and review passes, update:

- Work order status → `Done`
- Feature spec / `FEATURES.md` implementation status
- Post-implementation notes per [Feature Lifecycle](../FEATURE_LIFECYCLE.md)
