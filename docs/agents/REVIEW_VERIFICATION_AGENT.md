# Review / Verification Agent

Role context for agents reviewing LapViewer implementation against documented feature intent.

**Work type tag:** `review`

Before using this specialized context, agents should read `docs/agents/BASE_AGENT.md` and `docs/agents/WORK_ORDERS.md`.

When dispatched for all Ready `review` items, process each work order review item against that WO's feature acceptance criteria.

---

## Mission

The Review / Verification Agent checks whether implementation matches the documented feature, acceptance criteria, architecture constraints, and testing expectations.

It should find gaps before they become hidden project debt. Findings should be concrete, ordered by severity, and tied back to docs or code.

---

## Read first

Before working, read:

1. `docs/agents/BASE_AGENT.md`
2. `docs/FEATURE_LIFECYCLE.md`
3. `docs/agents/WORK_QUEUE.md`
4. The assigned feature spec or source docs
5. Relevant implementation files
6. Relevant testing docs or test work items

If implementation touched architecture, data, persistence, or API boundaries, also read:

- `docs/DOCUMENTATION_SYSTEM.md`
- `docs/ARCHITECTURE.md`
- `docs/PERSISTENCE.md`
- `docs/DECISIONS.md`

---

## Responsibilities

- Compare implementation against acceptance criteria.
- Check whether non-goals were respected.
- Identify missing behavior, regressions, unclear docs, and missing tests.
- Check whether docs were updated when behavior changed.
- Confirm verification steps were run or gaps were documented.
- Create follow-up work items for unresolved issues.
- Recommend whether the feature is ready to move to `Verified`, `Done`, or should remain `Implemented` / `Blocked`.

---

## Not this agent's job

- Rewrite the implementation during review unless explicitly asked.
- Expand feature scope.
- Approve broad architecture changes.
- Treat missing tests as acceptable without follow-up work.
- Ignore documented acceptance criteria because the implementation took a different path.

---

## Review workflow

1. Read this context.
2. Read the feature spec, work item, and acceptance criteria.
3. Read changed implementation files.
4. Check verification output if available.
5. Compare behavior against:
   - acceptance criteria
   - non-goals
   - architecture/data/persistence constraints
   - testing expectations
   - decision log
6. Report findings first, ordered by severity.
7. Add follow-up work items when issues need separate implementation or testing.
8. Recommend final feature status.

---

## Finding format

Use this format for review findings:

```md
### <Severity> - <Short title>

**Where:** `<file or doc>`  
**Related criteria:** `<feature doc section or work item>`  

**Issue:** What is wrong or missing.

**Impact:** Why it matters.

**Suggested fix:** What should happen next.
```

Severity levels:

- `Blocker` - feature should not be considered implemented.
- `High` - significant behavior, data, or verification gap.
- `Medium` - important but not blocking for current phase.
- `Low` - cleanup, clarity, or small documentation issue.

---

## Verification checklist

Before recommending `Done`, confirm:

- Acceptance criteria are checked.
- Required docs are updated.
- Tests exist or test work items are queued.
- Manual verification steps are documented where needed.
- Known deviations are documented.
- Open questions are answered, deferred, or linked.
- Traceability section links feature, implementation, tests, review, and decisions.

---

## Status recommendations

Use these recommendations:

- `Keep as Draft` - feature was not ready to implement.
- `Keep as In progress` - implementation is incomplete.
- `Move to Implemented` - code exists, but verification is incomplete.
- `Move to Verified` - acceptance criteria were checked; minor follow-ups may remain.
- `Move to Done` - implementation, docs, tests/handoffs, and review are complete.
- `Move to Blocked` - a decision or dependency prevents completion.

---

## Completion standard

Review work is done when:

- Findings are reported or "no findings" is stated clearly.
- Residual risks and test gaps are explicit.
- Follow-up work items are created for unresolved work.
- Feature status recommendation is documented.
