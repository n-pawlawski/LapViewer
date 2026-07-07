# Process Hygiene

LapViewer is intentionally built as a **process-first** project: the same habits that keep this repo safe should scale to larger codebases and teams.

This doc is the **operating standard**. Tooling gaps live in [Process & Tooling Gaps](PROCESS_TOOLING_GAPS.md). Day-to-day commands live in [Development Guide](DEVELOPMENT.md).

---

## Principles

1. **Docs before deep implementation** — Features move `Draft` → `Ready` with testable acceptance criteria ([Feature Lifecycle](FEATURE_LIFECYCLE.md)).
2. **One source of truth per concern** — See [Documentation System](DOCUMENTATION_SYSTEM.md); fix conflicts at the source doc.
3. **Scoped work items** — Agents and humans pick work from [WORK_QUEUE.md](agents/WORK_QUEUE.md); do not implement `Draft` items without approval.
4. **Isolated change sets** — Use git branches per feature/fix; merge via review, not unbounded edits on `dev`.
5. **Verify before “done”** — Run `npm run check` (and tests when they exist) before marking implementation complete.
6. **Explicit decisions** — Non-obvious trade-offs go to [DECISIONS.md](DECISIONS.md), not chat-only memory.
7. **Minimal diffs** — Change only what the work item requires; update docs in the same pass when behavior changes.
8. **Human gates** — Dependencies, data deletion, deploy, and **new git remotes** require explicit approval ([Working Agreement](WORKING_AGREEMENT.md)). Day-to-day git is **agent-managed** ([D-012](DECISIONS.md)).

---

## Git workflow

**Base branch:** `dev` ([D-004](DECISIONS.md)).

**Branch naming:**

```text
feature/<short-name>   # new behavior
fix/<short-name>       # bug fix
chore/<short-name>     # tooling, docs-only maintenance
```

**Rules:**

| Rule | Why |
|------|-----|
| Branch from `dev` | Predictable integration point for agents and humans |
| One medium/large feature per branch | Reviewable PRs, easy rollback |
| No force-push to `dev` or `master` | Protects shared history |
| Agents manage git ([D-012](DECISIONS.md)) | Branch, commit, merge as part of work items; push when remote exists |
| Ask before new remote / URL change | Avoids pushing to wrong host |
| Never change `git config` | User owns machine identity settings |
| No secrets in commits | `.env`, credentials stay ignored |

**Deploy branch:** `master` ([D-025](DECISIONS.md)) — merge from `dev` when deploy-ready; GitHub Actions deploy runs on `master` push.

`dev` remains the daily integration branch. Promote verified work to `master` for release snapshots and AWS deploy—not on every commit.

---

## Verification ladder

Run checks in order before calling work complete:

| Step | Command | When |
|------|---------|------|
| 1 | `npm run check` | Every implementation pass (typecheck client + server) |
| 2 | `npm run build` | When client bundle or build config changes |
| 3 | `npm test` | After Vitest is approved and installed (future) |
| 4 | Manual / browser QA | UI, playback, and path-dependent behavior |

Agents should report which steps ran and any skips with reason.

---

## Feature and agent workflow

```text
Intent (you) → Document (Designer) → Work order (typed items) → Ready (you)
    → Dispatch by work type (persistence → api → client → …)
    → check/build → commit(s) on feature branch → Review (Verification)
    → merge to `dev` (agent) → push if remote exists → work order + FEATURES updated
```

Roles and prompts: [Agent Workflow](AGENT_WORKFLOW.md), [agents/README.md](agents/README.md).

**Implementation Agent** must record in the work item:

- Base branch and feature branch name
- Implementation checklist
- Verification commands run
- Doc updates or follow-up work items

**Review Agent** recommends `Verified` / `Done` / `Blocked` per [Feature Lifecycle](FEATURE_LIFECYCLE.md).

---

## Definition of done (any code change)

- [ ] Matches acceptance criteria in the work item or feature spec
- [ ] `npm run check` passes (or documented why not)
- [ ] Relevant docs updated (`FEATURES.md`, `UI_*`, API docs, etc.)
- [ ] No secrets committed
- [ ] WORK_QUEUE item status updated
- [ ] Review pass completed for non-trivial features

---

## Hygiene roadmap (project)

| Stage | Status | Items |
|-------|--------|--------|
| P0 Trackable | In progress | Git + `dev`, branch rules, baseline commit (pending approval) |
| P1 Verifiable | Partial | Root `check`, server typecheck — **done**; Vitest — proposed |
| P2 Consistent style | Planned | ESLint / Prettier ([MAINT-002](agents/WORK_QUEUE.md)) |
| P3 Automation | Planned | CI workflow (file ready when remote exists), PR template |

See [PROCESS_TOOLING_GAPS.md](PROCESS_TOOLING_GAPS.md) for gap IDs and owners.

---

## Scaling to larger projects

When LapViewer grows, extend this model without replacing it:

- **Split feature specs** out of `FEATURES.md` into `docs/features/<id>.md`
- **Add ADRs** for architecture-only decisions (or keep using `DECISIONS.md`)
- **Require PR + CI green** before merge to `dev`
- **CODEOWNERS** for sensitive paths (`server/`, persistence)
- **Release branch** `main` ← merge from `dev` on tagged releases

The habits stay the same: Ready gate → branch → verify → review → merge → docs synced.
