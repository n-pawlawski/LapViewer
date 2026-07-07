# Decisions

Project decision log for LapViewer.

Use this file for decisions that are likely to affect future implementation, architecture, testing, operations, or agent workflow. Small feature details can stay in feature specs; broader trade-offs belong here.

---

## Decision statuses

- `Proposed` - likely direction, not final.
- `Accepted` - current source of truth.
- `Superseded` - replaced by a later decision.
- `Deferred` - intentionally postponed.

---

## Decision template

```md
## D-XXX - <Decision title>

**Status:** Proposed | Accepted | Superseded | Deferred  
**Date:** YYYY-MM-DD  
**Owner:** User | Agent | Shared  
**Related docs:** `<path>`, `<path>`  

### Context

What problem or trade-off required a decision?

### Decision

What did we choose?

### Consequences

What becomes easier, harder, constrained, or required because of this?

### Alternatives considered

- ...

### Follow-up work

- ...
```

---

## Accepted decisions

### D-001 - Local-first Windows app

**Status:** Accepted  
**Date:** 2026-05-24  
**Owner:** Shared  
**Related docs:** `docs/ARCHITECTURE.md`, `docs/TECHNICAL_APPROACH.md`, `docs/OPEN_QUESTIONS.md`  

### Context

LapViewer works with large GoPro racing videos that already live on a local drive. Uploading or copying those videos into app-managed storage would add friction and duplicate large files.

### Decision

Build LapViewer as a local-first app running on the user's Windows PC.

### Consequences

- The backend can read local video files directly through configured paths.
- The app can work offline after dependencies are installed.
- Cloud hosting and multi-user access are deferred.
- Local path validation and persistence rules are important.

### Alternatives considered

- Hosted web app.
- Home server / NAS.
- Docker-first local deployment.

### Follow-up work

- Keep architecture docs clear about local and optional Docker runtime modes.

---

### D-002 - Register video paths instead of copying video files

**Status:** Accepted  
**Date:** 2026-05-24  
**Owner:** Shared  
**Related docs:** `docs/VIDEO_LIBRARY.md`, `docs/PERSISTENCE.md`, `docs/TECHNICAL_APPROACH.md`  

### Context

Original GoPro videos are large and already organized on a dedicated drive.

### Decision

The app registers videos by path. It does not copy original videos into the database or app storage by default.

### Consequences

- Import is fast because it creates metadata and pointers.
- Moving or deleting files outside the app creates missing-file states.
- The database stores metadata, markers, and paths, not video blobs.
- The backend must validate paths under `VIDEO_LIBRARY_ROOT`.

### Alternatives considered

- Browser upload and copy into app storage.
- Hybrid copy/reference model.
- Browser-only File API storage.

### Follow-up work

- Define relinking behavior for moved files.

---

### D-003 - Use docs and agent contexts as the coordination system

**Status:** Accepted  
**Date:** 2026-05-24  
**Owner:** Shared  
**Related docs:** `docs/AGENT_WORKFLOW.md`, `docs/agents/README.md`, `docs/FEATURE_LIFECYCLE.md`  

### Context

The project is moving toward specialized agents for documentation design, implementation, testing, architecture, and review.

### Decision

Use `docs/agents/` for role-specific agent context and `docs/agents/WORK_QUEUE.md` for scoped agent work items. Use `docs/FEATURE_LIFECYCLE.md` to keep feature work consistent.

### Consequences

- Agents have a predictable startup path.
- Work can be routed by role.
- Documentation becomes the shared source of truth.
- Queue hygiene matters as the project grows.

### Alternatives considered

- Keep all coordination in chat.
- Build a full agent control UI immediately.
- Use only ad hoc prompts without persistent context.

### Follow-up work

- Add Browser QA Agent context when UI flows become testable.

---

## Proposed decisions

### D-004 - Use `dev` as the development branch

**Status:** Accepted  
**Date:** 2026-05-24 (git initialized 2026-05-28)  
**Owner:** Shared  
**Related docs:** `docs/PROCESS_HYGIENE.md`, `docs/DEVELOPMENT.md`, `docs/PROCESS_TOOLING_GAPS.md`, `docs/agents/IMPLEMENTATION_AGENT.md`  

### Context

