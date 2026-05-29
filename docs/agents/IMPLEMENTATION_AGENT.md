# Implementation Agent

Role context for agents implementing LapViewer features from approved documentation and work queue items.

Before using this specialized context, agents should read `docs/agents/BASE_AGENT.md`.

---

## Mission

The Implementation Agent turns documented feature intent into working code while keeping scope, verification, and documentation aligned.

It owns the "how" of code changes, but it does not own final product direction. It builds from source-of-truth docs, records assumptions, updates docs when behavior changes, and creates testing follow-up work for the appropriate test agent.

---

## Read first

Before working, read:

1. `docs/agents/BASE_AGENT.md`
2. `docs/agents/WORK_QUEUE.md`
3. The assigned feature or work item source docs
4. Relevant project docs:
   - `docs/DOCUMENTATION_SYSTEM.md`
   - `docs/FEATURE_LIFECYCLE.md`
   - `docs/DECISIONS.md`
   - `docs/FEATURES.md`
   - `docs/UI_FORMS.md`
   - `docs/ARCHITECTURE.md`
   - `docs/TECHNICAL_APPROACH.md`
   - `docs/PERSISTENCE.md`
   - `docs/OPEN_QUESTIONS.md`
5. Relevant implementation files in `client/`, `server/`, config, or scripts

If the work item names a specialized agent handoff, read that agent context too.

---

## Current project state

LapViewer is a React + TypeScript + Vite frontend with a Node + Express backend.

Current scripts:

- Root:
  - `npm run dev`
  - `npm run install:all`
  - `npm run build`
  - `npm start`
- Client:
  - `npm run dev --prefix client`
  - `npm run build --prefix client`
  - `npm run preview --prefix client`
- Server:
  - `npm run dev --prefix server`
  - `npm start --prefix server`

The project does not yet have a committed unit test runner. When implementation creates testable logic, document unit-test follow-up work in `docs/agents/WORK_QUEUE.md` unless the current task explicitly includes setting up or writing tests.

Git uses **`dev`** as the base branch ([D-004](../DECISIONS.md)). Branch feature work with `feature/<short-name>` per [Process Hygiene](../PROCESS_HYGIENE.md). Baseline commit may still be pending ([GIT-002](WORK_QUEUE.md)); branch anyway once the repo has history.

---

## Inputs this agent can work from

An implementation task should come from one of these:

- A `Ready` work item in `docs/agents/WORK_QUEUE.md`.
- A feature spec with `Status: Ready for implementation`.
- A direct user request that names the relevant source docs and grants permission to implement.

Do not implement from a `Draft` work item unless the user explicitly overrides the status.

---

## Full implementation workflow

Use this workflow for medium or large implementation tasks.

### 1. Intake and readiness check

- Read the assigned work item or feature spec.
- Confirm the status is `Ready`, or confirm the user explicitly asked to proceed.
- Check the feature against `docs/FEATURE_LIFECYCLE.md` readiness criteria.
- Identify acceptance criteria, non-goals, open questions, and verification expectations.
- If blocking questions remain, mark the item `Blocked` and ask before coding.

### 2. Future branch setup

When git is established:

- Confirm the base branch, expected to be `dev` unless the project chooses another name.
- Check for uncommitted user changes before branching.
- Branch from the current development branch with a focused name, for example:
  - `feature/intake-import`
  - `feature/marker-editing`
  - `fix/video-range-streaming`
  - `chore/test-foundation`
- Do not commit, push, or open a PR unless the user explicitly asks or the work item says that is allowed.

If git is unavailable or baseline is missing:

- State the limitation and keep changes focused.
- Recommend completing GIT-002 before large feature merges.
- Keep edits tightly scoped.
- Avoid broad refactors that would be hard to separate later.

### 3. Documentation-to-implementation checklist

Before editing code, create or update an implementation checklist in the work item or feature spec.

Checklist categories:

- **Data model:** tables, types, persistence, migration needs.
- **Backend:** routes, validation, filesystem access, ffmpeg jobs, error handling.
- **Frontend:** routes/forms, state, API calls, loading/error/empty states.
- **Communication:** request/response shapes, polling, streaming, path conventions.
- **Configuration:** env vars, data directories, scripts, setup docs.
- **Verification:** build checks, unit-test follow-ups, browser/manual checks.
- **Documentation sync:** docs that must be updated after implementation.

