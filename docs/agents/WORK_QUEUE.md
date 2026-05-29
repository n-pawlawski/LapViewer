# Agent Work Queue

Role-specific work items for LapViewer agents.

Agents should read their role context first, then use this queue to find assigned work. Keep work items small enough that one agent can complete them in a focused pass.

---

## Queue rules

- Do not implement `Draft` items.
- A `Ready` item may be picked up by the assigned agent role.
- Mark an item `In Progress` before editing code.
- Mark an item `Blocked` if user input, dependencies, or missing decisions prevent completion.
- Mark an item `Done` only after verification is complete or explicitly documented as skipped.
- Add newly discovered follow-ups as separate work items instead of expanding the current task.

---

## Ready work

No ready work items yet.

---

## Draft work

### GIT-002 - Baseline commit on `dev`

**Role:** Project Maintenance Agent  
**Status:** Ready  
**Priority:** P0  
**Source docs:** `docs/PROCESS_HYGIENE.md`, `docs/DEVELOPMENT.md`, `docs/DECISIONS.md` (D-004, D-011)  

**Goal:** Create the first commit on `dev` so all future work diffs against a known baseline.

**Context:** Git is initialized on `dev` (GIT-001 complete). No commit yet per user approval rules.

**Work to perform when ready:**

- Review `git status` — ensure no secrets, `node_modules`, or `data/` are staged.
- Stage project source and docs (not local-only paths).
- Commit with message describing hygiene baseline + current spike state.
- Do not add remote or push unless explicitly requested.

**Acceptance criteria:**

- `dev` has at least one commit.
- `git status` is clean for tracked project files.

**Verification:**

- `git log -1 --oneline`
- `git status --short --branch`

---

### MAINT-002 - Decide lint and formatting setup

**Role:** Project Maintenance Agent  
**Status:** Draft  
**Priority:** P2  
**Source docs:** `docs/PROCESS_TOOLING_GAPS.md`, `docs/DECISIONS.md`  

**Goal:** Decide whether to add Prettier, ESLint, both, or defer style tooling.

**Context:** There is currently no lint or formatting setup. Adding tooling requires dependencies.

**Work to perform when ready:**

- Propose minimal lint/format options.
- Ask for dependency approval.
- If approved, add tooling in a separate maintenance pass.

**Acceptance criteria:**

- Decision is recorded in `DECISIONS.md`.
- Follow-up implementation work is created if tooling is approved.

**Verification:**

- Docs-only unless tooling is approved.

---

### CI-001 - Add minimal CI after git remote exists

**Role:** Project Maintenance Agent  
**Status:** Ready  
**Priority:** P3  
**Source docs:** `docs/PROCESS_TOOLING_GAPS.md`, `.github/workflows/ci.yml`  

**Goal:** Add minimal CI that runs install, build/typecheck, and tests once a remote exists.

**Context:** `.github/workflows/ci.yml` runs `npm run check` on push/PR to `dev`/`main`. Activates when a GitHub remote is added.

**Blocked by:**

- Remote hosting decision (user must `git remote add` + push)

**Acceptance criteria:**

- CI runs the same root verification command agents use locally.
- CI docs or README mention expected checks.

**Verification:**

- CI run passes on remote.

---

### UT-001 - Unit testing foundation

**Role:** Unit Test Agent  
**Status:** Draft  
**Priority:** P1  
**Source docs:** `docs/agents/UNIT_TEST_AGENT.md`, `docs/FEATURES.md`, `docs/TECHNICAL_APPROACH.md`  

**Goal:** Propose the initial unit testing setup for LapViewer and identify the first production logic that should receive tests.

**Context:** The repo does not currently have a committed unit test runner. The likely default is Vitest because the project is TypeScript and Vite-based, but dependency approval is still required.

**Work to perform when ready:**

- Confirm whether adding Vitest is approved.
- Add package scripts for unit tests.
- Add minimal test configuration for the selected package or repo structure.
- Add a small first test around pure logic if such logic exists.
- If no pure logic exists yet, create a follow-up work item for the first feature that introduces testable logic.

**Acceptance criteria:**

- A test command exists and is documented.
- At least one meaningful test exists, or a clear explanation states why no production unit exists yet.
- The test command runs locally.
- The Unit Test Agent doc is updated if the actual runner differs from the proposed default.

**Verification:**

- Run the new test command.
- Run `npm run build` if TypeScript config or source layout changed.

**Notes / open questions:**

- User approval needed before adding test dependencies.

---

### IMPL-001 - First implementation workflow dry run

**Role:** Implementation Agent  
**Status:** Draft  
**Priority:** P1  
**Source docs:** `docs/agents/IMPLEMENTATION_AGENT.md`, `docs/agents/WORK_QUEUE.md`, `docs/FEATURES.md`  

**Goal:** Use the Implementation Agent workflow on the first small feature that is marked ready.

**Context:** This should validate the implementation process before larger feature work. Pick a small, well-documented feature once one is ready.

**Work to perform when ready:**

- Read the Implementation Agent context.
- Confirm the source feature or work item is ready.
- Create an implementation checklist.
- Implement the smallest coherent slice.
- Run relevant verification.
- Add Unit Test Agent follow-up work if implementation creates testable logic.
- Update docs and work queue status.