The Implementation Agent workflow needs a stable base branch for feature work once git is initialized.

### Decision

Use `dev` as the development branch and branch feature work from it (`feature/`*, `fix/`*, `chore/*`).

### Consequences

- Feature branches have a predictable base.
- `main` or `master` can be reserved later for release-ready code if needed.
- Agents branch from `dev` per `docs/PROCESS_HYGIENE.md`.

### Alternatives considered

- Use `main` directly for all work.
- Use no long-lived development branch.

### Follow-up work

- None (baseline commit completed 2026-05-28, `GIT-002`).

---

### D-005 - Use Vitest as the default unit test runner

**Status:** Proposed  
**Date:** 2026-05-24  
**Owner:** Shared  
**Related docs:** `docs/PROCESS_TOOLING_GAPS.md`, `docs/agents/UNIT_TEST_AGENT.md`  

### Context

The project is TypeScript-based and uses Vite on the client. A unit test runner is needed before feature work can reach full verification.

### Decision

Use Vitest as the default unit test runner unless a better project-specific reason appears.

### Consequences

- Unit tests can use a TypeScript-friendly runner.
- Client-side testing can align with Vite tooling.
- Additional dependencies are required and need approval before installation.

### Alternatives considered

- Node's built-in test runner.
- Jest.
- No unit test runner initially.

### Follow-up work

- Confirm dependency approval before installing Vitest.

---

### D-006 - Dark-only UI theme for v1

**Status:** Accepted  
**Date:** 2026-05-28  
**Owner:** User  
**Related docs:** `docs/UI_DESIGN.md`, `docs/OPEN_QUESTIONS.md`  

### Context

Theme support adds CSS variables, testing surface, and design decisions for two palettes.

### Decision

Ship v1 with a **dark-only** theme. No system preference toggle.

### Consequences

- Simpler styling and QA for the first UI slice.
- Light theme can be added later without blocking MVP.

### Alternatives considered

- System theme toggle.
- Light-only.

---

### D-007 - Comparison audio: muted v1; selectable source later

**Status:** Accepted  
**Date:** 2026-05-28  
**Owner:** User  
**Related docs:** `docs/UI_DESIGN.md`, `docs/OPEN_QUESTIONS.md`, `docs/UI_FORMS.md`  

### Context

Multiple video panes can produce overlapping audio. Users may want to hear one onboard mic at a time.

### Decision

**v1:** All comparison panes **muted by default**.  
**Deferred:** Control to **select which pane’s audio plays** (swap / master pane).

### Consequences

- Comparison implementation avoids audio routing in the first slice.
- UI can reserve space for a future “Audio: Pane A ▼” control (see Comparison sketch in `UI_FORMS.md`).

### Alternatives considered

- Single master pane audio in v1.
- Mix all tracks.

### Follow-up work

- Add backlog item when scheduling post-MVP comparison polish.

---

### D-008 - Shorter comparison laps freeze on last frame

**Status:** Accepted  
**Date:** 2026-05-28  
**Owner:** User  
**Related docs:** `docs/UI_DESIGN.md`, `docs/OPEN_QUESTIONS.md`  

### Context

When compared laps have different durations, playback must define end-of-sync behavior.

### Decision

When a lap segment ends, **freeze that pane on its last frame**. Other panes **continue playing** until they reach their own end.

### Consequences

- User can see how far “behind” longer laps still are after the shortest lap finishes.
- Transport may show elapsed time past the shortest lap’s end while some panes are frozen.

### Alternatives considered

- Stop all panes when the shortest lap ends.
- Loop shorter lap.
- Stop when the longest lap ends.

---

### D-009 - Cross-session lap selection in v1

**Status:** Accepted  
**Date:** 2026-05-28  
**Owner:** User  
**Related docs:** `docs/UI_FORMS.md`, `docs/FEATURES.md`, `docs/UI_DESIGN.md`  

### Context

Racers compare laps across different race days or camera files, not only laps within one MP4.

### Decision

**v1 includes cross-session comparison:** user can select laps from **different registered sessions** and open Comparison.

**v1 Data UX (confirmed):** Session list + lap list for the selected session, with **persistent lap selection** across session changes and a visible comparison selection list. **Not** in v1: a single unified all-laps grid.

### Consequences

