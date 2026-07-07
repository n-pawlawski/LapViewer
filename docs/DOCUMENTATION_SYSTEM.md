# Documentation System

How LapViewer documentation is organized so agents and humans can understand what the software does, why it does it, and how each section communicates with the rest of the system.

This is the map for designing documentation at scale. Individual docs may stay small, but together they should answer: product intent, feature behavior, architecture, design choices, data ownership, communication paths, testing, operations, and agent workflow.

---

## Documentation goals

LapViewer docs should make it possible to:

- Understand the product without reading code.
- Build a feature from documented acceptance criteria.
- Trace a user-facing behavior to architecture, data, API, and tests.
- Capture design choices so the same trade-offs are not re-decided later.
- Give specialized agents enough context to work safely.
- Keep implementation and docs synchronized as the project grows.

---

## Documentation layers

| Layer | Purpose | Primary docs |
|-------|---------|--------------|
| Product | Why the app exists, who uses it, what success means | `PROJECT_OVERVIEW.md`, `ROADMAP.md`, `FEATURES.md`, `FEATURE_LIFECYCLE.md`, `OPEN_QUESTIONS.md` |
| UX / workflow | How the user moves through the app | `UI_FORMS.md`, `INTAKE_FLOW.md`, focused feature specs |
| Architecture | How the app is structured and run | `ARCHITECTURE.md`, `TECHNICAL_APPROACH.md` |
| Data / persistence | What data exists, where it lives, ownership rules | `PERSISTENCE.md`, `VIDEO_LIBRARY.md` |
| Communication | How frontend, backend, filesystem, ffmpeg, and future agents interact | `ARCHITECTURE.md`, future API docs, this doc |
| Testing | How behavior is verified at unit, integration, browser, and manual levels | future `TESTING_STRATEGY.md`, `docs/agents/unit-test/BASE.md` |
| Operations | Setup, config, local run, Docker later, backup, troubleshooting | `README.md`, `DEVELOPMENT.md`, `ARCHITECTURE.md`, `PERSISTENCE.md`, `PROCESS_TOOLING_GAPS.md` |
| Process hygiene | Git workflow, verification, definition of done | `PROCESS_HYGIENE.md`, `FEATURE_LIFECYCLE.md`, `DECISIONS.md` |
| Agent workflow | How specialized agents pick up context and work items | `AGENT_WORKFLOW.md`, `docs/agents/` |
| Decisions | Why major choices were made | `DECISIONS.md` or future focused ADR files |

---

## Keeping the map current

When documentation is added, renamed, or split:

1. Update the source-of-truth table below.
2. Update `docs/agents/BASE_AGENT.md` **Project documentation map**.
3. Update `.agent-project.yaml` `paths` to match.

Agents resolve doc locations from `BASE_AGENT.md` first, then this file.

---

## Source-of-truth rules

Each concern should have one primary home.

| Concern | Source of truth | Notes |
|---------|-----------------|-------|
| Feature list and acceptance criteria | `FEATURES.md` | Split into focused feature specs when a section grows too large |
| Product roadmap (pre-deploy phases) | `docs/ROADMAP.md` | Phase order; object-storage intake; deploy active |
| View & compare v1 (active build) | `docs/features/VIEW_COMPARE_V1.md` | VC-1–VC-5 phases; mock-first per **D-017** |
| Users & dev account v1 | `docs/features/USERS_V1.md` | Roadmap Phase 1; dev seed pattern |
| Data form v2 refactor | `docs/features/DATA_FORM_V2.md` | Roadmap Phase 2; layout + organization |
| Assisted lap detection v1 | `docs/features/AUTO_LAP_DETECTION_V1.md` | F7; spike-derived; MVP AD-1–AD-4, splits AD-5; decisions resolved |
| Reference-lap lap & split detection | `docs/features/GOPRO_LAP_SPLIT_DETECTION.md` | F8; spike passed GO; M2-LV next |
| Feature lifecycle and done gates | `FEATURE_LIFECYCLE.md` | Owns readiness, status, traceability, review, and done criteria |
| User screen behavior | `UI_FORMS.md` | Keep route/form behavior here, not scattered across architecture docs |
| Intake process | `INTAKE_FLOW.md` | Owns import user flow and edge cases |
| Video library ownership | `VIDEO_LIBRARY.md` | Owns registered video model and missing-file behavior |
| Runtime architecture | `ARCHITECTURE.md` | Owns process model, repo layout, backend/frontend responsibilities |
| Technical trade-offs | `TECHNICAL_APPROACH.md` | Owns rationale and alternatives |
| Persistent data rules | `PERSISTENCE.md` | Owns `DATA_DIR`, SQLite, cache, Docker volume rules |
| Open decisions | `OPEN_QUESTIONS.md` | Should shrink over time as choices move into source docs |
| Accepted decisions | `DECISIONS.md` | Owns project choices likely to affect future work |
| Process and tooling gaps | `PROCESS_TOOLING_GAPS.md` | Owns remaining test, lint, and automation setup |
| Process hygiene standard | `PROCESS_HYGIENE.md` | Owns branching, verification ladder, and done criteria |
| Local dev commands | `DEVELOPMENT.md` | Owns install, dev, check, and git workflow summary |
| Agent instructions | `docs/agents/*.md` | Role-specific behavior for specialized agents |
| Agent doc map (paths for agents) | `docs/agents/BASE_AGENT.md` + `.agent-project.yaml` | Must stay in sync with this file's SOT table |
| Feature implementation tasks | `docs/work-orders/WO-*.md` | Typed work items per feature; see `docs/agents/WORK_ORDERS.md` |
| Global agent work items | `docs/agents/WORK_QUEUE.md` | Tooling and hygiene; not primary home for feature code |