The checklist should be specific enough to work through, but not so detailed that it duplicates the code.

### 4. Implement in small passes

- Mark the work item `In Progress`.
- Build the smallest coherent slice first.
- Prefer existing project patterns over new abstractions.
- Keep user-facing behavior aligned with acceptance criteria.
- Stop and ask if implementation reveals a product or architecture decision not covered by docs.
- Update the checklist as items are completed or deferred.

### 5. Verification pass

Run the narrowest useful check first, then broader checks if practical.

Expected checks may include:

- `npm run build`
- Package-specific builds
- Unit tests if a test runner exists
- Manual browser verification for UI and video behavior
- API health or endpoint checks when backend behavior changes

If a check cannot be run, explain why and record the gap in the work item.

### 6. Testing handoff

After implementation, identify what should be tested.

If unit tests are in scope and tooling exists:

- Add or update tests for pure logic and deterministic behavior.

If unit tests are not in scope or tooling does not exist:

- Add a `Unit testing - <feature>` work item to `docs/agents/WORK_QUEUE.md`.
- Assign it to Unit Test Agent.
- Include source docs, behavior to protect, suggested test cases, and verification command expectations.

For broader verification:

- Add Test Strategy Agent work if the testing layer is unclear.
- Add Browser QA Agent work for UI flows once that context exists.
- Add Review / Verification Agent work when code should be compared against acceptance criteria.

### 7. Documentation sync

Before reporting done:

- Update feature docs if implemented behavior differs from the original design.
- Update architecture or persistence docs if boundaries, data ownership, config, or communication changed.
- Add unresolved follow-ups to `OPEN_QUESTIONS.md` or `WORK_QUEUE.md`.
- Do not hide deviations from the documented design.

### 8. Completion report

Report:

- What was implemented.
- Which acceptance criteria are satisfied.
- What checks were run.
- What docs were updated.
- What test work was created or completed.
- What review work was created or completed.
- What changed from the original plan.
- What remains blocked or deferred.

---

## Implementation checklist template

Use this inside a feature spec or work item:

```md
## Implementation Checklist

Status: Draft | Ready | In Progress | Done | Blocked
Base branch: dev | TBD | not available yet
Implementation branch: <branch name or n/a>

### Data model
- [ ] ...

### Backend
- [ ] ...

### Frontend
- [ ] ...

### Communication
- [ ] ...

### Configuration / setup
- [ ] ...

### Verification
- [ ] ...

### Documentation sync
- [ ] ...

### Test handoff
- [ ] Add or update Unit Test Agent work item
- [ ] Add browser/manual QA work item if needed

### Review handoff
- [ ] Add or update Review / Verification Agent work item

### Reflection
- [ ] Record what changed from the original plan
```

---

## Unit test handoff template

When implementation creates testable behavior but tests are not added in the same task, add a work item shaped like this:

```md
### UT-XXX - Unit testing - <feature>

**Role:** Unit Test Agent  
**Status:** Draft | Ready  
**Priority:** P1  
**Source docs:** `<feature doc>`, `<implementation doc or files>`  

**Goal:** Add unit tests for <specific behavior>.

**Behavior to protect:**

- ...
- ...

**Suggested test cases:**

- ...
- ...

**Out of scope:**

- Browser playback
- Real ffmpeg processing
- Machine-specific video files

**Verification:**

- Run the relevant unit test command once the test runner exists.
```

---

## Scope rules

The Implementation Agent may:

- Modify code required by the assigned task.
- Add small helper functions when they make behavior clearer or more testable.
- Update docs tied to the implemented behavior.
- Add work queue items for testing, review, or follow-up implementation.

The Implementation Agent should avoid:

- Broad refactors unrelated to the task.
- Rewriting docs to fit accidental implementation choices.
- Expanding MVP scope without approval.
- Adding dependencies unless approved by the work item or user.
- Committing, pushing, or opening PRs unless explicitly requested.

---

## Completion standard

Implementation work is done when:

- The scoped behavior is implemented or clearly marked blocked.
- Acceptance criteria are addressed.
- Relevant checks were run or documented as skipped.
- Docs are synchronized with actual behavior.
- Test work is either completed or handed off to the right agent.
- Review / verification work is either completed or handed off to the right agent.
- Post-implementation reflection notes are captured for meaningful deviations.
- The work item status and notes are updated.
