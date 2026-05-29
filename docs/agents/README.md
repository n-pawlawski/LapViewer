# Agent Contexts

This folder contains role-specific instructions for agents working on LapViewer.

Use these docs when you want an agent to temporarily "act as" a specialized project role. The agent should read the relevant context file first, then read the shared work queue, then perform only the work assigned to that role.

---

## Folder contents

| Document | Purpose |
|----------|---------|
| [Base Agent](BASE_AGENT.md) | Default project orientation for any agent before choosing a specialty |
| [Documentation Designer Agent](DOCUMENTATION_DESIGNER_AGENT.md) | How to design and maintain source-of-truth project documentation |
| [Architecture Design Agent](ARCHITECTURE_DESIGN_AGENT.md) | How to document architecture, boundaries, data ownership, and communication paths |
| [Test Strategy Agent](TEST_STRATEGY_AGENT.md) | How to design the overall verification strategy across test layers |
| [Implementation Agent](IMPLEMENTATION_AGENT.md) | How to implement documented features, verify work, sync docs, and hand off tests |
| [Review / Verification Agent](REVIEW_VERIFICATION_AGENT.md) | How to compare implementation against docs and report gaps |
| [Project Maintenance Agent](PROJECT_MAINTENANCE_AGENT.md) | How to maintain git, scripts, CI, dependency hygiene, and project tooling |
| [Unit Test Agent](UNIT_TEST_AGENT.md) | How to design, write, and run unit tests for this project |
| [Work Queue](WORK_QUEUE.md) | Role-specific work items that agents can pick up |
| [Templates](TEMPLATES.md) | Standard formats for new agent contexts and work items |

---

## How to use an agent context

Use a prompt shaped like this:

```text
Act as the Base Agent for LapViewer.
Read docs/agents/BASE_AGENT.md first.
Choose the right specialized context for this task.
```

Then, for role-specific work:

```text
Act as the Documentation Designer Agent for LapViewer.
Read docs/agents/BASE_AGENT.md first.
Then read docs/agents/DOCUMENTATION_DESIGNER_AGENT.md.
Then read docs/agents/WORK_QUEUE.md.
Find the highest-priority open work item assigned to Documentation Designer.
Do that work only, update the work item status, run relevant checks, and report results.
```

For a specific task:

```text
Act as the Implementation Agent for LapViewer.
Read docs/agents/BASE_AGENT.md.
Then read docs/agents/IMPLEMENTATION_AGENT.md.
Then complete the assigned Ready work item from docs/agents/WORK_QUEUE.md.
Keep changes scoped to that task.
```

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
