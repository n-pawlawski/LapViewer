# Work Orders and Typed Agents

How a project breaks a feature into **layered work items** and runs **one agent per work type** until all Ready items of that type are complete.

Read with [Base Agent](BASE_AGENT.md), [Pickup](PICKUP.md), [Work Queue](WORK_QUEUE.md), and [Feature Lifecycle](../FEATURE_LIFECYCLE.md).

---

## Concepts


| Term           | Meaning                                                                            |
| -------------- | ---------------------------------------------------------------------------------- |
| **Feature**    | Product capability (documented in `FEATURES.md`, specs, UI docs)                   |
| **Work order** | A feature's implementation plan: typed tasks in `docs/work-orders/`                |
| **Work type**  | Layer/discipline tag on each task — which agent owns implementation                |
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


| Work type      | Agent context                                             | Owns                                                                                |
| -------------- | --------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `docs`         | [documentation/BASE.md](documentation/BASE.md)     | Specs, AC, open questions — no product code                            |
| `architecture` | [architecture/BASE.md](architecture/BASE.md)       | Structure, frameworks, integrations, contracts, CI/Docker design — not feature UI |
| `persistence`  | [persistence/BASE.md](persistence/BASE.md)         | SQLite schema, migrations, `DATA_DIR`, DB access layer                 |
| `api`          | [api/BASE.md](api/BASE.md)                         | Express routes, server services, validation                            |
| `client`       | [client/BASE.md](client/BASE.md)                   | React UI, routing, client state, styling                               |
| `test-strategy` | [test-strategy/BASE.md](test-strategy/BASE.md)   | Verification plan; post-WO diff review; queue new tests               |
| `unit-test`    | [unit-test/BASE.md](unit-test/BASE.md)             | Implement tests queued by test-strategy or implementers              |
| `browser-qa`   | [browser-qa/BASE.md](browser-qa/BASE.md)           | Browser and interactive UI verification                              |
| `review`       | [review/BASE.md](review/BASE.md)                   | Compare build vs acceptance criteria                                   |
| `maintenance`  | [maintenance/BASE.md](maintenance/BASE.md)         | Git, CI, scripts, tooling                                              |
| `full-stack`   | [implementation/BASE.md](implementation/BASE.md)   | **Exception only** — all layers when items are too small to split      |


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

- Cross-feature tooling (`GIT-`*, `MAINT-*`, `UT-001`)
- Hygiene and process tasks
- Optional mirror of a work-order item (same ID) when you want one list

Feature implementation should primarily use **work orders**.

**Parallel runs (archived):** Multi-agent wave scheduling is preserved in [archive/MULTIAGENT_DISPATCH_4C.md](archive/MULTIAGENT_DISPATCH_4C.md) for reference. It is **not** the default LapViewer workflow — see **Process tiers** in [BASE_AGENT.md](BASE_AGENT.md).

---

## Work item fields (required)

Inside a work order (or `WORK_QUEUE.md`):

```md
**Work type:** `client`
**Status:** Draft | Ready | In Progress | Blocked | Done | Cancelled
**Priority:** P0 | P1 | P2 | P3
**Blocked by:** WO-ui-shell-01, WO-ui-shell-02   # optional; empty if none
**Auxiliary context:** `docs/agents/client/page-flows.md`   # optional; agent reads in checklist step 3
```

Rules:

- Do not implement `Draft` items.
- Respect **Blocked by** — skip items until blockers are `Done`.
- Agent picks up every item matching its work type with `Status: Ready` and no unresolved blockers.

---

## Starting an agent (dispatch by work type)

Use this prompt pattern to run **all** Ready work of one type:

```text
Act as the <ProjectName> <WorkType> Agent.
Read docs/agents/BASE_AGENT.md first.
Read docs/agents/<folder>/BASE.md (see [AGENT_LAYOUT.md](AGENT_LAYOUT.md)).
Read docs/agents/WORK_ORDERS.md and docs/agents/PICKUP.md.
Process every work item with Work type `<work-type>` and Status `Ready` per PICKUP.md.
Report a session summary per PICKUP.md §4.
```

### Examples

**Client / frontend:**

```text
Act as the <ProjectName> Client Agent.
Read docs/agents/BASE_AGENT.md, docs/agents/client/BASE.md, docs/agents/WORK_ORDERS.md, docs/agents/PICKUP.md.
Process every Ready item with Work type `client`.
```

**API / server:**

```text
Act as the <ProjectName> API Agent.
Read docs/agents/BASE_AGENT.md, docs/agents/api/BASE.md, docs/agents/WORK_ORDERS.md, docs/agents/PICKUP.md.
Process every Ready item with Work type `api`.
```

**Persistence / database:**

```text
Act as the <ProjectName> Persistence Agent.
Read docs/agents/BASE_AGENT.md, docs/agents/persistence/BASE.md, docs/agents/WORK_ORDERS.md, docs/agents/PICKUP.md.
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


| Approach                  | When                                                                     |
| ------------------------- | ------------------------------------------------------------------------ |
| **Sequential by type**    | You run persistence → api → client prompts in order (simplest)           |
| **Parallel types**        | Only when items have no dependencies (rare)                              |
| **Single feature branch** | `feature/<work-order-slug>` — all types commit to same branch for one WO |


---

## Relationship to Implementation Agent

[implementation/BASE.md](implementation/BASE.md) remains for:

- Legacy `IMPL-`* queue items
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

