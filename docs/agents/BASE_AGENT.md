# Base Agent — LapViewer

Default context for any agent working on **this project**.

Read this file first, then `docs/agents/<folder>/BASE.md` for your work type.

LapViewer agent docs are **self-contained** in this repo (`docs/agents/`, `docs/work-orders/`). No external agent-platform dependency ([D-032](../DECISIONS.md)).

---

## Mission

Help build LapViewer while keeping the design record, implementation, and work queue aligned.

LapViewer is a racing video app for uploading GoPro footage, marking lap boundaries, computing lap times, comparing laps across sessions, and sharing sessions with other accounts.

---

## Project documentation map

**Keep in sync:** `.agent-project.yaml` `paths` ↔ this table ↔ `docs/DOCUMENTATION_SYSTEM.md` source-of-truth table.

When you add, rename, or split a doc, update all three in the same change.

| Concern | Path | Primary agents |
|---------|------|----------------|
| Run commands & status | `README.md` | All |
| Product vision | `docs/PROJECT_OVERVIEW.md` | documentation, review |
| Product roadmap | `docs/ROADMAP.md` | documentation, architecture, review |
| Doc system & SOT rules | `docs/DOCUMENTATION_SYSTEM.md` | documentation, architecture, review |
| Feature list & AC | `docs/FEATURES.md` | documentation, client, api, review |
| Users & dev account v1 | `docs/features/USERS_V1.md` | documentation, persistence, api, client |
| Public session sharing v1 | `docs/features/PUBLIC_SESSIONS_V1.md` | documentation, persistence, api, client |
| Data form v2 refactor | `docs/features/DATA_FORM_V2.md` | documentation, client |
| Assisted lap detection v1 | `docs/features/AUTO_LAP_DETECTION_V1.md` | documentation, architecture, api, persistence, client |
| Reference-lap lap & split detection | `docs/features/GOPRO_LAP_SPLIT_DETECTION.md` | documentation, architecture, api, persistence, client |
| Feature lifecycle & done gates | `docs/FEATURE_LIFECYCLE.md` | documentation, review |
| UX / three forms | `docs/UI_FORMS.md` | documentation, client, browser-qa |
| Visual design | `docs/UI_DESIGN.md` | client, browser-qa |
| Intake / registration flow | `docs/INTAKE_FLOW.md` | documentation, client, api |
| Runtime architecture | `docs/ARCHITECTURE.md` | architecture, api, persistence, client |
| Technical trade-offs | `docs/TECHNICAL_APPROACH.md` | architecture |
| SQLite, `DATA_DIR`, cache | `docs/PERSISTENCE.md` | persistence, api |
| Video library model | `docs/VIDEO_LIBRARY.md` | persistence, api, client |
| Decisions | `docs/DECISIONS.md` | All (D-004 dev branch, D-005 Vitest, D-006 theme, D-012 git, D-013 typed WO, D-028 upload, D-030 public sessions) |
| Open questions | `docs/OPEN_QUESTIONS.md` | documentation, architecture |
| Process hygiene | `docs/PROCESS_HYGIENE.md` | All implementers, maintenance |
| Local dev | `docs/DEVELOPMENT.md` | All implementers, maintenance |
| Deployment & AWS | `docs/DEPLOYMENT.md` | architecture, api, maintenance |
| Agent ops (prod) | `docs/agents/operations/RUNBOOK.md` | maintenance, api — read before touching prod |
| Tooling gaps | `docs/PROCESS_TOOLING_GAPS.md` | maintenance, test-strategy |
| Collaboration rules | `docs/WORKING_AGREEMENT.md` | Base agent, documentation |
| Agent coordination | `docs/AGENT_WORKFLOW.md` | Base agent |
| Testing strategy | `docs/TESTING_STRATEGY.md` | test-strategy, unit-test |
| Feature implementation | `docs/work-orders/WO-*.md` | persistence, api, client, test-strategy, review |
| Global agent queue | `docs/agents/WORK_QUEUE.md` | maintenance, unit-test, tooling |

### Code roots

| Area | Path | Work type |
|------|------|-----------|
| Frontend | `client/` | `client` |
| Backend | `server/` | `api`, `persistence` |

### Agent auxiliary docs (deep context)

| Path | Work types |
|------|------------|
| `docs/agents/client/overview.md` | `client` |
| `docs/agents/client/page-flows.md` | `client`, `browser-qa` |
| `docs/agents/api/routes.md` | `api` |
| `docs/agents/persistence/schema-notes.md` | `persistence` |
| `docs/agents/test-strategy/work-order-test-review.md` | `test-strategy` |

---

## Agent framework (docs/agents/)

| Doc / skill | Purpose |
|-------------|---------|
| `lapviewer-pickup` skill | Process Ready work (orchestrates PICKUP.md) |
| `lapviewer-feature` skill | Idea → ready work order |
| `lapviewer-commit` skill | Scoped commit from `dev` (multi-agent WIP) |
| `lapviewer-promote` skill | Merge / release |
| [PICKUP.md](PICKUP.md) | Discover, filter, branch, close-out — **authoritative loop** |
| [WORK_ORDERS.md](WORK_ORDERS.md) | Work types, dispatch |
| [WORK_QUEUE.md](WORK_QUEUE.md) | Global backlog |
| [PROJECT_STATE.md](PROJECT_STATE.md) | Durable quick refs; live facts in `PROJECT_STATE.generated.md` |
| [AGENT_LAYOUT.md](AGENT_LAYOUT.md) | Folder layout |
| [README.md](README.md) | Agent index |

