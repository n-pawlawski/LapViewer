# Agent Contexts

This folder contains role-specific instructions for agents working on LapViewer.

Use these docs when you want an agent to temporarily "act as" a specialized project role. The agent should read the relevant context file first, then read the shared work queue, then perform only the work assigned to that role.

---

## Folder contents

| Document | Purpose |
|----------|---------|
| [Base Agent](BASE_AGENT.md) | Default project orientation for any agent before choosing a specialty |
| [Work Orders](WORK_ORDERS.md) | **Typed work items**, dispatch-by-work-type, feature work order flow |
| [Work Queue](WORK_QUEUE.md) | Global/tooling work items |
| [Feature work orders](../work-orders/README.md) | Per-feature implementation plans (`WO-*.md`) |
| [Documentation Designer Agent](DOCUMENTATION_DESIGNER_AGENT.md) | Work type `docs` |
| [Architecture Design Agent](ARCHITECTURE_DESIGN_AGENT.md) | Work type `architecture` |
| [Persistence Agent](PERSISTENCE_AGENT.md) | Work type `persistence` — database, SQLite, `DATA_DIR` |
| [API Agent](API_AGENT.md) | Work type `api` — Express, server services |
| [Client Agent](CLIENT_AGENT.md) | Work type `client` — React, UI, routing |
| [Test Strategy Agent](TEST_STRATEGY_AGENT.md) | Verification planning |
| [Unit Test Agent](UNIT_TEST_AGENT.md) | Work type `unit-test` |
| [Implementation Agent](IMPLEMENTATION_AGENT.md) | Work type `full-stack` — use only when not splitting layers |
| [Review / Verification Agent](REVIEW_VERIFICATION_AGENT.md) | Work type `review` |
| [Project Maintenance Agent](PROJECT_MAINTENANCE_AGENT.md) | Work type `maintenance` |
| [Templates](TEMPLATES.md) | Work order and work item formats |

---

## How to use an agent context

Use a prompt shaped like this:

```text
Act as the Base Agent for LapViewer.
Read docs/agents/BASE_AGENT.md first.
Choose the right specialized context for this task.
```

**Dispatch by work type** (process all Ready items of that type):

```text
Act as the LapViewer Client Agent.
Read docs/agents/BASE_AGENT.md, docs/agents/CLIENT_AGENT.md, docs/agents/WORK_ORDERS.md.
Process every Ready item with Work type `client` in docs/work-orders/ and WORK_QUEUE.md.
```

Replace `Client` / `client` with Persistence, API, Unit Test, etc. See [WORK_ORDERS.md](WORK_ORDERS.md).

---

## Agent operating rules

- Read the role context before touching code.
- Read the assigned work item before deciding what to do.
- Keep the implementation scoped to the work item.
- Update the work item status when done or blocked.
- Add newly discovered questions to the work item or `docs/OPEN_QUESTIONS.md`.
- Do not claim a task is complete unless its verification steps were run or explicitly skipped with a reason.

---

## Status values

Use these status labels in `WORK_QUEUE.md`:

- `Draft` - still being shaped; do not implement.
- `Ready` - agent may perform the work.
- `In Progress` - agent is currently working on it.
- `Blocked` - needs user input or another prerequisite.
- `Done` - completed and verified.
- `Cancelled` - no longer needed.

---

## Adding a new agent type

When adding a new role:

1. Create `docs/agents/<ROLE>_AGENT.md`.
2. Use the context template in [Templates](TEMPLATES.md).
3. Add the new context doc to this README.
4. Add one or more work items to [Work Queue](WORK_QUEUE.md).

Prefer small, role-specific contexts over one giant agent manual.
