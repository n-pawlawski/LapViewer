# Agent Templates

Reusable formats for adding new agent contexts and work items.

---

## Agent folder template

Create `docs/agents/<folder>/` per [AGENT_LAYOUT.md](AGENT_LAYOUT.md).

**Required:** `BASE.md` with **Agent checklist (required)** as the first operational section after the header.

**Optional:** `README.md` (index), `overview.md`, flow diagrams, schemas, etc.

```md
# <Role> Agent — base context

**Work type:** `<work-type>`
Read `docs/agents/BASE_AGENT.md` and `docs/agents/WORK_ORDERS.md` first.

---

## Agent checklist (required)

- [ ] **1. Orient** — …
- [ ] **2. Work order** — …
- [ ] **3. Auxiliary context** — files in this folder linked from the work item
- [ ] … through **10. Report**

---

## Mission

…

---

## Auxiliary context (this directory)

| File | Purpose |
|------|---------|
| [overview.md](overview.md) | … |

---

## Pickup workflow

[WORK_ORDERS.md](../WORK_ORDERS.md) — filter `<work-type>`.

---

## Responsibilities / Not this agent's job / Verification

…
```

Copy [client/BASE.md](client/BASE.md) as the reference implementation.

---

## Feature work order

Create `docs/work-orders/WO-<name>.md` from [docs/work-orders/_TEMPLATE.md](../work-orders/_TEMPLATE.md).

Each task inside the work order uses the work item template below with a **Work type** field.

---

## Work item template

Add tasks to a **feature work order** (`docs/work-orders/`) or, for global tooling, to `docs/agents/WORK_QUEUE.md`.

```md
### <ID> - <Short title>

**Work type:** `persistence` | `api` | `client` | `test-strategy` | `unit-test` | `docs` | `architecture` | `review` | `maintenance` | `full-stack`  
**Status:** Draft | Ready | In Progress | Blocked | Done | Cancelled  
**Priority:** P0 | P1 | P2 | P3  
**Blocked by:** <IDs or —>  
**Auxiliary context:** `docs/agents/<folder>/….md` (optional)  
**Source docs:** `<doc>`, `<doc>`  

**Goal:** One or two sentences describing the outcome.

**Context:** Existing behavior, decisions, or constraints the agent needs.

**Work to perform when ready:**

- ...
- ...

**Acceptance criteria:**

- ...
- ...

**Verification:**

- ...
- ...

**Notes / open questions:**

- ...
```

---

## ID prefixes

**Feature work orders:** `WO-<feature>` with items `WO-<feature>-01`, `WO-<feature>-02`, …

**Global queue:**

- `UT` - unit-test
- `DOC` - docs
- `ARCH` - architecture
- `TEST` - test strategy
- `IMPL` - full-stack (legacy; prefer typed WO items)
- `REV` - review
- `MAINT` - maintenance
- `GIT` - maintenance
- `CI` - maintenance

---

## Prompt template (single item)

```text
Act as the LapViewer <Role> Agent.
Read docs/agents/BASE_AGENT.md and docs/agents/<folder>/BASE.md.
Complete work item <ID> in docs/work-orders/WO-<name>.md (or WORK_QUEUE.md).
```

## Prompt template (all Ready work of one type)

```text
Act as the LapViewer <Role> Agent.
Read docs/agents/BASE_AGENT.md, docs/agents/<folder>/BASE.md, docs/agents/WORK_ORDERS.md.
Process every Ready item with Work type `<work-type>` in docs/work-orders/ and WORK_QUEUE.md.
Respect Blocked by; P0 before P1; update statuses and docs when finished.
```

See [WORK_ORDERS.md](WORK_ORDERS.md) for full dispatch text.