- Data form and comparison APIs must key laps by `sessionId`, not assume one open video.
- UI must not clear lap checkboxes when the user selects another session.

### Alternatives considered

- Same-session only until a later phase.
- Unified all-laps table as the only cross-session UX.

### Follow-up work

- Confirm comparison selection strip UX in UI implementation (`UI-002` / `UI-005`).

---

### D-017 - Mock-first view & compare slice (VC-1–VC-4)

**Status:** Accepted  
**Date:** 2026-03-28  
**Owner:** Shared  
**Related docs:** `docs/features/VIEW_COMPARE_V1.md`, `docs/FEATURES.md`, `docs/UI_FORMS.md`, `docs/CONTINUATION.md`  

### Context

The product goal is to validate Data browsing and 2-up Compare UX before investing in SQLite, intake, and marker APIs. The codebase is still a single-page demo player.

### Decision

Implement **view & compare laps** in phases **VC-1–VC-4** using **mock sessions/laps** and the existing **demo video stream**. Real persistence (VC-5 / F6.1) follows in a separate work order.

**First compare build:** exactly **2** laps (F5.3 four-up later).

### Consequences

- Client ships mock data module before sessions API exists.
- Compare can use fake `startSeconds`/`endSeconds` on the demo clip.
- Intake and F1.x are not blockers for the compare loop.
- Acceptance criteria live in `docs/features/VIEW_COMPARE_V1.md`.

### Alternatives considered

- Build SQLite + intake first, then compare.
- Static shell only (WO-ui-shell) without playback sync.

### Follow-up work

- Implement VC-1–VC-4 on branch `feature/view-compare-v1`.
- WO for VC-5 persistence when compare UX is approved.

---

### D-013 - Typed feature work orders and layer agents

**Status:** Accepted  
**Date:** 2026-05-28  
**Owner:** User  
**Related docs:** `docs/agents/WORK_ORDERS.md`, `docs/work-orders/`, `docs/agents/client/`, `docs/agents/api/`, `docs/agents/persistence/`  

### Context

The user wants features broken into work items by discipline (database, server, frontend, tests, etc.) and agents started per type to complete all Ready work of that type, reading a shared base context plus a specialist agent doc.

### Decision

- Feature implementation plans live in **`docs/work-orders/WO-*.md`** with tasks tagged **Work type**.
- **Layer agents:** `persistence`, `api`, `client` (plus existing `docs`, `unit-test`, `review`, `architecture`, `maintenance`).
- **Dispatch:** one prompt per work type to process **all** `Ready` items of that type (respecting `Blocked by`).
- **Global queue** (`WORK_QUEUE.md`) remains for tooling; feature work prefers work orders.
- **Implementation Agent** is for `full-stack` / legacy only.

### Consequences

- New features should not use generic `IMPL-*` items unless intentionally full-stack.
- User runs Client Agent, then API Agent, etc., or parallelizes only when dependencies allow.
- Work orders link to product docs; agents do not re-derive scope from chat.

### Alternatives considered

- Single Implementation Agent for all code.
- Autonomous background queue worker (deferred; manual dispatch for now).

---

### D-012 - Agents manage git

**Status:** Accepted  
**Date:** 2026-05-28  
**Owner:** User  
**Related docs:** `docs/PROCESS_HYGIENE.md`, `docs/WORKING_AGREEMENT.md`, `docs/agents/IMPLEMENTATION_AGENT.md`, `docs/agents/PROJECT_MAINTENANCE_AGENT.md`  

### Context

The user wants agents to run git commands and manage branching/commits as part of normal workflow, not wait for per-commit approval.

### Decision

**Agents may manage git** for LapViewer: branch, stage, commit, merge, status, diff, and log as part of completing work items.

**Agents may push** to an existing remote on feature branches and when completing reviewed work; **ask first** before adding a new remote or changing remote URL.

**Still forbidden without explicit user request:**

- `git config` changes (global or local)
- Force-push to `dev`, `main`, or `master`
- `--no-verify` / skipping hooks
- Committing secrets (`.env`, credentials)

**Commit practice:**

- One or more focused commits per work item on a feature branch.
- Merge to `dev` when the work item is verified (or leave on branch for user PR preference).
- Use clear commit messages (what + why).

### Consequences

