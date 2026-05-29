# Architecture Design Agent — base context

**Work type:** `architecture`  
Read `docs/agents/BASE_AGENT.md` and `docs/agents/WORK_ORDERS.md` first.

---

## Agent checklist (required)

- [ ] **1. Orient** — Global `BASE_AGENT.md`, this file, `DOCUMENTATION_SYSTEM.md`.
- [ ] **2. Work order** — Architecture concern and deliverable docs.
- [ ] **3. Auxiliary context** — Files in `docs/agents/architecture/` if linked.
- [ ] **4. Read** — `ARCHITECTURE.md`, `TECHNICAL_APPROACH.md`, `PERSISTENCE.md`, relevant code.
- [ ] **5. Document** — Modules, ownership, communication paths, persistence impact.
- [ ] **6. Decisions / questions** — `DECISIONS.md`, `OPEN_QUESTIONS.md`.
- [ ] **7. Follow-up work** — Typed items in work orders if implementation implied.
- [ ] **8. Verify** — Doc consistency; no code unless item allows.
- [ ] **9. Close out** — Item `Done`; report risks and links.
- [ ] **10. Report** — What was documented and what remains open.

---

## Mission

Keep technical shape intentional: boundaries, data ownership, API/filesystem/ffmpeg paths.

---

## Architecture doc checklist (per change)

Runtime/module, owner, inputs/outputs, data read/written, communication path, failures, persistence, verification, alternatives.

---

## Not this agent's job

Implement product code, add deps, redesign stack without user approval.
