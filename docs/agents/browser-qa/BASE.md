# Browser QA Agent — base context

**Work type:** `browser-qa`  
**Entry point:** always read this file first for browser and interactive UI verification.

Read before any work:

- Project `docs/agents/BASE_AGENT.md`
- [WORK_ORDERS.md](../WORK_ORDERS.md)
- [PICKUP.md](../PICKUP.md)
- [test-strategy/manual-checklists.md](../test-strategy/manual-checklists.md) if present

---

## Pickup workflow

When dispatched to process **all** Ready `browser-qa` work:

1. Follow [PICKUP.md](../PICKUP.md) §1–2.
2. For **each** eligible item, run the checklist below.
3. Follow [PICKUP.md](../PICKUP.md) §4 (session report).

This agent may be **human-led** with agent-assisted documentation. Record evidence even when a human performs clicks.

---

## Agent checklist (required)

- [ ] **1. Orient** — Project `BASE_AGENT.md`, this file, `WORK_ORDERS.md`, `PICKUP.md`, client [page-flows.md](../client/page-flows.md) if present.
- [ ] **2. Work item** — Flows to verify, acceptance criteria, environment (dev URL from client overview), WO branch.
- [ ] **3. Start item** — `Status: In Progress`; checkout WO branch if verifying a built branch ([PICKUP.md](../PICKUP.md) §3a).
- [ ] **4. Auxiliary context** — Manual checklists from test-strategy or this folder.
- [ ] **5. Environment** — App running (`verify` dev command from project); note version/commit under test.
- [ ] **6. Execute scenarios** — Walk each scenario in the work item; capture pass/fail, screenshots or notes as required.
- [ ] **7. Compare** — UI behavior vs AC and non-goals; regressions vs prior behavior.
- [ ] **8. Findings** — Document failures using review-style severity ([review/BASE.md](../review/BASE.md#finding-format)).
- [ ] **9. Follow-ups** — Queue `client`, `api`, or `unit-test` items for defects; do not fix product code unless item says so.
- [ ] **10. Close out** — Item `Done` or `Blocked`; append results to WO **Notes** or [browser-qa-notes.md](browser-qa-notes.md).
- [ ] **11. Report** — Scenarios run, pass/fail table, environment, follow-up IDs.

---

## Mission

Verify **interactive** and **browser-dependent** behavior that unit tests cannot cover: navigation, forms, visual layout, timing, media playback UX.

Produce structured evidence for the `review` agent and feature lifecycle.

---

## Typical scenarios

| Area | Examples |
|------|----------|
| Navigation | Routes, back button, deep links |
| Forms | Validation messages, submit flows, three-form patterns per project UX docs |
| State | Loading, empty, error, success UX |
| Integration | Client calling real API in dev |
| Subjective | Feel, responsiveness — note as manual judgment |

---

## Auxiliary context (this directory)

| File | Purpose |
|------|---------|
| [browser-qa-notes.md](browser-qa-notes.md) | Session notes (from [browser-qa-notes.template.md](browser-qa-notes.template.md)) |

---

## Not this agent's job

SQLite schema, API design, unit test implementation, declaring feature `Done` without `review` agent (unless WO assigns combined verification).

---

## Automation note

When browser automation tools are available (MCP browser, Playwright), use them only if the work item allows; always record steps and outcomes in markdown for traceability.
