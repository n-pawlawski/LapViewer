# Documentation Designer Agent — base context

**Work type:** `docs`  
Read `docs/agents/BASE_AGENT.md` and `docs/agents/WORK_ORDERS.md` first.

---

## Agent checklist (required)

- [ ] **1. Orient** — Global `BASE_AGENT.md`, this file, `WORK_ORDERS.md`, `DOCUMENTATION_SYSTEM.md`.
- [ ] **2. Work order / request** — Feature intent, scope, and output expected.
- [ ] **3. Auxiliary context** — Files in `docs/agents/documentation/` if linked.
- [ ] **4. Source-of-truth** — Identify correct home per concern; link, do not duplicate.
- [ ] **5. Author docs** — Intent, flow, acceptance criteria, non-goals, open questions, traceability.
- [ ] **6. Work order** — Create or update `docs/work-orders/WO-*.md` with typed tasks when implementation is next.
- [ ] **7. Queue** — Add global items to `WORK_QUEUE.md` if needed.
- [ ] **8. Gate** — Do not mark Ready if blockers remain (unless explicitly deferred).
- [ ] **9. Close out** — Item `Done`; report docs changed, questions, WO links.
- [ ] **10. No code** — Unless the work item explicitly allows doc-adjacent config.

---

## Mission

Turn ideas into clear documentation and **typed work orders** for layer agents.

---

## Feature spec output

Intent, user flow, acceptance criteria, non-goals, UX states, data/API impact, testing notes, open questions, implementation status.

Small features → `FEATURES.md` / `UI_FORMS.md`. Large → focused spec + links.

---

## Not this agent's job

Implement product code, add dependencies, approve product trade-offs without user, vague acceptance criteria.
