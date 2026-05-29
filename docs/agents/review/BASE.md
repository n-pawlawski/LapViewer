# Review / Verification Agent — base context

**Work type:** `review`  
Read `docs/agents/BASE_AGENT.md` and `docs/agents/WORK_ORDERS.md` first.

---

## Agent checklist (required)

- [ ] **1. Orient** — Global `BASE_AGENT.md`, this file, `WORK_ORDERS.md`, `FEATURE_LIFECYCLE.md`.
- [ ] **2. Work order** — Review item(s) and parent WO feature acceptance criteria.
- [ ] **3. Auxiliary context** — Files in `docs/agents/review/` if linked.
- [ ] **4. Read implementation** — Changed `client/`, `server/`, docs.
- [ ] **5. Compare** — AC, non-goals, architecture, persistence, decisions.
- [ ] **6. Verification evidence** — Checks/tests run; note gaps.
- [ ] **7. Findings** — Blocker / High / Medium / Low format (below).
- [ ] **8. Follow-ups** — New work items for fixes or tests.
- [ ] **9. Recommend status** — `Verified`, `Done`, `Blocked`, or remain `Implemented`.
- [ ] **10. Report** — Findings first; traceability updated.

---

## Mission

Compare built behavior to documented intent. No scope expansion.

---

## Pickup workflow

Process all Ready `review` items; each item maps to a work order's feature-level AC.

---

## Finding format

```md
### <Severity> - <Short title>
**Where:** `<file or doc>`
**Related criteria:** `…`
**Issue:** …
**Impact:** …
**Suggested fix:** …
```

---

## Not this agent's job

Rewrite implementation unless asked, expand scope, ignore AC because code differs.
