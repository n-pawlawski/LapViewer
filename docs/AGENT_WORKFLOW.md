# Agent Workflow

How LapViewer can use multiple agents over time while keeping product decisions, implementation, and documentation aligned.

This document extends the [Working Agreement](WORKING_AGREEMENT.md). It is intentionally lightweight: the goal is to create a repeatable collaboration pattern, not a rigid process that slows down small changes.

---

## Why use multiple agents

Different project tasks need different attention:

- **Design documentation** needs to preserve intent, open questions, acceptance criteria, and trade-offs.
- **Implementation** needs to modify code, run checks, and keep diffs focused.
- **Review and verification** need to compare the result against the documented behavior.
- **Future automation** may watch CI, maintain docs, test workflows, or prepare release notes.

The main rule: agents can specialize, but the repo docs remain the shared source of truth.

---

## Core agent roles

| Agent | Primary responsibility | Writes to | Should not own |
|-------|------------------------|-----------|----------------|
| **Documentation designer** | Turn goals, chat decisions, and design trade-offs into clear feature docs and acceptance criteria | `docs/`, especially feature specs, open questions, and decision notes | Final product decisions |
| **Architecture design agent** | Document architecture, module boundaries, data ownership, and communication paths | Architecture, technical approach, API/data docs | Unapproved stack changes |
| **Test strategy agent** | Design verification layers and route test work to the right agent | Testing strategy docs and test-related work items | Adding test dependencies without approval |
| **Implementation agent** | Build the approved behavior in code, run local verification, and update docs when behavior changes | `client/`, `server/`, config, focused doc updates | Rewriting product scope without approval |
| **Review / verification agent** | Check implementation against acceptance criteria, find regressions, suggest missing tests | Review notes, issue lists, test findings | Large unrelated refactors |
| **Project maintenance agent** | Later: monitor CI, dependency updates, release notes, recurring checks | Maintenance docs, changelogs, small fixes | Product direction |

For now, the first two roles are enough:

1. A documentation designer clarifies what should exist.
2. An implementation agent builds against that documented target.

---

## How you interact with this

You can interact with the workflow at different levels of formality.

### Simple feature request

Use this when the feature is small or obvious:

> Add keyboard shortcuts for play/pause and marker placement.

The agent can read the relevant docs, make the code change, update docs if behavior changes, and report verification steps.

### Documentation-first request

Use this when the feature is still being shaped:

> Do a documentation-design pass for session import. Capture the user flow, acceptance criteria, non-goals, and open questions. Do not implement yet.

The output should be changes to `docs/`, usually `FEATURES.md`, `UI_FORMS.md`, `OPEN_QUESTIONS.md`, or a focused feature spec.

### Implementation-from-docs request

Use this when the docs are ready enough to build:

> Implement the session import flow from the docs. Start with the acceptance criteria in `docs/FEATURES.md` and `docs/INTAKE_FLOW.md`.

The implementation agent should treat those docs as the task brief.

### Review request

Use this when code exists and you want a gap check:

> Review the current implementation against the documented acceptance criteria for lap markers.

The review agent should read [`agents/REVIEW_VERIFICATION_AGENT.md`](agents/REVIEW_VERIFICATION_AGENT.md) and lead with bugs, missing behavior, mismatches with the docs, and missing verification.

---

## How agents perform work

Agents perform work by receiving a scoped prompt plus repo context. The better the prompt names the role and source docs, the less coordination is needed.

Role-specific context lives in [`agents/`](agents/README.md). Start with [`agents/BASE_AGENT.md`](agents/BASE_AGENT.md), then use the specialized context that matches the task.

Good prompts include:

- **Role:** documentation designer, implementation agent, reviewer, browser QA, etc.
- **Source of truth:** the docs or files to read first.
- **Allowed work:** design only, code changes allowed, review only, browser testing, etc.
- **Stopping point:** ask before implementation, stop after checklist, run tests, open questions only.

Example:

```text
Act as the Unit Test Agent for LapViewer.
Read docs/agents/BASE_AGENT.md first.
Then read docs/agents/UNIT_TEST_AGENT.md.
Then read docs/agents/WORK_QUEUE.md.
Complete work item UT-001.
Keep changes scoped to that work item.
```

Example:

```text
Act as the documentation designer for LapViewer.
Read docs/FEATURES.md, docs/UI_FORMS.md, and docs/OPEN_QUESTIONS.md.
Design the documentation for marker editing. Update docs only.
Capture acceptance criteria, non-goals, and open questions. Do not implement.
```

