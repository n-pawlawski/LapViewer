# Agent Templates

Reusable formats for adding new agent contexts and work items.

---

## Agent context template

Create a new file at `docs/agents/<ROLE>_AGENT.md`.

```md
# <Role> Agent

Role context for agents acting as <role> in LapViewer.

Before using this specialized context, agents should read `docs/agents/BASE_AGENT.md`.

---

## Mission

What this agent protects or produces.

---

## Read first

Before working, read:

1. `docs/agents/BASE_AGENT.md`
2. `docs/agents/WORK_QUEUE.md`
3. Relevant project docs
4. Relevant implementation files

---

## Current project state

What this role needs to know about the repo today.

---

## Responsibilities

- ...
- ...

---

## Not this agent's job

- ...
- ...

---

## Expected workflow

1. Read this context.
2. Read the work queue.
3. Select or confirm the assigned work item.
4. Mark the item `In Progress`.
5. Perform the scoped work.
6. Run relevant verification.
7. Update the work item.
8. Report results.

---

## Completion standard

The work is done when:

- ...
- ...

---

## Do not do without approval

- ...
- ...
```

---

## Feature work order

Create `docs/work-orders/WO-<name>.md` from [docs/work-orders/_TEMPLATE.md](../work-orders/_TEMPLATE.md).

Each task inside the work order uses the work item template below with a **Work type** field.

---

## Work item template

Add tasks to a **feature work order** (`docs/work-orders/`) or, for global tooling, to `docs/agents/WORK_QUEUE.md`.

```md
### <ID> - <Short title>

**Work type:** `persistence` | `api` | `client` | `unit-test` | `docs` | `architecture` | `review` | `maintenance` | `full-stack`  
**Status:** Draft | Ready | In Progress | Blocked | Done | Cancelled  
**Priority:** P0 | P1 | P2 | P3  
**Blocked by:** <IDs or —>  
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
Read docs/agents/BASE_AGENT.md and docs/agents/<ROLE>_AGENT.md.
Complete work item <ID> in docs/work-orders/WO-<name>.md (or WORK_QUEUE.md).
```

## Prompt template (all Ready work of one type)

```text
Act as the LapViewer <Role> Agent.
Read docs/agents/BASE_AGENT.md, docs/agents/<ROLE>_AGENT.md, docs/agents/WORK_ORDERS.md.
Process every Ready item with Work type `<work-type>` in docs/work-orders/ and WORK_QUEUE.md.
Respect Blocked by; P0 before P1; update statuses and docs when finished.
```

See [WORK_ORDERS.md](WORK_ORDERS.md) for full dispatch text.
