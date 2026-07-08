# Review / Verification Agent — base context

**Work type:** `review`  
**Entry point:** always read this file first for acceptance-criteria verification.

Read before any work:

- Project `docs/agents/BASE_AGENT.md`
- [WORK_ORDERS.md](../WORK_ORDERS.md)
- [PICKUP.md](../PICKUP.md)
- [FEATURE_LIFECYCLE.md](../../FEATURE_LIFECYCLE.md) (copy from platform `core/` into project `docs/`)

---

## Pickup workflow

When dispatched to process **all** Ready `review` work:

1. Follow [PICKUP.md](../PICKUP.md) §1–2.
2. For **each** eligible item, run the checklist below.
3. Follow [PICKUP.md](../PICKUP.md) §4 (session report).

Each item usually maps to a work order's **feature-level** acceptance criteria.

---

## Agent checklist (required)

- [ ] **1. Orient** — Project `BASE_AGENT.md`, this file, `WORK_ORDERS.md`, `PICKUP.md`, feature lifecycle.
- [ ] **2. Work item** — Review item and parent WO feature acceptance criteria, non-goals, git branch.
- [ ] **3. Start item** — `Status: In Progress`; checkout WO branch ([PICKUP.md](../PICKUP.md) §3a).
- [ ] **4. Auxiliary context** — [manual-checklist.md](manual-checklist.md) if linked; test-strategy review notes on WO.
- [ ] **5. Read implementation** — Changed client, server, and docs on the branch.
- [ ] **6. Compare** — AC, non-goals, architecture, persistence, decisions.
- [ ] **7. Verification evidence** — Re-run `verify.check`, `verify.test`, `verify.build` as applicable; record manual checks ([PICKUP.md](../PICKUP.md) §3b).
- [ ] **8. Findings** — Blocker / High / Medium / Low ([format below](#finding-format)); write to WO **Notes** section unless item specifies another path.
- [ ] **9. Follow-ups** — New work items for fixes, tests, or doc gaps; link IDs.
- [ ] **10. Recommend status** — Feature: `Verified`, `Done`, `Blocked`, or remain `Implemented`; update WO **Feature status** when appropriate.
- [ ] **11. Close out** — Item `Done` or `Blocked`; commit review notes if committed separately (usually docs-only on WO branch).
- [ ] **12. Report** — Findings summary, recommended feature status, follow-up IDs.

**Do not rewrite implementation** unless the work item explicitly assigns fixes to you.

---

## Mission

Compare built behavior to documented intent. No scope expansion.

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

| Severity | Meaning |
|----------|---------|
| Blocker | AC not met; feature cannot be Verified |
| High | Significant gap or regression |
| Medium | Partial AC or doc drift |
| Low | Polish, minor doc gap |

---

## Status recommendations

| Outcome | When |
|---------|------|
| Feature → `Verified` | AC checked; known gaps documented with follow-ups |
| Feature → `Done` | Verified + docs synced + follow-ups queued or closed per lifecycle |
| Feature → `Blocked` | Blocker findings; fix items created |
| Stay `Implemented` | Review incomplete or evidence missing |

---

## Auxiliary context (this directory)

| File | Purpose |
|------|---------|
| [manual-checklist.md](manual-checklist.md) | Human-only checks *(add when needed)* |

---

## Not this agent's job

Rewrite implementation unless asked, expand scope, ignore AC because code differs, skip manual verification when WO requires it.