**Acceptance criteria:**

- The implementation workflow is followed end-to-end.
- Any missing workflow steps are added back to `IMPLEMENTATION_AGENT.md`.
- Test handoff work is created if tests are not implemented directly.
- Review / Verification Agent work is created before final done status.
- Post-implementation reflection is captured when implementation differs from plan.

**Verification:**

- Run the checks relevant to the selected feature.

---

### TEST-001 - Design testing strategy doc

**Role:** Test Strategy Agent  
**Status:** Draft  
**Priority:** P1  
**Source docs:** `docs/DOCUMENTATION_SYSTEM.md`, `docs/agents/TEST_STRATEGY_AGENT.md`, `docs/agents/UNIT_TEST_AGENT.md`, `docs/FEATURES.md`  

**Goal:** Create `docs/TESTING_STRATEGY.md` defining unit, integration, browser, and manual verification layers for LapViewer.

**Context:** The repo does not yet have a test runner. The testing strategy should describe the model before dependencies are added.

**Work to perform when ready:**

- Map major feature areas to verification layers.
- Define test fixture rules.
- Define what should not be automated yet.
- Define expected future commands once tooling exists.
- Create follow-up work for Unit Test Agent if dependencies are approved.

**Acceptance criteria:**

- Testing strategy explains what gets tested where.
- It avoids requiring local private video files for automated tests.
- It links back to relevant agent contexts.

**Verification:**

- Read docs for consistency and practicality.

---

### ARCH-001 - Design API and data model documentation

**Role:** Architecture Design Agent  
**Status:** Draft  
**Priority:** P1  
**Source docs:** `docs/DOCUMENTATION_SYSTEM.md`, `docs/ARCHITECTURE.md`, `docs/PERSISTENCE.md`, `docs/VIDEO_LIBRARY.md`  

**Goal:** Propose initial `API_CONTRACT.md` and `DATA_MODEL.md` structure for backend routes, SQLite tables, and communication paths.

**Context:** Backend persistence and API contracts are not fully implemented yet, so this should define structure and placeholders without inventing final details.

**Work to perform when ready:**

- Create an API contract skeleton for health, sessions, markers, video streaming, and jobs.
- Create a data model skeleton for sessions, markers, and cache metadata.
- Link docs from `DOCUMENTATION_SYSTEM.md` or `README.md` if appropriate.

**Acceptance criteria:**

- API and data docs define the sections future implementation should fill in.
- Unknowns are marked as open questions or draft fields.
- Communication paths are clear.

**Verification:**

- Read docs for consistency with `ARCHITECTURE.md`.

---

## Done work

### GIT-001 - Initialize git and development branch

**Role:** Project Maintenance Agent  
**Status:** Done  
**Priority:** P0  
**Completed:** 2026-05-28  

**Work performed:**

- `git init -b dev`
- Branch strategy documented in `docs/PROCESS_HYGIENE.md`
- **D-004** accepted

**Verification:** `git status --short --branch` on `dev`

---

### MAINT-001 - Add root verification scripts

**Role:** Project Maintenance Agent  
**Status:** Done  
**Priority:** P1  
**Completed:** 2026-05-28  

**Work performed:**

- `server`: `npm run typecheck` (`tsc --noEmit`)
- `client`: `npm run typecheck` (`tsc -b`)
- Root: `npm run check` → both typechecks
- README and `docs/DEVELOPMENT.md` updated

**Verification:** `npm run check`

---

### DOC-002 - Design source-of-truth documentation map

**Role:** Documentation Designer  
**Status:** Done  
**Priority:** P0  
**Source docs:** `docs/DOCUMENTATION_SYSTEM.md`, `docs/AGENT_WORKFLOW.md`, `docs/agents/BASE_AGENT.md`  

**Goal:** Define a scalable documentation system that explains how product, architecture, testing, communication, operations, and agent workflow docs fit together.

**Work performed:**

- Added `docs/DOCUMENTATION_SYSTEM.md`.
- Added `docs/FEATURE_LIFECYCLE.md`.
- Added `docs/DECISIONS.md`.
- Defined documentation layers, source-of-truth rules, software section map, communication map, lifecycle, and roadmap.
- Added specialized agent contexts for documentation, architecture, and test strategy.
- Added feature readiness, done, traceability, and reflection gates.

**Verification:**

- Read through generated docs for consistency.

**Notes / open questions:**

- Future work should add `TESTING_STRATEGY.md`, `API_CONTRACT.md`, and `DATA_MODEL.md` when implementation reaches those areas.

---

### DOC-001 - Expand agent role library

**Role:** Documentation Designer  
**Status:** Done  
**Priority:** P2  
**Source docs:** `docs/AGENT_WORKFLOW.md`, `docs/agents/README.md`, `docs/agents/TEMPLATES.md`  

**Goal:** Add context docs for the next useful agent roles after Unit Test Agent.

**Work performed:**

- Added Documentation Designer Agent.
- Added Architecture Design Agent.
- Added Test Strategy Agent.
- Added Implementation Agent.
- Added Review / Verification Agent.
- Linked new roles from `docs/agents/README.md`.
- Added feature lifecycle and decision log process docs.

**Verification:**

- Read the docs for consistency.

---

## Cancelled work

No cancelled work items yet.