---

## Docs-driven implementation watcher

It is possible to create a lightweight workflow where an agent checks for documentation changes and then works through implementation.

Recommended behavior:

1. Watch for changes under `docs/`.
2. Summarize what changed.
3. Identify whether the change creates implementation work.
4. Produce an implementation checklist.
5. Ask for approval before coding unless you have explicitly allowed auto-implementation.
6. After implementation, update docs if the final behavior differs from the spec.

This avoids a dangerous pattern where any documentation edit silently triggers code changes.

### Safe default mode

The safest default is:

> Watch docs for changes. When docs change, summarize the implementation impact and propose a checklist. Do not modify code until I approve.

### Auto-implementation mode

Auto-implementation can be useful later, but should be limited to small, clearly scoped tasks:

> Watch docs for changes. If a changed doc contains an approved checklist marked `Ready for implementation`, implement the checklist, run checks, and report results.

Use auto-implementation only when the docs include clear acceptance criteria and non-goals.

### Suggested trigger marker

For future automation, use an explicit marker in docs so the implementation agent knows what is ready:

```md
## Implementation Status

Status: Ready for implementation
Owner: Implementation agent

Checklist:
- [ ] ...
- [ ] ...
```

The watcher should ignore draft docs unless they are marked ready.

---

## Agent control UI

Yes, LapViewer can eventually have a local UI for starting and stopping automation.

The practical shape is:

```text
Agent Control page
  -> POST /api/agents/watchers/docs/start
  -> Node backend starts a docs watcher
  -> Watcher detects changed docs
  -> Backend creates an implementation task
  -> Optional Cursor SDK runner starts an agent
  -> UI shows status, logs, and approval prompts
```

### Suggested first version

Start with a safe local control panel:

- **Start watching docs** button
- **Stop watching docs** button
- Current watcher status
- Recent changed files under `docs/`
- Generated implementation checklist
- Approval button before any code-writing agent runs

In this version, the watcher should not silently modify code. It should produce an implementation task and wait for approval.

### Later automated version

Once the workflow is proven, the control panel can support an auto-run mode:

- Only run when a changed doc contains `Status: Ready for implementation`.
- Only run checklist items from the changed doc.
- Use a local Cursor SDK agent with the repo root as its working directory.
- Record agent ID, run ID, prompt, status, and result.
- Require approval for broad changes, dependency changes, deletes, commits, pushes, or deployment.

### Backend pieces

The Node backend would need:

- File watcher for `docs/`.
- Task queue or run table, stored in SQLite.
- Agent runner module that can call Cursor SDK.
- API routes for start, stop, status, approve, cancel, and run history.
- Log streaming to the UI with polling, SSE, or WebSocket.

### Security and safety rules

- Keep `CURSOR_API_KEY` on the backend only; never expose it to the browser.
- Bind the control API to localhost unless intentionally exposed.
- Default to approval-required mode.
- Do not let the watcher run on every doc save unless the doc is explicitly marked ready.
- Check git status before starting an implementation run so user changes are visible.
- Store prompts and results so later agents can understand what happened.

---

## Documentation designer responsibilities

The documentation designer should produce or update:

- **Feature brief:** what problem the feature solves and who uses it.
- **Acceptance criteria:** concrete checks that tell us when the feature is done.
- **Open questions:** decisions that block or shape implementation.
- **Non-goals:** what is intentionally out of scope for the current phase.
- **UX notes:** user flow, default states, error states, and edge cases.
- **Technical constraints:** persistence, local file access, video handling, performance, or security constraints that implementation must respect.

The documentation designer should prefer updating existing docs before creating new ones:

- Use `DOCUMENTATION_SYSTEM.md` for the overall documentation map and source-of-truth rules.
- Use `FEATURES.md` for feature breakdowns.
- Use `OPEN_QUESTIONS.md` for unresolved decisions.
- Use `UI_FORMS.md` for screen and flow behavior.
- Use `ARCHITECTURE.md`, `TECHNICAL_APPROACH.md`, and `PERSISTENCE.md` for technical constraints.

Create a new focused doc only when a feature becomes too large for the general docs.

---

## Implementation agent responsibilities

The implementation agent should:

- Read the relevant docs before coding.
- Read [`agents/IMPLEMENTATION_AGENT.md`](agents/IMPLEMENTATION_AGENT.md) for the detailed implementation workflow.
- Create or update an implementation checklist before medium/large code changes.
- Confirm assumptions if a documented requirement is unclear or conflicting.
- Keep changes scoped to the current feature or phase.
- When git is established, branch from the agreed development branch before starting feature work.
- Update docs when the implementation changes user-facing behavior, setup, data shape, or acceptance criteria.
- Create Unit Test Agent, Test Strategy Agent, Browser QA, or Review work items when implementation reveals follow-up verification work.
- Report verification steps in plain language.

