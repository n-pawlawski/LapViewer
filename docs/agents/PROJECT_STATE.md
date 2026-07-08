# Project state (LapViewer)

This file holds **durable quick-references** (decisions, doc map). For **live facts that change over time** (current branch, remote, ahead/behind, available verification commands), read the generated snapshot or run the script:

- `docs/agents/PROJECT_STATE.generated.md` — regenerated on every session start
- `npm run project:state` — regenerate on demand

**Manifest:** `.agent-project.yaml` (LapViewer-only; no external platform pack — D-032).

---

## Verification

Available `check` / `test` / `build` commands are listed live in `docs/agents/PROJECT_STATE.generated.md` (derived from `package.json`). Implementers: run `npm run check` before `Done`; run `npm test` when relevant.

---

## Decisions (quick reference)

| ID | Summary |
|----|---------|
| D-004 | Default branch `dev` |
| D-005 | Test runner choice — see [TESTING_STRATEGY.md](../TESTING_STRATEGY.md) |
| D-006 | Dark-only UI v1 |
| D-012 | Agents manage git on feature branches |
| D-013 | Typed work orders + layer agents |
| D-015 | Implementer fixes own test regressions; test-strategy queues coverage |

Full list: [DECISIONS.md](../DECISIONS.md)

---

## Domain doc map (short)

| Concern | Doc |
|---------|-----|
| Features | [FEATURES.md](../FEATURES.md) |
| UX / forms | [UI_FORMS.md](../UI_FORMS.md) |
| Architecture | [ARCHITECTURE.md](../ARCHITECTURE.md) |
| Persistence | [PERSISTENCE.md](../PERSISTENCE.md) |
| Video library | [VIDEO_LIBRARY.md](../VIDEO_LIBRARY.md) |
| Testing strategy | [TESTING_STRATEGY.md](../TESTING_STRATEGY.md) |

Full map: [BASE_AGENT.md](BASE_AGENT.md)

---

## Open tooling gaps

See [PROCESS_TOOLING_GAPS.md](../PROCESS_TOOLING_GAPS.md). Track work in [WORK_QUEUE.md](WORK_QUEUE.md). Test-coverage expansion is tracked in [TESTING_STRATEGY.md](../TESTING_STRATEGY.md) and `docs/work-orders/WO-unit-test-gate.md`.
