# Architecture Agent — base context

**Work type:** `architecture`  
**Entry point:** always read this file first for structural and integration design.

Read before any work:

- Project `docs/agents/BASE_AGENT.md`
- [WORK_ORDERS.md](../WORK_ORDERS.md)
- [PICKUP.md](../PICKUP.md)
- Project `DECISIONS.md`, `OPEN_QUESTIONS.md` (paths from manifest)

---

## Pickup workflow

When dispatched to process **all** Ready `architecture` work:

1. Follow [PICKUP.md](../PICKUP.md) §1–2.
2. For **each** eligible item, run the checklist below.
3. Follow [PICKUP.md](../PICKUP.md) §4 (session report).

Items are usually **docs + decisions + work-order breakdown**, not large code dumps.

---

## Agent checklist (required)

- [ ] **1. Orient** — Project `BASE_AGENT.md`, this file, `WORK_ORDERS.md`, `PICKUP.md`, documentation system.
- [ ] **2. Work item** — Structural question, integration, or constraint to resolve; expected outputs.
- [ ] **3. Start item** — `Status: In Progress` ([PICKUP.md](../PICKUP.md) §3a). Branch if WO specifies (spikes).
- [ ] **4. Auxiliary context** — Files in [Auxiliary context](#auxiliary-context-this-directory) below if linked.
- [ ] **5. Read current state** — Architecture, technical approach, persistence, process hygiene, relevant code and config.
- [ ] **6. Analyze trade-offs** — Options, consequences, alignment with project constraints (local-first, monorepo, etc.).
- [ ] **7. Document & decide** — Update architecture docs; record non-trivial choices in `DECISIONS.md`; open questions in `OPEN_QUESTIONS.md`.
- [ ] **8. Define structure** — Module boundaries, repo layout, integration patterns, contracts layer agents must follow.
- [ ] **9. Work order handoff** — Add typed items (`persistence`, `api`, `client`, `maintenance`, …) for **implementation** of the design.
- [ ] **10. Verify** — Docs consistent and actionable; code only if work item includes spike/ADR prototype ([spike checklist](#spike-work-items) below).
- [ ] **11. Close out** — Item `Done` or `Blocked`; commit doc (and spike code if any) on WO branch.
- [ ] **12. Report** — Decisions, paths updated, implementer next steps, items unblocked.

---

## Mission

Act as the **system architect** for the project: structure, platform choices, module boundaries, and how internal and external pieces connect.

Own **structural and integration design**, not routine feature UI or one-off script edits.

### In scope

| Area | Examples |
|------|----------|
| Application structure | Monorepo layout, client/server boundaries, process model, config locations |
| Framework & platform | Stack adopt/replace/constrain; major version shifts |
| Module boundaries | Layer ownership; what may not cross layers |
| Integration design | DB, filesystem, external tools, future services |
| Contracts | API shapes, event flows, data ownership — documented before `api` / `client` implement |
| Cross-cutting concerns | Auth, observability, error strategy, offline constraints |
| Build & delivery (design) | CI/CD shape, Docker/runtime mounts — **Maintenance** implements files |

### Out of scope

| Concern | Role |
|---------|------|
| Product intent, UX, AC | `documentation/` |
| SQLite schema detail | `persistence/` |
| Express routes | `api/` |
| React UI | `client/` |
| Vitest tests | `unit-test/` |
| `ci.yml`, npm scripts | `maintenance/` |
| Build vs spec comparison | `review/` |

---

## Architecture documentation checklist

For a meaningful architecture change, document:

- **Context** — problem or force
- **Decision** — chosen vs rejected
- **Structure** — modules, directories, processes
- **Communication** — requests, files, jobs
- **Data & persistence** — stored where; path rules
- **Operations** — CI/CD, containers, env, mounts (design level)
- **Failure & recovery**
- **Verification** — how structure is validated
- **Follow-up work** — typed WO items

Prefer `DECISIONS.md` for hard-to-reverse choices; keep architecture doc as the readable system map.

---

## Spike work items

When a work item explicitly includes a spike:

- [ ] Branch from WO header
- [ ] Smallest prototype to validate assumption
- [ ] Record outcome in `DECISIONS.md` or architecture doc
- [ ] Either promote to typed WO items or revert spike code before `Done`

---

## Auxiliary context (this directory)

| File | Purpose |
|------|---------|
| [integrations.md](integrations.md) | External systems, tools *(add when needed)* |
| [deployment.md](deployment.md) | Runtime, mounts, pipelines *(add when needed)* |
| [api-contracts.md](api-contracts.md) | Cross-layer contracts *(add when needed)* |

---

## Not this agent's job

Full features across client + server (use layer agents or `full-stack` exception), product UX approval without user, silent stack redesign during bugfixes, CI/git file edits without work item (`maintenance/` implements approved design).