- Implementation and Maintenance agents commit after `npm run check` passes.
- Base Agent and Cursor rule no longer require approval for each commit.
- User should set `user.name` / `user.email` locally for meaningful authorship (agents may use env vars only if unset).

### Alternatives considered

- User-only commits.
- Agent commits only when user says “commit” each time.

---

### D-011 - Process hygiene as a first-class project standard

**Status:** Accepted  
**Date:** 2026-05-28  
**Owner:** User  
**Related docs:** `docs/PROCESS_HYGIENE.md`, `docs/DEVELOPMENT.md`, `docs/FEATURE_LIFECYCLE.md`, `docs/AGENT_WORKFLOW.md`  

### Context

The user wants LapViewer to practice workflows that scale to larger projects, not only ship features ad hoc.

### Decision

Treat **process hygiene** as a core project goal: git on `dev`, work queue gates, `npm run check` before done, documented branching, review passes, and a staged roadmap for tests/lint/CI.

### Consequences

- Setup and maintenance work (git, scripts, CI file) are prioritized alongside product UI.
- Agents follow `docs/PROCESS_HYGIENE.md` in addition to role-specific contexts.
- New contributors (human or agent) have a single hygiene doc to read.

### Alternatives considered

- Implement UI first and add process later.
- Minimal docs-only process without git or verification scripts.

### Follow-up work

- Approve baseline git commit (`GIT-002`).
- Approve Vitest install when ready for unit tests (`UT-001`).

---

### D-016 - Separate agent-platform repo; per-project agent workspace

**Status:** Accepted  
**Date:** 2026-05-28  
**Owner:** User  
**Related docs:** `docs/AGENT_PLATFORM_BLUEPRINT.md`, `.agent-project.yaml`  

### Context

The agent workflow should be reusable across projects. LapViewer should be the first product built with it, not the container for the generic framework.

### Decision

1. Create a **separate repository** for the agent platform (generic `core/` + versioned **packs** such as `default-web-app` with base `agents/*/BASE.md`).
2. Each **project repo** keeps all project-specific docs and code, plus an **agent workspace** (LapViewer: `docs/agents/`, `docs/work-orders/`).
3. Each project has a root **`.agent-project.yaml`** manifest (paths, pack id/version, verify commands).
4. Platform-specific details always live **inside the project repo**; the platform repo holds only generic templates and framework docs.
5. LapViewer is the **first consumer**; extraction of generic files into the platform repo is incremental (see blueprint migration plan).

### Consequences

- Iterating the agent system does not require editing LapViewer product code.
- New projects copy a pack into their workspace and add their own product docs.
- Future tooling in the platform repo may scaffold work orders against other repo paths.

### Follow-up work

- Create `agent-platform` GitHub repo and perform extraction per `AGENT_PLATFORM_BLUEPRINT.md`.

---

### D-015 - Test failures: implementer fixes own regressions; test-strategy queues new coverage

**Status:** Accepted  
**Date:** 2026-05-28  
**Owner:** User  
**Related docs:** `docs/agents/test-strategy/BASE.md`, `docs/agents/client/BASE.md`, `docs/agents/api/BASE.md`, `docs/agents/persistence/BASE.md`  

### Context

Layer agents should run the full test suite before marking work `Done`. When tests fail, we need a clear owner.

### Decision

1. **Implementers** (`persistence`, `api`, `client`, `full-stack`) run **`npm test` (full suite)** when a runner exists and must not mark `Done` with failures they introduced.
2. **Implementer fixes** tests on the same branch when the failure is a direct result of their change and the fix is straightforward (updated assertions, renamed symbols, intentional behavior change).
3. **Implementer blocks** and adds a `unit-test` item when test design is unclear or out of scope.
4. **Test Strategy** runs a **post–work-order review** (diff, gap analysis) and queues `unit-test` items for new coverage; does not replace implementer fixing obvious regressions.
5. **Review** items may be blocked on `test-strategy` review completing on the work order.

### Consequences

- Test Strategy is a dedicated SME with work type `test-strategy`.
- Work order template includes `WO-<name>-TS` before `review`.

---

### D-014 - Agent folders with BASE checklist and auxiliary docs

