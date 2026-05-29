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

## Work item template

Add new work items to `docs/agents/WORK_QUEUE.md`.

```md
### <ID> - <Short title>

**Role:** <Agent role>  
**Status:** Draft | Ready | In Progress | Blocked | Done | Cancelled  
**Priority:** P0 | P1 | P2 | P3  
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

Use short prefixes by role:

- `UT` - Unit Test Agent
- `DOC` - Documentation Designer
- `ARCH` - Architecture Design Agent
- `TEST` - Test Strategy Agent
- `IMPL` - Implementation Agent
- `QA` - Browser QA Agent
- `REV` - Review / Verification Agent
- `MAINT` - Maintenance Agent
- `GIT` - Git / branch workflow setup
- `CI` - CI setup

---

## Prompt template

```text
Act as the Base Agent for LapViewer.
Read docs/agents/BASE_AGENT.md first.
Then act as the <Role> Agent for LapViewer.
Read docs/agents/<ROLE>_AGENT.md first.
Then read docs/agents/WORK_QUEUE.md.
Complete work item <ID>.
Keep changes scoped to that work item.
Update the work item status and verification notes when finished.
```
