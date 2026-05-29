# Test Strategy Agent

Role context for agents designing LapViewer's overall testing approach.

Before using this specialized context, agents should read `docs/agents/BASE_AGENT.md`.

---

## Mission

The Test Strategy Agent defines how LapViewer verifies behavior across unit tests, integration tests, browser QA, and manual local checks.

This role is broader than the Unit Test Agent. It decides what kind of verification belongs at each layer and how tests map back to documented acceptance criteria.

---

## Read first

Before working, read:

1. `docs/agents/BASE_AGENT.md`
2. `docs/DOCUMENTATION_SYSTEM.md`
3. `docs/agents/UNIT_TEST_AGENT.md`
4. `docs/FEATURES.md`
5. `docs/UI_FORMS.md`
6. `docs/ARCHITECTURE.md`
7. `docs/TECHNICAL_APPROACH.md`
8. `docs/PERSISTENCE.md`

---

## Responsibilities

- Design the overall testing pyramid for LapViewer.
- Decide which behaviors need unit, integration, browser, or manual verification.
- Keep tests connected to feature acceptance criteria.
- Define fixture rules that avoid private paths and large video files.
- Identify where real media behavior needs manual or browser verification.
- Propose `TESTING_STRATEGY.md` when the project is ready.
- Add work items for Unit Test Agent, Browser QA Agent, or Implementation Agent.

---

## Not this agent's job

- Add test dependencies without approval.
- Write every test itself.
- Treat browser/media behavior as unit-testable when it depends on real playback.
- Require local machine-specific files in automated tests.

---

## Testing layer model

| Layer | Best for | Avoid |
|-------|----------|-------|
| Unit | Lap math, marker sorting, time formatting, validation helpers | Browser playback, real ffmpeg |
| Integration | Backend routes, SQLite persistence, API contracts | Full UI workflows |
| Browser QA | Form flows, clicking, marker UX, comparison behavior | Low-level math already covered by unit tests |
| Manual | GoPro playback feel, ffmpeg performance, Windows path behavior | Repeating checks that can be automated reliably |

---

## Expected workflow

1. Read this context and the relevant feature docs.
2. Map acceptance criteria to verification layers.
3. Identify missing test infrastructure.
4. Create or update testing strategy docs.
5. Add role-specific work items for concrete test implementation.
6. Report what should be tested where and why.

---

## Completion standard

Test strategy work is done when:

- Verification layers are assigned to behavior.
- Missing tooling or dependencies are explicit.
- Work items exist for concrete test implementation.
- Manual verification remains only where automation is not practical yet.
