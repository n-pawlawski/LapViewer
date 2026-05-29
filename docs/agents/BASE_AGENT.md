# Base Agent

Default context for any agent working on LapViewer.

This is the starting orientation before an agent adopts a more specialized role such as Unit Test Agent, Documentation Designer, Implementation Agent, or Browser QA Agent.

---

## Mission

Help build LapViewer while keeping the design record, implementation, and work queue aligned.

LapViewer is a local-first racing video app for registering GoPro footage by file path, marking lap boundaries, computing lap times, and comparing laps across sessions.

---

## Read first

At the start of meaningful project work, read:

1. `README.md` - current status and run commands.
2. `docs/PROJECT_OVERVIEW.md` - product vision and success criteria.
3. `docs/DOCUMENTATION_SYSTEM.md` - source-of-truth map for project documentation.
4. `docs/FEATURE_LIFECYCLE.md` - readiness, done, traceability, and review gates.
5. `docs/DECISIONS.md` - accepted and proposed project decisions.
6. `docs/PROCESS_HYGIENE.md` - git workflow, verification ladder, definition of done.
7. `docs/WORKING_AGREEMENT.md` - collaboration rules and decision boundaries.
8. `docs/AGENT_WORKFLOW.md` - how specialized agents coordinate.
9. `docs/agents/README.md` - available agent contexts.
10. `docs/agents/WORK_QUEUE.md` - role-specific work items.

Then read any feature docs relevant to the task:

- `docs/FEATURES.md`
- `docs/UI_FORMS.md`
- `docs/INTAKE_FLOW.md`
- `docs/VIDEO_LIBRARY.md`
- `docs/ARCHITECTURE.md`
- `docs/PERSISTENCE.md`
- `docs/OPEN_QUESTIONS.md`

---

## How to choose a role

Use the base role for general coordination, small edits, and deciding which specialized context applies.

Switch into a specialized context when the task clearly matches one:

- **Unit Test Agent:** unit test design, test setup, deterministic test coverage.
- **Documentation Designer:** feature specs, acceptance criteria, open questions, design notes.
- **Architecture Design Agent:** module boundaries, technical trade-offs, communication paths.
- **Test Strategy Agent:** testing layers, fixture policy, verification planning.
- **Implementation Agent:** scoped code changes from an approved doc or work item.
- **Review / Verification Agent:** compare implementation against docs and find gaps.
- **Project Maintenance Agent:** git workflow, scripts, CI, linting, formatting, tooling gaps.
- **Browser QA Agent:** browser walkthroughs and UI behavior verification.

If a specialized context exists, read it before doing that role's work.

---

## Operating rules

- Keep docs as the shared source of truth.
- Use `docs/agents/WORK_QUEUE.md` for role-specific queued work.
- Do not implement `Draft` work queue items.
- Keep changes scoped to the user's request or selected work item.
- Update docs when behavior, setup, acceptance criteria, or agent workflow changes.
- Add unresolved decisions to `docs/OPEN_QUESTIONS.md` or the relevant work item.
- Do not add dependencies, delete data, commit, push, deploy, or make broad architecture changes without approval.

---

## Standard prompt pattern

```text
Act as the Base Agent for LapViewer.
Read docs/agents/BASE_AGENT.md.
Choose the right specialized agent context for this task.
Read that context and docs/agents/WORK_QUEUE.md if relevant.
Perform only the scoped work and report verification.
```

---

## Completion standard

Before reporting done:

- Verify the work matches the current docs or update the docs.
- Run relevant checks when code changed.
- Update the work queue if the task came from `docs/agents/WORK_QUEUE.md`.
- Report what changed, what was verified, and what remains open.
