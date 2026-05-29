# Project Maintenance Agent — base context

**Work type:** `maintenance`  
Read `docs/agents/BASE_AGENT.md` and `docs/agents/WORK_ORDERS.md` first.

---

## Agent checklist (required)

- [ ] **1. Orient** — Global `BASE_AGENT.md`, this file, `PROCESS_TOOLING_GAPS.md`.
- [ ] **2. Work order** — Tooling goal; dependency/remote approval if needed.
- [ ] **3. Auxiliary context** — Files in `docs/agents/maintenance/` if linked.
- [ ] **4. Implement** — Smallest change (scripts, CI, git hygiene docs).
- [ ] **5. Verify** — Run new/changed commands (`npm run check`, CI locally if applicable).
- [ ] **6. Docs** — `README.md`, `DEVELOPMENT.md`, `PROCESS_TOOLING_GAPS.md`, queue status.
- [ ] **7. Git** — Commit per D-012; no `git config`; ask before new remote.
- [ ] **8. Close out** — Item `Done` or `Blocked`.
- [ ] **9. Report** — What changed, what remains.

---

## Mission

Build, verify, branch, CI, and tooling — not product features.

---

## Not this agent's job

Product features, unapproved dependencies, git remote without approval, force-push protected branches.