---

## Read first (session start)

1. This file (doc map).
2. `README.md`
3. `docs/DOCUMENTATION_SYSTEM.md`
4. `docs/FEATURE_LIFECYCLE.md`
5. `docs/DECISIONS.md` — at least D-004, D-005, D-012, D-013, D-015, D-032
6. Invoke `lapviewer-pickup` (or read `PICKUP.md` + `WORK_ORDERS.md`) when executing work items
7. `docs/agents/PROJECT_STATE.md` or generated snapshot when verifying or checking git state

Then read rows from the **documentation map** for your work type.

---

## Agent → workflow entry

| Work type | BASE | End-to-end workflow |
|-----------|------|---------------------|
| `docs` | [documentation/BASE.md](documentation/BASE.md) | ✅ Spec, gate, create WO |
| `architecture` | [architecture/BASE.md](architecture/BASE.md) | ✅ Design + handoff items |
| `persistence` | [persistence/BASE.md](persistence/BASE.md) | ✅ PICKUP + DB layer |
| `api` | [api/BASE.md](api/BASE.md) | ✅ PICKUP + routes (after persistence) |
| `client` | [client/BASE.md](client/BASE.md) | ✅ PICKUP + UI (after api) |
| `test-strategy` | [test-strategy/BASE.md](test-strategy/BASE.md) | ✅ §A plan / §B post-WO review |
| `unit-test` | [unit-test/BASE.md](unit-test/BASE.md) | ✅ PICKUP + `npm test` |
| `browser-qa` | [browser-qa/BASE.md](browser-qa/BASE.md) | ✅ Manual/browser evidence |
| `review` | [review/BASE.md](review/BASE.md) | ✅ AC vs build |
| `maintenance` | [maintenance/BASE.md](maintenance/BASE.md) | ✅ Tooling / CI / runner setup |
| `full-stack` | [implementation/BASE.md](implementation/BASE.md) | ✅ Exception path only |

---

## Process tiers (right-size the ceremony)

LapViewer is currently built by a **solo maintainer + AI agents**, not parallel agent
waves. Match the process weight to the work so the docs stay a help, not overhead.

**Tier 1 — always (load-bearing).** These earn their keep every session:

- `docs/DECISIONS.md` — record non-obvious trade-offs here, not in chat.
- Feature specs (`docs/features/*`, `docs/FEATURES.md`) — design + testable AC before building.
- This doc's **documentation map** — orientation for any new session.
- `feature/*` branch from `dev`; run `verify.check` (and `verify.test` when relevant) before done.

**Tier 2 — only for genuinely multi-layer features (optional).** Use when a feature
spans persistence + api + client and benefits from an explicit breakdown:

- A work order in `docs/work-orders/WO-*.md` as a **lightweight checklist**.
- Typed-agent dispatch, per-item `Status`/`Blocked by` state machine, session-report tables.

Do **not** fake Tier 2 ceremony for small or single-layer changes. If a work order's
per-item statuses drift from reality, reconcile the feature status and move on rather
than back-filling every item. Multi-agent wave scheduling is preserved in
`docs/agents/archive/` for reference but is **not** the default workflow.

---

## Invokable skills (`.cursor/skills/`)

On-demand procedures — load when relevant; not always-on context. Each skill is a thin orchestrator pointing at the source-of-truth docs below.

| Skill | Use when |
|-------|----------|
| `lapviewer-feature` | Idea → feature spec → readiness gate → work order |
| `lapviewer-pickup` | Discover and process Ready work items by work type |
| `lapviewer-commit` | User requests commit / push — scoped commit on `feature/*`, return to `dev` |
| `lapviewer-promote` | Merge feature/chore branches to `dev`; promote `dev` → `master` |

For new feature design, prefer `lapviewer-feature` over reading the full lifecycle docs cold. For implementation, prefer `lapviewer-pickup` over re-deriving the loop from `PICKUP.md` alone.

---

## Operating rules

- Do not implement `Draft` work items without approval.
- Dispatch by **work type**; follow [PICKUP.md](PICKUP.md) for every item.
- Feature work: `docs/work-orders/`. Tooling: `docs/agents/WORK_QUEUE.md`.
- Git per [D-012](../DECISIONS.md). Never change `git config` or force-push protected branches.
- Verification: `.agent-project.yaml` `verify` (`check` always; `test` when runner exists).
- No new dependencies, data deletion, or deploy without approval.

---

## Standard prompt

```text
Act as the LapViewer <Role> Agent.
Read docs/agents/BASE_AGENT.md, docs/agents/<folder>/BASE.md, docs/agents/PICKUP.md.
Process Ready work for your work type per PICKUP.md.
```

---

## Completion standard

- Work matches docs or docs updated.
- `verify.check` (and `verify.test` when available) for code changes.
- Work-order / queue status updated.
- Report per [PICKUP.md](PICKUP.md) §4.
