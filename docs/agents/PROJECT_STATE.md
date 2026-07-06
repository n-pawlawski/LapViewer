# Project state (LapViewer)

Agents read this for facts that change over time. Update when tooling or verification changes.

**Manifest:** `.agent-project.yaml` @ platform pack `0.2.0`

---

## Verification

| Command | Status | Notes |
|---------|--------|-------|
| `npm run check` | **available** | TypeScript client + server (`verify.check`) |
| `npm test` | **available** | Node built-in runner + tsx (`server/src/**/*.test.ts`) |
| `npm run build` | **available** | Client production build |

Implementers: run `check` before `Done`; document "full test run N/A" until `test` exists.

---

## Decisions (quick reference)

| ID | Summary |
|----|---------|
| D-004 | Default branch `dev` |
| D-005 | Vitest (not installed yet) |
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
| Testing strategy | [TESTING_STRATEGY.md](../TESTING_STRATEGY.md) *(planned)* |

Full map: [BASE_AGENT.md](BASE_AGENT.md)

---

## Open tooling gaps

See [PROCESS_TOOLING_GAPS.md](../PROCESS_TOOLING_GAPS.md). Track work in [WORK_QUEUE.md](WORK_QUEUE.md).

Priority: Vitest + `npm test` unblocks `unit-test` agent and implementer full-suite step.