If two docs disagree, the source-of-truth doc wins and the other doc should be corrected.

---

## Software section map

### Frontend

**Purpose:** Render the three user-facing forms and coordinate user interaction.

Primary responsibilities:

- Data form: sessions, selected video, lap list, comparison selection.
- Intake form: video registration, metadata, playback, marker placement.
- Comparison form: synchronized lap playback.
- API calls to backend through `/api/*`.

Documentation homes:

- User behavior: `UI_FORMS.md`, `FEATURES.md`
- Communication with backend: `ARCHITECTURE.md`, future API docs
- Testing approach: future `TESTING_STRATEGY.md`

### Backend API

**Purpose:** Own local system access that the browser cannot do directly.

Primary responsibilities:

- Validate configured paths.
- Register video files by path.
- Probe video metadata with ffprobe.
- Stream videos with HTTP Range support.
- Persist sessions and markers in SQLite.
- Run ffmpeg jobs for scrub proxies.

Documentation homes:

- Architecture and responsibilities: `ARCHITECTURE.md`
- Persistence rules: `PERSISTENCE.md`
- Video behavior: `VIDEO_LIBRARY.md`, `TECHNICAL_APPROACH.md`
- Future API contract: `API_CONTRACT.md`

### Data and persistence

**Purpose:** Preserve sessions, markers, and derived cache across app restarts and machine reboots.

Primary responsibilities:

- SQLite database under `DATA_DIR`.
- Path pointers to original videos under `VIDEO_LIBRARY_ROOT`.
- Rebuildable cache under `DATA_DIR/cache`.
- No video blobs in the database.

Documentation homes:

- `PERSISTENCE.md`
- `VIDEO_LIBRARY.md`
- `ARCHITECTURE.md`

### Video processing

**Purpose:** Make GoPro files usable for scrubbing and lap marking.

Primary responsibilities:

- Probe container, codec, duration, and stream metadata.
- Generate scrub proxies with ffmpeg.
- Keep originals path-only and untouched by default.
- Support future thumbnails or filmstrip previews.

Documentation homes:

- `TECHNICAL_APPROACH.md`
- `INTAKE_FLOW.md`
- future focused video processing spec if the feature grows.

### Agent system

**Purpose:** Let specialized agents work from shared context without losing the design record.

Primary responsibilities:

- Base orientation in `docs/agents/BASE_AGENT.md`.
- Specialized role instructions in `docs/agents/<folder>/BASE.md` (+ auxiliary docs). See `docs/agents/AGENT_LAYOUT.md`.
- Work item routing in `docs/agents/WORK_QUEUE.md`.
- Optional future watcher/control UI described in `AGENT_WORKFLOW.md`.

Documentation homes:

- `AGENT_WORKFLOW.md`
- `docs/agents/README.md`
- `docs/agents/WORK_QUEUE.md`

---

## Communication map

```text
User
  -> Browser UI
  -> React forms
  -> Backend API over HTTP /api/*
  -> SQLite for sessions and markers
  -> Filesystem for original videos and app cache
  -> ffprobe / ffmpeg for metadata and proxies
```

```text
Documentation Designer Agent
  -> Reads product, UX, architecture, and open questions
  -> Updates docs and work queue
  -> Produces implementation-ready acceptance criteria
```

```text
Implementation Agent
  -> Reads base context, role context, source docs, and work item
  -> Creates implementation checklist
  -> Changes code
  -> Runs verification
  -> Creates testing handoff work when needed
  -> Updates docs if behavior or setup changed
```

