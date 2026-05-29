# Process and Tooling Gaps

Current gaps that prevent LapViewer's feature lifecycle from running end-to-end with strong automation.

This document turns the process/tooling setup into a prioritized backlog. It should shrink over time as gaps are implemented and moved into normal project docs.

---

## Current state snapshot

As of 2026-05-28:

- Git is initialized on branch `dev` ([D-004](DECISIONS.md)); **baseline commit pending** user approval ([GIT-002](agents/WORK_QUEUE.md)).
- Process standard documented in [PROCESS_HYGIENE.md](PROCESS_HYGIENE.md) ([D-011](DECISIONS.md)).
- Root `npm run check` runs client + server TypeScript ([DEVELOPMENT.md](DEVELOPMENT.md)).
- `.gitignore` excludes `node_modules/`, `dist/`, `data/`, `.env`, logs, `.cursor/`, `coverage/`.
- CI workflow file exists (`.github/workflows/ci.yml`); runs when a GitHub remote is connected.
- PR template exists (`.github/pull_request_template.md`).
- No unit test runner is configured yet (Vitest proposed — **D-005**).
- No lint or formatting tooling is configured.
- Agent roles, feature lifecycle, decision log, and work queue docs exist.

---

## Priority order

### P0 - Make work trackable

These unblock safe implementation work:

1. Initialize git.
2. Create or choose the development branch.
3. Define commit/branch rules.
4. Create a baseline commit once the current files are reviewed.

Why first: implementation agents need a stable baseline and a way to isolate future feature work.

### P1 - Make work verifiable

These make implementation quality measurable:

1. Add a test strategy doc.
2. Choose and configure a unit test runner.
3. Add server typecheck/build scripts.
4. Add root verification scripts.

Why next: the feature lifecycle requires checks and test handoff work to be meaningful.

### P2 - Make style and review consistent

These reduce noise and make future reviews cleaner:

1. Add linting.
2. Add formatting.
3. Decide whether formatting is manual, script-driven, or enforced in CI.
4. Add review/verification checklist docs if needed.

Why after verification: style tooling is useful, but not as important as source control and tests.

### P3 - Automate the workflow

These are useful once the basics are stable:

1. Add CI.
2. Add PR template.
3. Add issue/feature templates.
4. Add optional docs watcher / agent control workflow.
5. Add release notes or changelog process.

Why later: automation should enforce a workflow we have already proven manually.

---

## Gap details

### G1 - Git baseline

**Problem:** The repo is not currently initialized as a git repository.

**Impact:** Agents cannot safely branch, diff, commit, or review changes against a stable baseline.

**Recommended approach:**

- Run `git init`.
- Create a development branch, likely `dev`.
- Review the current working tree before the first commit.
- Commit a baseline only when explicitly approved.
- Do not push anywhere until a remote is intentionally configured.

**Owner:** Project Maintenance Agent / user approval.

---

### G2 - Branch strategy

**Problem:** The Implementation Agent references branching from `dev`, but no branch strategy exists yet.

**Recommended default:**

```text
dev
  -> feature/<short-feature-name>
  -> fix/<short-bug-name>
  -> chore/<short-maintenance-name>
```

Rules:

- Feature work branches from `dev`.
- Main/master is only needed if/when releases matter.
- Agents do not commit, push, or open PRs without permission.
- Each medium/large feature gets one implementation branch.

**Owner:** Project Maintenance Agent / user approval.

---

### G3 - Test strategy

**Problem:** Testing layers are described conceptually, but there is no `TESTING_STRATEGY.md` yet.

**Recommended approach:**

- Define unit, integration, browser QA, and manual verification layers.
- Explain what belongs in each layer.
- Define fixture policy.
- Avoid tests that require private local video files.
- Map feature acceptance criteria to verification layers.

**Owner:** Test Strategy Agent.

---

### G4 - Unit test runner

**Problem:** No unit test runner is configured.

**Recommended default:** Vitest for TypeScript unit tests.

Open decision:

- Confirm whether adding Vitest is approved.

**Owner:** Unit Test Agent.

---

### G5 - Server typecheck/build

**Problem:** The client has `tsc -b && vite build`, but the server only has dev/start scripts.

**Recommended approach:**

- Add a server typecheck script.
- Add a root script that checks both client and server.
- Decide whether server needs an emitted build or typecheck-only is enough while using `tsx`.

**Owner:** Project Maintenance Agent / Implementation Agent.

---

### G6 - Lint and formatting

**Problem:** There is no project lint or formatting setup.

**Recommended approach:**

- Add formatting first if desired, probably Prettier.
- Add ESLint for TypeScript/React when code volume justifies it.
- Avoid spending too much time tuning style rules before the core app stabilizes.

Open decision:

- Should formatting be enforced now or deferred until the first real feature pass?

**Owner:** Project Maintenance Agent.

---

### G7 - CI

**Problem:** No CI exists.

**Recommended approach once git/remote exists:**

- Add GitHub Actions or equivalent.
- Run install, build/typecheck, tests, and optionally lint.
- Keep CI minimal at first.

**Owner:** Project Maintenance Agent / CI maintenance agent later.

---

### G8 - Review and PR templates

**Problem:** The feature lifecycle is documented, but there are no PR/review templates.

**Recommended approach once git/remote exists:**

- Add a PR template with summary, docs, tests, manual verification, and follow-up work.
- Add issue/feature template only if useful.

**Owner:** Review / Verification Agent or Project Maintenance Agent.

---

## Recommended next sequence

1. Approve git initialization and branch strategy.
2. Initialize git and create `dev`.
3. Add `TESTING_STRATEGY.md`.
4. Approve and add Vitest.
5. Add server typecheck and root verification scripts.
6. Add lint/format if desired.
7. Add CI once there is a remote.

---

## Definition of ready for first full feature build

Before running the full feature lifecycle on a meaningful feature, ideally have:

- Git initialized.
- Branch strategy decided.
- At least one root verification command.
- Testing strategy documented.
- Unit test runner decision made, even if runner setup is deferred.

The first small feature can still start before every tool exists, but missing tools must be recorded as follow-up work.
