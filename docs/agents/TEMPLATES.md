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
Read `docs/agents/BASE_AGENT.md`, `docs/agents/WORK_ORDERS.md`, and `docs/agents/PICKUP.md` first.

---

## Agent checklist (required)

- [ ] **1. Orient** — …
- [ ] **2. Work item** — read goal, AC, blockers, branch, docs to update
- [ ] **3. Start item** — In Progress + branch per [PICKUP.md](PICKUP.md) §3a
- [ ] **4. Auxiliary context** — files in this folder linked from the work item
- [ ] … through **11. Report** (session summary per PICKUP.md §4)

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

[PICKUP.md](../PICKUP.md) §1–2 — discover and filter `<work-type>`. Per-item loop §3.

---

## Responsibilities / Not this agent's job / Verification

…
```

Copy [client/BASE.md](../packs/default-web-app/agents/client/BASE.md) as the reference implementation.

---

## Feature work order

Create `docs/work-orders/WO-<name>.md` from [docs/work-orders/_TEMPLATE.md](../work-orders/_TEMPLATE.md).

Each task inside the work order uses the work item template below with a **Work type** field.

---

## Work item template

Add tasks to a **feature work order** (`docs/work-orders/`) or, for global tooling, to `docs/agents/WORK_QUEUE.md`.

```md
### <ID> - <Short title>

**Work type:** `persistence` | `api` | `client` | `test-strategy` | `unit-test` | `browser-qa` | `docs` | `architecture` | `review` | `maintenance` | `full-stack`  
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
- `BQ` - browser-qa
- `MAINT` - maintenance
- `GIT` - maintenance
- `CI` - maintenance

---

## Prompt template (single item)

```text
Act as the <ProjectName> <Role> Agent.
Read docs/agents/BASE_AGENT.md, docs/agents/<folder>/BASE.md, docs/agents/PICKUP.md.
Complete work item <ID> in docs/work-orders/WO-<name>.md (or WORK_QUEUE.md).
```

## Prompt template (all Ready work of one type)

```text
Act as the <ProjectName> <Role> Agent.
Read docs/agents/BASE_AGENT.md, docs/agents/<folder>/BASE.md, docs/agents/WORK_ORDERS.md, docs/agents/PICKUP.md.
Process every Ready item with Work type `<work-type>` per PICKUP.md.
```

See [WORK_ORDERS.md](WORK_ORDERS.md) for full dispatch text.