```text
Review / Verification Agent
  -> Reads acceptance criteria and changed code
  -> Reports mismatches, bugs, missing tests, and unclear docs
```

---

## Documentation lifecycle

Use this lifecycle for medium or large changes:

1. **Idea captured**
   - Goes into `OPEN_QUESTIONS.md`, `FEATURES.md`, or `WORK_QUEUE.md`.

2. **Documentation design**
   - Documentation Designer turns the idea into intent, user flow, acceptance criteria, non-goals, and open questions.

3. **Decision pass**
   - User answers blocking questions.
   - Decisions move from `OPEN_QUESTIONS.md` into the relevant source-of-truth doc.
   - Important project choices are recorded in `DECISIONS.md`.

4. **Implementation-ready**
   - `FEATURE_LIFECYCLE.md` readiness criteria are satisfied.
   - A work item or feature section is marked `Ready for implementation`.
   - It has acceptance criteria, non-goals, traceability links, and verification notes.

5. **Implementation**
   - Implementation agent creates a checklist from the feature docs.
   - When git is established, implementation starts from the agreed development branch.
   - Implementation agent builds the scoped behavior.
   - Any design change is reflected back into docs.
   - Unit-test and verification follow-up work is added to `WORK_QUEUE.md`.

6. **Verification**
   - Tests, browser QA, or review compare behavior against docs.
   - Review / Verification Agent recommends whether the feature is `Verified`, `Done`, or still has gaps.

7. **Maintenance**
   - If code and docs drift, the docs sync/review process corrects one or the other.
   - Post-implementation reflection records what changed from the plan.

---

## Feature documentation structure

Feature docs should scale from compact sections in `FEATURES.md` to focused files when needed.

Use `FEATURE_LIFECYCLE.md` for feature statuses, readiness gates, traceability, definition of done, and post-implementation reflection.

Use focused feature docs when a feature needs:

- Multiple user flows.
- Multiple API endpoints.
- Non-trivial data model changes.
- Testing strategy.
- Significant open questions.
- Multiple implementation phases.

Suggested focused feature doc structure:

```md
# Feature: <Name>

## Intent

## User Flow

## Acceptance Criteria

## Non-Goals

## UX States

## Data Model

## API / Communication

## Testing

## Open Questions

## Implementation Status
Status: Draft | Ready for implementation | In progress | Done
Owner: <agent or human>
```

---

## Architecture documentation structure

Architecture docs should answer:

- What are the processes?
- What are the modules?
- What owns each type of data?
- How do modules communicate?
- What are the runtime modes?
- What assumptions must remain true?
- What trade-offs were considered?

When a decision is important and likely to be revisited, capture it in `DECISIONS.md`:

```md
## Decision: <Name>

Status: Proposed | Accepted | Superseded
Date: YYYY-MM-DD

### Context

### Decision

### Consequences

### Alternatives considered
```

If decision notes become numerous, move them into a future `docs/decisions/` folder.

---

## Testing documentation structure

Testing docs should connect tests to behavior, not just tools.

Expected testing layers:

| Layer | Purpose | Owner |
|-------|---------|-------|
| Unit tests | Pure business logic, validation, formatting, calculations | Unit Test Agent |
| Integration tests | Backend routes, persistence, API contracts | Test Strategy / Implementation Agent |
| Browser QA | User flows in the running app | Browser QA Agent |
| Manual verification | Local video behavior, ffmpeg, playback feel | Human + agent checklist |

Future `TESTING_STRATEGY.md` should define:

- Test runner and commands.
- What belongs in each layer.
- Fixture policy.
- How to avoid machine-specific tests.
- Required checks before marking work done.

---

## Documentation quality checklist

A doc is healthy when:

- It has a clear owner or source-of-truth role.
- It states whether content is draft, decided, or blocked.
- Acceptance criteria are testable.
- Open questions are explicit.
- It links to related docs instead of duplicating large sections.
- It names communication paths when frontend, backend, data, or agents interact.
- It has enough context for a future agent to continue the work.

---

## Near-term documentation roadmap

Recommended next docs to add:

1. `TESTING_STRATEGY.md` - full testing model across unit, integration, browser, and manual checks.
2. `API_CONTRACT.md` - backend endpoints and request/response shapes as they stabilize.
3. `DATA_MODEL.md` - SQLite tables and domain entities once persistence is implemented.
4. `DECISIONS.md` or `docs/decisions/` - accepted architecture and product decisions.
5. Focused feature specs for import, marker editing, lap list, and comparison as implementation begins.
