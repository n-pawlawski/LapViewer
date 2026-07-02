# Base Agent — LapViewer

Default context for any agent working on **this project**.

Read this file first, then `docs/agents/<folder>/BASE.md` for your work type.

**Platform:** `default-web-app` @ `0.2.0` — see `.agent-project.yaml`.

---

## Mission

Help build LapViewer while keeping the design record, implementation, and work queue aligned.

LapViewer is a local-first racing video app for registering GoPro footage by file path, marking lap boundaries, computing lap times, and comparing laps across sessions.

---

## Project documentation map

**Keep in sync:** `.agent-project.yaml` `paths` ↔ this table ↔ `docs/DOCUMENTATION_SYSTEM.md` source-of-truth table.

When you add, rename, or split a doc, update all three in the same change.

| Concern | Path | Primary agents |
|---------|------|----------------|
| Run commands & status | `README.md` | All |
| Product vision | `docs/PROJECT_OVERVIEW.md` | documentation, review |
| Doc system & SOT rules | `docs/DOCUMENTATION_SYSTEM.md` | documentation, architecture, review |
| Feature list & AC | `docs/FEATURES.md` | documentation, client, api, review |
| Feature lifecycle & done gates | `docs/FEATURE_LIFECYCLE.md` | documentation, review |
| UX / three forms | `docs/UI_FORMS.md` | documentation, client, browser-qa |
| Visual design | `docs/UI_DESIGN.md` | client, browser-qa |
| Intake / registration flow | `docs/INTAKE_FLOW.md` | documentation, client, api |
| Runtime architecture | `docs/ARCHITECTURE.md` | architecture, api, persistence, client |
| Technical trade-offs | `docs/TECHNICAL_APPROACH.md` | architecture |
| SQLite, `DATA_DIR`, cache | `docs/PERSISTENCE.md` | persistence, api |
| Video library model | `docs/VIDEO_LIBRARY.md` | persistence, api, client |
| Decisions | `docs/DECISIONS.md` | All (D-004 dev branch, D-005 Vitest, D-006 theme, D-012 git, D-013 typed WO) |
| Open questions | `docs/OPEN_QUESTIONS.md` | documentation, architecture |
| Process hygiene | `docs/PROCESS_HYGIENE.md` | All implementers, maintenance |
| Local dev | `docs/DEVELOPMENT.md` | All implementers, maintenance |
| Tooling gaps | `docs/PROCESS_TOOLING_GAPS.md` | maintenance, test-strategy |
| Collaboration rules | `docs/WORKING_AGREEMENT.md` | Base agent, documentation |
| Agent coordination | `docs/AGENT_WORKFLOW.md` | Base agent |
| Platform adoption notes | `docs/AGENT_PLATFORM_BLUEPRINT.md` | maintenance, coordinators |
| Testing strategy | `docs/TESTING_STRATEGY.md` | test-strategy, unit-test *(create when planned)* |
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
| `docs/agents/api/routes.md` | `api` *(create from template when API grows)* |
| `docs/agents/persistence/schema-notes.md` | `persistence` *(optional)* |
| `docs/agents/test-strategy/work-order-test-review.md` | `test-strategy` |

---

## Agent framework (docs/agents/)

| Doc | Purpose |
|-----|---------|
| [PICKUP.md](PICKUP.md) | Discover, filter, branch, close-out — **required for all agents** |
| [WORK_ORDERS.md](WORK_ORDERS.md) | Work types, dispatch |
| [WORK_QUEUE.md](WORK_QUEUE.md) | Global backlog |
| [PROJECT_STATE.md](PROJECT_STATE.md) | Test runner status, decision quick refs |
| [AGENT_LAYOUT.md](AGENT_LAYOUT.md) | Folder layout |
| [README.md](README.md) | Agent index |

---

## Read first (session start)

1. This file (doc map).
2. `README.md`
3. `docs/DOCUMENTATION_SYSTEM.md`
4. `docs/FEATURE_LIFECYCLE.md`
5. `docs/DECISIONS.md` — at least D-004, D-005, D-012, D-013, D-015
6. `docs/agents/PICKUP.md` + `docs/agents/WORK_ORDERS.md` when executing work items
7. `docs/agents/PROJECT_STATE.md` when running tests or verification

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
| `unit-test` | [unit-test/BASE.md](unit-test/BASE.md) | ⚠️ BASE complete; **`npm test` not installed yet** |
| `browser-qa` | [browser-qa/BASE.md](browser-qa/BASE.md) | ✅ Manual/browser evidence |
| `review` | [review/BASE.md](review/BASE.md) | ✅ AC vs build |
| `maintenance` | [maintenance/BASE.md](maintenance/BASE.md) | ✅ Tooling / CI / runner setup |
| `full-stack` | [implementation/BASE.md](implementation/BASE.md) | ✅ Exception path only |

Pack reference: `../agent-platform/packs/default-web-app/AGENT_READINESS.md` (local sibling repo).

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
