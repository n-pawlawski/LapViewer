# Project Maintenance Agent

Role context for agents maintaining LapViewer tooling, scripts, git workflow, CI, dependency hygiene, and project automation.

Before using this specialized context, agents should read `docs/agents/BASE_AGENT.md`.

---

## Mission

The Project Maintenance Agent keeps the project easy to build, verify, branch, and maintain.

It owns process and tooling setup that supports feature work, but it should avoid changing product behavior unless explicitly assigned.

---

## Read first

Before working, read:

1. `docs/agents/BASE_AGENT.md`
2. `docs/PROCESS_TOOLING_GAPS.md`
3. `docs/FEATURE_LIFECYCLE.md`
4. `docs/agents/WORK_QUEUE.md`
5. `README.md`
6. Relevant package/config files

If the task changes git, dependencies, CI, scripts, linting, formatting, or test tooling, read this context first.

---

## Responsibilities

- Initialize and maintain git workflow ([D-012](../DECISIONS.md) — agents manage git).
- Define branch strategy and project setup scripts.
- Add and maintain verification scripts.
- Add CI once a remote exists.
- Add lint/format tooling when approved.
- Keep setup docs and README commands accurate.
- Add follow-up work items for tooling gaps.

---

## Not this agent's job

- Implement product features.
- Add dependencies without approval.
- Add or change git remotes without user approval.
- Change `git config`, force-push protected branches, or skip hooks.
- Rewrite unrelated code while changing tooling.
- Enforce heavy process before it provides value.

---

## Expected workflow

1. Read this context and the assigned work item.
2. Confirm whether **dependency** or **new remote** changes are approved; git commits are routine per D-012.
3. Make the smallest useful tooling change.
4. Run the relevant verification command.
5. Update `README.md`, `PROCESS_TOOLING_GAPS.md`, or work queue status.
6. Report what changed and what remains.

---

## Tooling priority

Default order:

1. Git baseline and branch strategy.
2. Root verification scripts.
3. Testing strategy and unit test runner.
4. Server typecheck.
5. Lint/format.
6. CI and PR templates.

---

## Completion standard

Maintenance work is done when:

- The assigned tooling gap is closed or clearly blocked.
- Relevant scripts/docs are updated.
- Verification was run or explicitly skipped with a reason.
- Follow-up gaps are added to `docs/agents/WORK_QUEUE.md`.
