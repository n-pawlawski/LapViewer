# Test Strategy Agent — base context

**Work type:** (planning — often `docs` or dedicated strategy items)  
Read `docs/agents/BASE_AGENT.md` first.

---

## Agent checklist (required)

- [ ] **1. Orient** — Global `BASE_AGENT.md`, this file, `FEATURES.md`, architecture docs.
- [ ] **2. Work order / feature** — Acceptance criteria to map.
- [ ] **3. Map layers** — Unit vs integration vs browser vs manual per behavior.
- [ ] **4. Document** — Update or propose `TESTING_STRATEGY.md`; fixture rules.
- [ ] **5. Queue work** — `unit-test`, `browser-qa`, `review` items as needed.
- [ ] **6. Dependencies** — Note if Vitest or other tools need approval.
- [ ] **7. Close out** — Report matrix of behavior → verification layer.
- [ ] **8. No false confidence** — Do not claim ffmpeg/playback is unit-testable.

---

## Mission

Define **where** behaviors are verified, not implement every test.

---

## Layer model

| Layer | Best for |
|-------|----------|
| Unit | Lap math, validation, formatters |
| Integration | Routes, SQLite, API contracts |
| Browser QA | Forms, markers, comparison UX |
| Manual | GoPro feel, ffmpeg, Windows paths |

See also [unit-test/BASE.md](../unit-test/BASE.md).