**Status:** Accepted  
**Date:** 2026-05-28  
**Owner:** User  
**Related docs:** `docs/agents/AGENT_LAYOUT.md`, `docs/agents/client/BASE.md`  

### Context

The user wants each agent type in its own directory with a mandatory checklist in `BASE.md` and room for auxiliary docs (e.g. client page flows).

### Decision

- Specialist agents live under `docs/agents/<folder>/` with required **`BASE.md`** (includes **Agent checklist (required)**).
- Optional auxiliary `.md` files in the same folder; work items link them via **Auxiliary context**.
- Dispatch reads `docs/agents/<folder>/BASE.md`, not flat `*_AGENT.md` files.

### Consequences

- Client agent checklist includes: work order → client docs → design → implement → frontend tests → verify → done.
- New agents copy `client/` or `TEMPLATES.md` folder template.

---

### D-018 - Dev-only seeded account for local development

**Status:** Accepted  
**Date:** 2026-07-05  
**Owner:** User  
**Related docs:** `docs/features/USERS_V1.md`, `docs/ROADMAP.md`, `docs/DEVELOPMENT.md`

### Context

Phase 1 introduces users and session ownership. Local development needs a frictionless way to work without building real signup yet.

### Decision

1. A fixed dev user (`dev@lapviewer.local`, **Dev Driver**, UUID `00000000-0000-4000-8000-000000000001`) may be seeded **only** when `NODE_ENV=development` or `LAPVIEWER_DEV_USER=1`.
2. `npm start` without dev flags does **not** seed the dev user; unauthenticated API calls return 401.
3. Dev login is via an explicit **Continue as Dev** button — not silent auto-login.
4. Hosted/production environments never auto-create the dev user.
5. Sessions and tracks are scoped per authenticated user; tracks use `UNIQUE(userId, name)`.

### Consequences

- Existing local databases backfill orphan rows to the dev user in dev mode only.
- Phase 4 adds real signup/login before deploy.

---

### D-010 - Intake registers session; auto-save on change; no Done button

**Status:** Accepted  
**Date:** 2026-05-28  
**Owner:** User  
**Related docs:** `docs/UI_FORMS.md`, `docs/INTAKE_FLOW.md`, `docs/UI_DESIGN.md`  

### Context

Intake must leave the library in a state where new races are discoverable on the Data form. Users should not need a separate “finish” action to persist work.

### Decision

1. **Register** persists a **session** (race/video) to the library so it appears on Data.
2. **While on Intake**, metadata and markers **auto-save whenever the user adds, removes, or edits** something (markers or metadata fields), with visible save state (`Saving` / `Saved` / `Error`).
3. **No Done button** on Intake. Leave via global nav (e.g. **Data**). When opening Data from Intake context, **select** the session being edited when practical (URL or nav state).
4. **Zero markers** is fine after register — session still appears on Data.

### Consequences

- Intake header shows save state only — no `Save` / `Done` actions required for v1.
- Data form is the catalog hub; Intake is a focused editor you enter and exit freely.
- Implementation must debounce or batch saves if marker drag produces many updates.

### Alternatives considered

- Explicit Save and Done buttons.
- Done required before session appears on Data.
- Block leaving Intake until at least one marker exists.

---

### D-019 - Reference-lap vision stack: Node first

**Status:** Accepted  
**Date:** 2026-07-06  
**Owner:** Design pass  
**Related docs:** `docs/features/GOPRO_LAP_SPLIT_DETECTION.md`, `docs/ARCHITECTURE.md`, D-024 (spike gate)

### Context

Phase 3B reference-lap matching needs frame extraction and image fingerprints. The generic GoPro design suggested a Python/OpenCV worker.

### Decision

Use **Node + ffmpeg + sharp** for the progress-curve spike and initial M3-LV implementation. Python/OpenCV is opt-in only if the spike fails on Node-only fingerprints (requires explicit approval).

### Consequences

- Spike script lives under `server/scripts/` alongside existing vision spikes.
- No new process model until Node path is exhausted.

---

### D-020 - Reference profile storage: `track_reference_profiles`

**Status:** Accepted  
**Date:** 2026-07-06  
**Owner:** Design pass  
**Related docs:** `docs/features/GOPRO_LAP_SPLIT_DETECTION.md`, `docs/PERSISTENCE.md`

### Context

