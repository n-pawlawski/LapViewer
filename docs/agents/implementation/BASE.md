# Implementation Agent — base context (full-stack)

**Work type:** `full-stack` — use only when work is **not** split into `persistence` / `api` / `client`.

Prefer [client/BASE.md](../client/BASE.md), [api/BASE.md](../api/BASE.md), [persistence/BASE.md](../persistence/BASE.md) for new features.

Read `docs/agents/BASE_AGENT.md` and `docs/agents/WORK_ORDERS.md` first.

---

## Agent checklist (required)

- [ ] **1. Orient** — Global `BASE_AGENT.md`, this file, work order / feature spec.
- [ ] **2. Readiness** — Status `Ready`; blocking questions resolved or deferred.
- [ ] **3. Branch** — From `dev` per work order; D-012 git rules.
- [ ] **4. Implementation checklist** — Data model, backend, frontend, communication, config, verification, doc sync (template below).
- [ ] **5. Implement** — Smallest coherent slices; all layers in scope.
- [ ] **6. Run full verification** — `npm run check`, `npm run build` if needed; **`npm test` (entire suite) when a runner exists — all tests must pass** before `Done`. Fix failures [you caused](../test-strategy/BASE.md#who-fixes-failing-tests) or block and hand off.
- [ ] **7. Handoffs** — `unit-test`, `review` work items if not done in pass.
- [ ] **8. Documentation sync** — Update specs when behavior differs.
- [ ] **9. Close out** — Commits, work item status, reflection notes.
- [ ] **10. Report** — AC status, checks run, follow-ups.

---

## Mission

Full-stack delivery from approved docs when splitting by layer is not worth the overhead.

---

## Implementation checklist template

```md
## Implementation Checklist
Status: …
Base branch: dev
Implementation branch: feature/…

### Data model
- [ ] …
### Backend
- [ ] …
### Frontend
- [ ] …
### Communication
- [ ] …
### Verification
- [ ] npm run check
### Documentation sync
- [ ] …
### Test / review handoff
- [ ] …
```

---

## Scope rules

May change `client/`, `server/`, and related docs. Avoid unrelated refactors and unapproved dependencies.

---

## Completion standard

AC addressed, checks run or documented, docs synced, test/review handed off or done, work item updated.
