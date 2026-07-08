# Work pickup (all agents)

Shared mechanics for **discovering**, **starting**, **processing**, and **closing** work items.

Every agent reads this file with their role's `BASE.md` and the project `BASE_AGENT.md`.

---

## 1. Discover work

Scan these locations:

| Location | Contents |
|----------|----------|
| `docs/work-orders/WO-*.md` | Feature implementation items |
| `docs/agents/WORK_QUEUE.md` | Cross-feature tooling, hygiene, mirrored items |

If dispatch names a **single item ID**, process only that item (still run the full per-item checklist).

Otherwise process **every** item matching your **Work type** with `Status: Ready`.

Paths come from `.agent-project.yaml` (`paths.work_orders`, `paths.agents`).

---

## 2. Filter and sort

For each candidate item:

1. **Work type** — Must match the agent's work type (e.g. `client`, `docs`, `review`).
2. **Status** — Must be `Ready`. Never implement `Draft` without explicit user approval.
3. **Blocked by** — Every listed blocker ID must be `Done` on the same WO or in `WORK_QUEUE.md`. Skip blocked items; note them in the session report.
4. **Sort** — `P0` first, then `P1`, `P2`, `P3`. Same priority: work-order item order, then queue order.

---

## 3. Per-item loop

For each eligible item, in sort order:

### 3a. Start

1. Set item **Status** → `In Progress` in the work-order or queue file (same edit pass as reading the item).
2. **Git branch** — Use the branch named in the work-order header (`Git branch:` field), typically `feature/<short-name>`.
   - If the branch exists locally: checkout.
   - If not: create from project default branch (usually `dev`, from `.agent-project.yaml` `git.default_branch`).
   - One WO usually shares one branch across all items; stay on it unless the item specifies otherwise.
3. Run the agent's **BASE.md checklist** from step 2 (work item) through close-out.

### 3b. Verify

Use commands from `.agent-project.yaml` `verify`:

| Key | Typical command | When |
|-----|-----------------|------|
| `check` | `npm run check` | Always before `Done` for code changes |
| `test` | `npm test` | When a test runner exists |
| `build` | `npm run build` | When build config or bundler changed |

If `verify.test` is not available yet, document "full test run N/A" in the report. Do not mark `Done` with failing tests you introduced.

### 3c. Close out

1. Update **Docs to update** listed on the work item.
2. Set item **Status** → `Done`, or `Blocked` with a reason and follow-up item IDs.
3. **Git commit** on the WO branch per project git rules (see project `BASE_AGENT.md` / `DECISIONS.md`).
   - Do not change `git config`.
   - Do not force-push protected branches.
   - Ask before adding remotes or new dependencies.
4. If this item unblocks downstream work (e.g. persistence → api), note which items can move to `Ready` in the report; only change status when the WO plan says to.

Docs-only agents (`docs`, `architecture`, `test-strategy` planning): commit doc changes when the project uses git for docs; skip code verification when no code changed.

---

## 4. Session report

After processing all items (or stopping on a blocker), report:

```md
## <Role> agent — session summary

| ID | Status | Branch | Verification | Commit | Notes |
|----|--------|--------|--------------|--------|-------|
| WO-…-01 | Done | feature/… | check ✓, test N/A | abc1234 | … |
| WO-…-02 | Blocked | — | — | — | waiting on … |

### Follow-ups created
- …

### Items now eligible for Ready
- …
```

---

## 5. Status transitions

| From | To | When |
|------|-----|------|
| `Ready` | `In Progress` | Agent starts the item (step 3a) |
| `In Progress` | `Done` | Checklist complete, verification passed |
| `In Progress` | `Blocked` | Cannot proceed; create follow-up item with context |
| `Draft` | `Ready` | Coordinator/user only — not implementer agents |
| `Done` | — | Terminal for this pass |

---

## 6. Work-order coordinator notes

Typical feature order:

```text
docs / architecture (design)
  → persistence → api → client (implementation)
  → test-strategy (post-WO review)
  → test-strategy (post-WO) → unit-test → browser-qa (as queued)
  → review
```

Run agents **by work type** in dependency order. Parallel types only when items have no blockers.