The implementation agent should not treat chat as the only source of truth. Important decisions should be captured in `docs/` before or during implementation.

---

## Handoff protocol

Use this sequence for medium or large work:

1. **Goal capture**
   - User describes what they want.
   - Documentation designer turns it into a feature brief, acceptance criteria, and open questions.

2. **Decision pass**
   - User answers blocking questions or accepts sensible defaults.
   - Documentation designer updates the docs with the decisions.
   - Important choices are recorded in `DECISIONS.md`.

3. **Implementation brief**
   - Feature readiness is checked using `FEATURE_LIFECYCLE.md`.
   - Implementation agent receives links to the relevant docs and a short checklist.
   - The checklist should name the files or areas likely to change, but not over-prescribe the code.

4. **Build and verify**
   - Implementation agent makes the focused code changes.
   - Verification is run locally when possible.
   - Any deviations from the spec are either fixed or documented.

5. **Documentation sync**
   - If implementation changed the design, docs are updated before the task is considered done.
   - If new questions were discovered, they go into `OPEN_QUESTIONS.md`.

6. **Review**
   - Review / verification agent or user compares implementation against acceptance criteria.
   - Feature status moves to `Verified`, `Done`, `Blocked`, or stays `Implemented` based on review.
   - Post-implementation reflection captures what changed from the plan.

Small tasks can skip the formal handoff, but still follow the principle: important behavior belongs in docs.

---

## Feature documentation template

Use this shape when a feature needs its own focused spec:

```md
# Feature: <Name>

## Status

Status: Draft | Ready for implementation | In progress | Implemented | Verified | Done | Blocked
Owner:
Phase:

## Intent

What user problem this solves.

## Current Phase

P0 / P1 / P2 / later.

## User Flow

1. User does ...
2. App responds ...

## Acceptance Criteria

- [ ] ...
- [ ] ...

## Non-Goals

- ...

## Open Questions

- ...

## Implementation Notes

- Relevant docs:
- Relevant code areas:
- Constraints:

## Verification

- Manual checks:
- Automated checks:

## Traceability

- Implementation:
- Unit testing:
- Review:
- Decisions:

## Post-Implementation Reflection
```

---

## Future agent types

As the project matures, these can be added as recurring or on-demand roles:

| Agent | When useful | Example task |
|-------|-------------|--------------|
| **Test planner** | Once core flows exist | Design manual and automated coverage for intake, markers, and comparison |
| **Browser QA agent** | Once UI behavior is testable | Run through import, marker editing, and comparison in the browser |
| **Docs sync agent** | As implementation accelerates | Detect code behavior that no longer matches docs |
| **CI babysitter** | Once CI exists | Watch failing checks and fix straightforward breakage |
| **Release notes agent** | Before tagged releases | Summarize completed work and migration notes |
| **Backlog gardener** | As ideas accumulate | Keep future ideas organized without polluting the MVP |

Agents should be added when they reduce coordination cost. If a role creates more handoff than value, keep it manual.

---

## Practical use in Cursor

Yes, this workflow is possible here.

In this environment we can:

- Use one agent to explore and design documentation.
- Use another agent to implement a scoped checklist.
- Run agents in the background for read-only exploration, browser testing, or review.
- Run a local watcher loop that wakes the agent when docs change.
- Add project rules or skills later if a workflow becomes repeatable enough to encode.

For now, keep the process simple:

1. Ask for a documentation pass when a feature is still being shaped.
2. Ask for an implementation pass once the acceptance criteria are stable.
3. Ask for a review pass when code is ready to compare against the docs.

Useful prompts:

```text
Do a documentation-design pass for the intake flow. Update docs only.
```

```text
Implement the ready checklist from docs/INTAKE_FLOW.md.
```

```text
Review the current marker implementation against docs/FEATURES.md.
```

```text
Watch docs for changes every 5 minutes. If docs changed, summarize the implementation impact and ask before coding.
```

```text
Watch docs for changes. If a changed doc has Status: Ready for implementation, implement that checklist and run checks.
```

---

## Operating principle

The documentation designer protects the **why** and **what**.

The implementation agent owns the **how**.

The user remains the final decision maker for priorities, trade-offs, and what is good enough to ship.