Reference-lap metadata (bounds, crop, tunables) must persist per track without overloading `tracks` or conflating with `detection_profiles` (3A ROI-NCC).

### Decision

Add **`track_reference_profiles`** (1:1 with `tracks`, CASCADE delete) and **`track_reference_points`** for sampled fingerprints. Extend **`track_splits`** with nullable **`progress REAL`**.

### Consequences

- M2-LV persistence work order adds additive migrations only.
- `detection_profiles` remains the 3A lap-start path until convergence (see design §Relationship to Phase 3A).

---

### D-021 - Split canonical form: progress on track, timestamps on markers

**Status:** Accepted  
**Date:** 2026-07-06  
**Owner:** Design pass  
**Related docs:** `docs/features/GOPRO_LAP_SPLIT_DETECTION.md`, `docs/OPEN_QUESTIONS.md` §2.1

### Context

Splits must be reusable across sessions while Data/Compare already consume timestamp-based markers.

### Decision

**`track_splits.progress`** (0..1 on reference lap) is the canonical split definition. Session **`markers`** (`kind: split`) store detected/confirmed times. Data and Compare keep reading markers; no parallel lap-results table in v1.

### Consequences

- Reference lap editor must write progress when splits are marked.
- Cross-session compare requires aligned `splitIndex` slots on the same track.

---

### D-022 - Phase 3 sequencing: AD-5 before M3-LV build

**Status:** Accepted  
**Date:** 2026-07-06  
**Owner:** Design pass  
**Related docs:** `docs/ROADMAP.md`, `docs/features/AUTO_LAP_DETECTION_V1.md`, `docs/features/GOPRO_LAP_SPLIT_DETECTION.md`

### Context

Two detection paths coexist: 3A ROI-NCC (delivered) and 3B reference-lap progress (designed).

### Decision

**Default:** finish **AD-5** (NCC split keyframes) before M3-LV implementation work orders. The **progress-curve spike** ([WO-gopro-progress-spike](work-orders/WO-gopro-progress-spike.md)) may run in parallel if capacity allows.

### Consequences

- ROADMAP Phase 3B implementation blocked until spike go-gate passes.
- AD-5 split templates may bootstrap `track_reference_points` when a reference profile exists (design path B).

---

### D-023 - Detection output persistence: proposals in job, accept to markers

**Status:** Accepted  
**Date:** 2026-07-06  
**Owner:** Design pass  
**Related docs:** `docs/features/GOPRO_LAP_SPLIT_DETECTION.md`, D-010

### Context

3B must not silently insert markers; must align with 3A review flow and Intake auto-save.

### Decision

Progress-matching jobs return **proposals only** (plus curve samples and confidence). Accepting a proposal uses existing marker create/PATCH APIs — same pattern as AD-3.

### Consequences

- No `LapResult` / `manual_corrections` tables in v1.
- Job endpoints mirror `/api/detect-laps/*` shape.

---

### D-024 - Compare split deltas before Data lap columns

**Status:** Accepted  
**Date:** 2026-07-06  
**Owner:** Design pass  
**Related docs:** `docs/features/GOPRO_LAP_SPLIT_DETECTION.md`, `docs/features/VIEW_COMPARE_V1.md`, D-009

### Context

M6-LV adds sector timing comparison. Compare already supports split sync points; Data lap table does not show sector columns.

### Decision

Ship **Compare split delta table** first (M6-LV). Defer per-sector columns on the Data lap table to a later slice.

### Consequences

- F8.3 acceptance criteria target Compare UI only.
- Reuse `client/src/utils/splits.ts` for segment math.

---

### D-025 - `dev` integration, `master` deploy branch

**Status:** Accepted  
**Date:** 2026-07-06  
**Owner:** Shared  
**Related docs:** `docs/PROCESS_HYGIENE.md`, `docs/DEPLOYMENT.md`, `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`

### Context

CI and deploy workflows target `master`, but integration work lives on `dev`. A clear promotion rule avoids deploying every commit.

### Decision

- **`dev`** — integration branch; merge verified feature work here.
- **`master`** — deployable release snapshots; merge from `dev` when check, test, and smoke pass.
- GitHub Actions **CI** on `dev` and `master`; **deploy** on `master` push only.

### Consequences

