# Feature Lifecycle

How a LapViewer feature moves from idea to documented, implemented, verified, and done.

Use this for medium or large features. Small changes can use a lighter version, but should still preserve the core idea: design first, implement from clear criteria, verify against the docs, and record what changed.

---

## Feature statuses

Use these statuses in focused feature specs and related work items:

| Status | Meaning |
|--------|---------|
| `Draft` | Idea is being shaped. Do not implement yet. |
| `Ready for implementation` | Enough decisions are made to start implementation. |
| `In progress` | Implementation or verification work is active. |
| `Implemented` | Code exists, but review/testing may still be incomplete. |
| `Verified` | Acceptance criteria were checked and known gaps are documented. |
| `Done` | Feature is implemented, verified, docs are synced, and follow-up work is queued or closed. |
| `Blocked` | Cannot move forward without a decision, dependency, or prerequisite. |
| `Cancelled` | No longer planned. |

---

## Lifecycle overview

```text
Idea
  -> Documentation design
  -> Architecture/test planning
  -> Readiness gate
  -> Implementation
  -> Test handoff / test work
  -> Review and verification
  -> Post-implementation reflection
  -> Done
```

---

## 1. Idea capture

The feature starts as a user goal, note, or open question.

Capture it in one of:

- `docs/FEATURES.md`
- A focused feature spec
- `docs/OPEN_QUESTIONS.md`
- `docs/agents/WORK_QUEUE.md`

The goal at this stage is not completeness. It is to avoid losing intent.

---

## 2. Documentation design

Owned by Documentation Designer Agent.

Required output:

- Intent
- User flow
- Acceptance criteria
- Non-goals
- UX states
- Open questions
- Implementation status
- Initial traceability links

If the feature affects architecture, data, APIs, persistence, or runtime behavior, route follow-up work to Architecture Design Agent.

If the feature has meaningful verification concerns, route follow-up work to Test Strategy Agent.

---

## 3. Feature readiness gate

A feature can move to `Ready for implementation` only when:

- Intent is clear.
- Acceptance criteria are testable.
- Non-goals are listed.
- Blocking open questions are answered or explicitly deferred.
- User-facing flow is described.
- Data/API/architecture impact is either documented or explicitly not applicable.
- Verification expectations are listed.
- Implementation checklist exists or the feature is small enough that one is unnecessary.
- Any dependency, git, config, or migration concerns are called out.

If these are not true, keep the feature as `Draft` or `Blocked`.

---

## 4. Implementation

Owned by Implementation Agent.

The implementation agent should:

- Read `docs/agents/IMPLEMENTATION_AGENT.md`.
- Branch from the agreed development branch once git is established.
- Create or update the implementation checklist.
- Build the smallest coherent slice first.
- Run relevant checks.
- Update docs if implementation differs from design.
- Create Unit Test Agent, Test Strategy Agent, Browser QA, or Review work items as needed.

Implementation changes should not silently redefine product scope. If implementation reveals a new product or architecture decision, pause and document it.

---

## 5. Test handoff and verification

Testing may be handled by multiple roles:

- Unit Test Agent for deterministic logic.
- Test Strategy Agent when the layer or tooling is unclear.
- Browser QA Agent for UI workflows.
- Review / Verification Agent for acceptance criteria comparison.
- Human manual verification for local video playback, GoPro files, ffmpeg performance, and subjective UX feel.

If tests are not added during implementation, the implementation agent must create follow-up work items that describe what should be tested.

---

## 6. Review and verification

Owned by Review / Verification Agent or the user.

Review should compare:

- Documented acceptance criteria.
- Implemented behavior.
- Known non-goals.
- Test and verification results.
- Documentation updates.

Findings should be written as concrete gaps:

- Bug or regression.
- Missing acceptance criterion.
- Unclear docs.
- Missing test coverage.
- Follow-up decision needed.

---

## 7. Post-implementation reflection

After implementation and initial verification, do a short reflection:

- What changed from the original design?
- Did any acceptance criteria change?
- Were any non-goals accidentally included?
- Did the implementation reveal a new architecture or product decision?
- What docs were updated?
- What should the next agent know?
- What follow-up work remains?

This can live in the feature spec, work queue item, or review notes.

---

## Definition of done

A feature is `Done` when:

- Code implements the documented behavior or deviations are documented.
- Acceptance criteria are checked.
- Relevant docs are updated.
- Tests are added or test follow-up work is queued.
- Manual verification steps are documented when automation is not practical.
- Review findings are resolved, deferred, or captured as follow-up work.
- Open questions are answered, deferred, or linked.
- Traceability links connect the feature spec, implementation work, test work, review results, and decisions.

---

## Traceability section template

Add this to focused feature specs:

```md
## Traceability

- Feature spec: `<path>`
- Source docs:
  - `<path>`
- Work items:
  - Implementation: `<ID>`
  - Unit testing: `<ID or n/a>`
  - Test strategy: `<ID or n/a>`
  - Review / verification: `<ID or n/a>`
- Decisions:
  - `<decision id or n/a>`
- Implementation files:
  - `<path or TBD>`
- Verification:
  - `<command or manual check>`
```

---

## Feature spec template

Use this template for larger features:

```md
# Feature: <Name>

## Status

Status: Draft | Ready for implementation | In progress | Implemented | Verified | Done | Blocked
Owner: <human or agent>
Phase: P0 | P1 | P2 | P3

## Intent

## User Flow

## Acceptance Criteria

- [ ] ...

## Non-Goals

- ...

## UX States

- Empty:
- Loading:
- Error:
- Success:

## Data Model

## API / Communication

## Architecture Notes

## Testing / Verification

## Open Questions

## Implementation Checklist

## Traceability

## Post-Implementation Reflection
```
