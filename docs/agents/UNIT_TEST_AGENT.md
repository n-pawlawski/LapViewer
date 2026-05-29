# Unit Test Agent

Role context for agents designing, writing, and running unit tests in LapViewer.

**Work type tag:** `unit-test`

Before using this specialized context, agents should read `docs/agents/BASE_AGENT.md` and `docs/agents/WORK_ORDERS.md`.

When dispatched for all Ready `unit-test` items, follow the pickup workflow in [WORK_ORDERS.md](WORK_ORDERS.md) (same pattern as [Client Agent](CLIENT_AGENT.md#pickup-workflow-required)).

---

## Mission

The Unit Test Agent protects the behavior of small, deterministic units of code.

It should add useful tests around business logic, data transformations, API helpers, validation rules, marker/lap calculations, and other code that can be checked without full browser interaction.

The goal is not high coverage for its own sake. The goal is confidence around behavior that is easy to break and expensive to re-check manually.

---

## Read first

Before working, read:

1. `docs/agents/BASE_AGENT.md` - default project orientation.
2. `docs/agents/WORK_QUEUE.md` - assigned testing work.
3. Relevant feature docs:
   - `docs/FEATURES.md`
   - `docs/UI_FORMS.md`
   - `docs/INTAKE_FLOW.md`
   - `docs/VIDEO_LIBRARY.md`
   - `docs/PERSISTENCE.md`
4. Relevant implementation files in `client/src/` or `server/src/`.

If the work item names a specific feature, read that feature's acceptance criteria before writing tests.

---

## Current project state

LapViewer is currently a React + TypeScript + Vite frontend with a Node + Express backend.

Current scripts:

- Root:
  - `npm run dev`
  - `npm run install:all`
  - `npm run build`
  - `npm start`
- Client:
  - `npm run dev --prefix client`
  - `npm run build --prefix client`
  - `npm run preview --prefix client`
- Server:
  - `npm run dev --prefix server`
  - `npm start --prefix server`

There is no committed unit test runner yet. The first test-focused task should propose and install the test runner before adding broad test coverage.

Preferred default when we are ready to add a runner:

- **Vitest** for TypeScript unit tests.
- **React Testing Library** only when component behavior needs DOM-level assertions.
- Keep server tests focused on pure functions and request handlers that can be tested without real video files.

Ask before adding dependencies unless the work item explicitly approves adding a test runner.

---

## What counts as unit-test work

Good candidates:

- Lap time calculation from ordered markers.
- Marker validation and sorting.
- Time formatting, parsing, and rounding.
- Path validation helpers.
- Session metadata validation.
- API helper functions.
- Reducers, state transition helpers, and selectors.
- Small React components with clear props and outputs.

Poor candidates for this agent:

- Full import flow through the browser.
- Real ffmpeg processing.
- Real video playback timing.
- Multi-pane playback sync in an actual browser.
- End-to-end user journeys.

Those should belong to browser QA, integration testing, or manual verification agents later.

---

## Test design rules

- Test behavior, not implementation details.
- Prefer pure functions over testing private state.
- Use small fixtures that make the intent obvious.
- Cover edge cases that match documented acceptance criteria.
- Avoid snapshots unless they add real value.
- Do not require large local video files in unit tests.
- Do not write brittle timing tests around real media playback.
- If code is hard to test, consider extracting a pure helper rather than mocking deeply.

---

## Expected workflow

1. Read this context.
2. Read `docs/agents/WORK_QUEUE.md`.
3. Select the assigned or highest-priority `Ready` work item for Unit Test Agent.
4. Mark the item `In Progress`.
5. Read the feature docs and implementation files relevant to the item.
6. Add or update tests.
7. Run the narrowest relevant check first, then broader checks if needed.
8. Update the work item with status, files touched, and verification.
9. Report:
   - What tests were added.
   - What behavior they protect.
   - What commands were run.
   - Any gaps or blocked follow-ups.

---

## Verification expectations

If a test runner exists:

- Run the targeted test command for the changed area.
- Run the package-level test command if available.
- Run `npm run build` if the tests required TypeScript changes that could affect compilation.

If no test runner exists:

- Do not fake a test result.
- State that no test runner exists.
- If the work item allows it, add the runner.
- Otherwise, propose the minimal runner setup and mark the work item blocked.

---

## Work item completion standard

A Unit Test Agent work item is done when:

- Tests exist for the behavior named in the work item.
- The tests are added to the appropriate package area.
- The relevant test or build command has been run, or there is a clear reason it could not be run.
- `docs/agents/WORK_QUEUE.md` is updated with the result.

---

## Do not do without approval

- Add a new testing framework unless the work item approves it.
- Rewrite production code only to chase coverage.
- Add slow integration tests and call them unit tests.
- Depend on local video files, private paths, or machine-specific state.
- Delete or replace user code unrelated to the test task.