- Agents merge features to `dev` first; promote to `master` for AWS deploy.
- Tag releases optionally from `master`.

### Alternatives considered

- Deploy from `dev` directly — rejected (no stable deploy pointer).
- `main` instead of `master` — CI supports both; project uses `master` per existing workflow.

---

### D-026 - S3 as system of record for uploaded originals

**Status:** Accepted  
**Date:** 2026-07-06  
**Owner:** Shared  
**Related docs:** `docs/DEPLOYMENT.md`, `server/src/services/objectStorage.ts`, `docs/PERSISTENCE.md`

### Context

Public SaaS cannot store every user's GoPro files on ECS task disk. Local path intake remains for Windows dev.

### Decision

- Production: **`STORAGE_BACKEND=s3`** with presigned PUT upload and S3 Range GET streaming.
- Local dev: **`local_path`** (Windows path picker) unchanged.
- Session rows store `storageKind`, `objectKey`, `uploadStatus`.
- Layout: `users/{userId}/sessions/{sessionId}/{fileName}`.

### Consequences

- Hybrid env-controlled storage; not separate codebases.
- ECS task role needs S3 read/write; CloudFront optional later for egress.

### Alternatives considered

- EBS/EFS only — rejected for scale and multi-instance delivery.
- Upload through app server — rejected for large files and task disk limits.

---

### D-027 - Postgres (RDS) for cloud multi-tenant data

**Status:** Accepted  
**Date:** 2026-07-06  
**Owner:** Shared  
**Related docs:** `docs/PERSISTENCE.md`, `infra/postgres/schema.sql`, `docs/DEPLOYMENT.md`

### Context

SQLite is fine for local single-user dev. Multi-tenant SaaS on ECS needs a shared database with concurrent writers.

### Decision

- **Production:** RDS Postgres via `DATABASE_URL`; schema in `infra/postgres/schema.sql`.
- **Local default:** SQLite in `DATA_DIR` when `DATABASE_URL` is unset.
- Sync service layer uses a Postgres client wrapper to avoid rewriting all queries at once.

### Consequences

- Greenfield cloud deploy uses Postgres; optional SQLite → export migration for existing local data later.
- Do not run SQLite on EFS for multi-writer SaaS.

### Alternatives considered

- SQLite on EFS — rejected (locking, corruption risk).
- Full ORM rewrite — deferred; mirror schema with existing SQL first.

---

### D-028 - Browser upload + object storage as sole intake for new sessions

**Status:** Accepted  
**Date:** 2026-07-07  
**Owner:** Shared  
**Related docs:** `docs/INTAKE_FLOW.md`, `docs/DEPLOYMENT.md`, `docs/work-orders/WO-unified-upload.md`, `server/src/services/sessionMedia.ts`

### Context

Path-based intake ([D-002](DECISIONS.md)) breaks in containers: Docker cannot use the Windows file picker, and ECS has no user drive to mount. Production S3 upload ([D-026](DECISIONS.md)) worked for playback but blocked ffmpeg processing until objects are materialized locally.

### Decision

- **New sessions:** browser file picker → presigned PUT → object storage (`storageKind=s3`, `objectKey`).
- **All environments** use `STORAGE_BACKEND=s3` with the same API; local/Docker use MinIO (`AWS_ENDPOINT_URL`), production uses AWS S3.
- **Legacy** `local_path` sessions remain readable and processable; `POST /api/sessions` path registration is rejected when S3 is enabled.
- ffmpeg jobs resolve media via `resolveSessionMediaInput()` (lazy cache at `DATA_DIR/cache/{sessionId}/original.mp4`).

### Consequences

- Intake UI is upload-only for new sessions.
- Docker Compose includes MinIO; `VIDEO_LIBRARY_ROOT` bind mount is no longer required for intake.
- Phase 3B reference-lap work assumes object storage.

### Alternatives considered

- Keep path intake for native Windows dev — rejected (three intake modes, container parity gap).
- ffmpeg over HTTP Range without materialization — deferred (materialize first for reliability).

---

## Superseded decisions

| ID | Superseded by | Note |
|----|---------------|------|
| D-002 (path-only intake for new sessions) | D-028 | Path registration deprecated for new sessions; legacy rows supported |

---

## Deferred decisions

No deferred decisions yet.