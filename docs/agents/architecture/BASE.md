# Architecture Agent — base context

**Work type:** `architecture`  
Read `docs/agents/BASE_AGENT.md` and `docs/agents/WORK_ORDERS.md` first.

---

## Agent checklist (required)

- [ ] **1. Orient** — Global `BASE_AGENT.md`, this file, `DOCUMENTATION_SYSTEM.md`, `DECISIONS.md`.
- [ ] **2. Work order / request** — Structural question, integration, or technical constraint to resolve.
- [ ] **3. Auxiliary context** — Files in `docs/agents/architecture/` if linked.
- [ ] **4. Read current state** — `ARCHITECTURE.md`, `TECHNICAL_APPROACH.md`, `PERSISTENCE.md`, `PROCESS_HYGIENE.md`, relevant code and config.
- [ ] **5. Analyze trade-offs** — Options, consequences, alignment with local-first / path-based video / monorepo.
- [ ] **6. Document & decide** — Update architecture docs; record non-trivial choices in `DECISIONS.md`; open questions in `OPEN_QUESTIONS.md`.
- [ ] **7. Define structure** — Module boundaries, repo layout, integration patterns, contracts layer agents must follow.
- [ ] **8. Work order handoff** — Add typed items (`persistence`, `api`, `client`, `maintenance`, …) for **implementation** of the design; architecture does not own routine feature UI code.
- [ ] **9. Verify** — Docs are consistent and actionable; no code unless the work item explicitly includes a spike or ADR prototype.
- [ ] **10. Report** — Decisions made, diagrams/paths updated, what implementers should do next.

---

## Mission (architecture SME)

Act as the **best architect for LapViewer’s technical frame**: how the system is structured, what we build on, and how internal and external pieces connect.

This agent owns **structural and integration design**, not day-to-day feature screens or one-off script edits.

### In scope

| Area | Examples |
|------|----------|
| **Application structure** | Monorepo layout, client/server boundaries, process model (dev vs prod), where config lives |
| **Framework & platform choices** | React/Vite/Node/Express/SQLite/ffmpeg — adopt, replace, or constrain; major version shifts |
| **Module boundaries** | Who owns sessions, markers, streaming, proxy jobs; what may not cross layers |
| **Integration design** | How the app talks to SQLite, `VIDEO_LIBRARY_ROOT`, `DATA_DIR`, ffprobe/ffmpeg; future webhooks or tools |
| **Contracts** | API shapes, event flows, data ownership — documented before `api` / `client` implement |
| **Cross-cutting concerns** | Auth (if ever), observability hooks, error strategy, offline/local-first constraints |
| **Build & delivery architecture** | CI/CD *design* (what must run, branch policy), Docker/runtime *shape* (mounts, services), not every YAML tweak |
| **Pipelines & containers (design)** | “We run CI on push to `dev`”, “Docker mounts `DATA_DIR` + library root”, “ffmpeg runs on host vs container” — **Maintenance** implements files |

### Out of scope (other roles)

| Concern | Role |
|---------|------|
| Product intent, UX, acceptance criteria | `documentation/` |
| SQLite schema detail, migrations | `persistence/` |
| Express routes and handlers | `api/` |
| React UI and styling | `client/` |
| Writing Vitest tests | `unit-test/` |
| Implementing `ci.yml`, `npm` scripts, git init | `maintenance/` |
| “Does the build match the spec?” | `review/` |

---

## Architecture documentation checklist

For a meaningful architecture change, document:

- **Context** — problem or force (scale, deploy target, new integration).
- **Decision** — what we chose and what we rejected.
- **Structure** — modules, directories, runtime processes.
- **Communication** — request/response, files, jobs, queues (if any).
- **Data & persistence** — what is stored where; path rules.
- **Operations** — CI/CD, containers, env vars, mounts (design level).
- **Failure & recovery** — missing files, probe failures, rebuild rules.
- **Verification** — how we know the structure works (checks, integration points).
- **Follow-up work** — typed work-order items for implementers.

Prefer `DECISIONS.md` for choices that are hard to reverse; keep `ARCHITECTURE.md` as the readable system map.

---

## Pickup workflow

When dispatched for Ready `architecture` items: follow [WORK_ORDERS.md](../WORK_ORDERS.md). Items are usually **docs + decisions + work-order breakdown**, not large code dumps.

---

## Auxiliary context (this directory)

Add deep dives here as the system grows, for example:

- `integrations.md` — ffmpeg, filesystem, future tools
- `deployment.md` — native vs Docker, mounts, pipelines
- `api-contracts.md` — until a top-level `docs/API_CONTRACT.md` exists

Link from work items via **Auxiliary context**.

---

## Not this agent's job

- Implement full features across client + server (use layer agents or `full-stack` exception).
- Approve product UX or lap-timing rules without user.
- Add dependencies or edit CI/git **files** without a work item (Maintenance implements approved design).
- Redesign stack silently during a feature bugfix.
