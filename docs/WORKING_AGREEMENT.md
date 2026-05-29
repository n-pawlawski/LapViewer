# Working Agreement

How you (project lead) and I (implementation assistant) collaborate on LapViewer. Fill in or adjust the sections marked **TBD** — this keeps scope predictable and avoids surprises.

---

## Roles

| Role | Owner | Responsibility |
|------|-------|----------------|
| **Product direction** | You | What to build, priorities, acceptance, saying when it's "done enough" |
| **Documentation design** | Agent | Feature briefs, acceptance criteria, open questions, design trade-offs |
| **Implementation** | Agent | Code, docs, checklists, technical proposals, executing tasks you approve |
| **Review / verification** | Agent or you | Compare implementation against docs and report gaps |
| **Final decisions** | You | Stack, hosting, UX trade-offs, merging to main, deployment |

---

## Default workflow

1. **Discuss** — You describe intent; we refine in chat or docs.
2. **Document** — Update `docs/` when decisions are made (I'll keep these in sync).
3. **Checklist** — Break approved work into small, verifiable tasks.
4. **Implement** — I write code in the repo following your boundaries.
5. **Review** — You try it locally; we iterate.

For larger work, use [Agent Workflow](AGENT_WORKFLOW.md) to split documentation design, implementation, and verification across separate agent passes.

We are in **documentation + hygiene setup**; implementation uses branches from `dev` and `npm run check` before done ([Process Hygiene](PROCESS_HYGIENE.md)).

---

## Boundaries (draft — customize in §8 of Open Questions)

### I will do by default

- Read and modify code in this repo
- Create/update documentation in `docs/` when relevant to the task
- Propose sensible defaults when docs say "TBD"
- Run builds, tests, and local commands to verify work
- Keep changes focused — minimal diff for the task at hand
- **Manage git** — branch, commit, and merge per [D-012](DECISIONS.md) and [Process Hygiene](PROCESS_HYGIENE.md) when completing work items

### I will ask first before

- **TBD:** Adding major dependencies or changing the agreed stack
- Adding a git remote or changing remote URL (first-time setup)
- **TBD:** Deleting user data or changing storage layout in a breaking way
- **TBD:** Deploying anywhere or configuring cloud resources
- **TBD:** Scope expansion beyond current phase (e.g. telemetry, auth, multi-user)

### I will not do unless you explicitly request

- Force-push to main/master
- Commit secrets (.env, credentials)
- Skip git hooks
- Rewrite unrelated code "while I'm in there"

---

## Communication norms

- **You lead with goals**, not necessarily implementation details — I'll propose how.
- **Push back is welcome** — if something is over-engineered or risky, I'll say so.
- **Decisions live in docs** — chat answers get captured in `OPEN_QUESTIONS.md` or feature specs so we don't re-debate later.
- **Checklists before big builds** — for multi-day work, we agree on a task list first.

---

## Definition of done (per task)

A task is done when:

1. It meets the acceptance criteria we agreed on (or doc spec).
2. It runs locally without manual hacks you weren't told about.
3. Relevant docs are updated if behavior or setup changed.
4. You know how to verify it (short test steps).

---

## Phase gates

We don't start the next phase until you're satisfied with the current one:

| Phase | Gate |
|-------|------|
| 0 — Decisions | Blocker questions in Open Questions answered |
| 1 — Skeleton | App starts, empty pages, data dirs documented |
| 2 — Import | One real video registers by path and plays back |
| 3 — Markers | Lap markers persist and lap times compute correctly |
| 4 — Lap UI | Lap list matches your manual calculations on a test session |
| 5 — Compare | Two laps play in sync acceptably on your machine |

---

## Handling uncertainty

When requirements are unclear:

1. I'll state assumptions explicitly.
2. I'll pick the **smallest** option that unblocks progress.
3. I'll add a follow-up question to `OPEN_QUESTIONS.md` rather than guessing silently on big items.

---

## Your custom rules (fill in)

Add any personal preferences here:

```
Example:
- Prefer TypeScript over JavaScript
- Don't add CSS frameworks without asking
- Always explain how to run new scripts in README
- Max one new npm dependency per PR
```

**Your rules:**

- 
- 
- 

---

## Next step

1. Read [Open Questions](OPEN_QUESTIONS.md) — especially §1, §4, §5, and §8.
2. Answer in chat or edit the doc directly.
3. We'll turn answers into a **Phase 0/1 checklist** and optionally scaffold the project.
