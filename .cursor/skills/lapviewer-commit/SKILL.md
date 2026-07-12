---
name: lapviewer-commit
description: Commit LapViewer changes on a scoped feature branch while keeping dev as the working branch for other in-flight agent tasks. Use when the user asks to commit, commit and push, save work to git, or uses the commit/push button — especially with mixed uncommitted changes on dev from parallel agent sessions.
---

# LapViewer — Scoped Commit (stay on dev)

Thin orchestrator for multi-agent workflows. Git conventions: `.cursor/rules/lapviewer-git-workflow.mdc`, [D-012](docs/DECISIONS.md). Merge/promote later via `lapviewer-promote`.

**Goal:** land one logical task on `feature/*` (or `fix/*` / `chore/*`), then return to `dev` with other tasks' uncommitted work still in the tree.

---

## When to use

- User says **commit**, **commit and push**, or equivalent.
- Working tree has changes for **more than one task** (typical multi-agent case).
- Currently on `dev` with dirty files (default LapViewer integration branch).

**Skip the branch dance** only when ALL of these are true:
- Already on the correct `feature/*` / `fix/*` / `chore/*` branch, AND
- Every unstaged/staged change belongs to that single task.

Even then, **checkout `dev` after commit** unless the user asks to stay on the feature branch.

---

## Guardrails (D-012)

- Never change `git config`, force-push `dev`/`master`, or use `--no-verify`.
- Never stage `.env`, credentials, or `data/`.
- Exclude build noise by default: `**/tsconfig.tsbuildinfo` (unless the user includes it).
- Push only the **feature branch** — never push `dev` while it has uncommitted work.
- Ask before adding a git remote. Derive remote with `git remote -v`; do not assume.

---

## Workflow

### 1. Derive state (parallel)

```bash
git status -sb
git diff
git log -5 --oneline
git remote -v
git branch --show-current
```

### 2. Identify scope

Group changes into **one logical task** using, in order:

1. This conversation's stated **files in scope** or task name
2. `git diff` / `git status` clusters (client-only, server-only, docs-only, etc.)
3. Work-order branch name if this session picked up a WO (`feature/<wo-slug>`)

If multiple unrelated clusters remain and scope is unclear → **AskQuestion** (branch name + file list). Do not `git add .`.

**Overlap warning:** if a file was edited for two tasks, ask before using `git add -p` or splitting hunks manually.

### 3. Choose branch name

| Pattern | When |
|---------|------|
| `feature/<slug>` | New feature or WO work (default) |
| `fix/<slug>` | Bug fix |
| `chore/<slug>` | Tooling, docs-only, maintenance |

Reuse an existing local branch if this task already started there; otherwise create from current `dev` tip.

### 4. Commit on the feature branch

```bash
# Ensure base is dev when starting from a mixed dev tree
git checkout dev
git checkout -b feature/<slug>   # omit -b if branch already exists

# Stage ONLY this task's paths — never git add .
git add <path1> <path2> ...

git commit -m "<subject>" -m "<body — what changed and why>"
```

PowerShell: use `-m` twice (above) or a here-string; do not rely on bash-only heredocs.

**Subject line:** imperative, ≤72 chars, focused on *why*.  
**Body:** 1–3 sentences if needed.

### 5. Push (only when asked)

When the user requests push **and** `origin` exists:

```bash
git push -u origin feature/<slug>
```

Push the **feature branch**, not `dev`.

### 6. Return to dev

```bash
git checkout dev
git status -sb
```

Uncommitted files for **other** tasks must still appear in `git status`. If they vanished, stop and report — do not proceed silently.

### 7. Report

```md
## Commit summary

| Field | Value |
|-------|-------|
| Branch | `feature/<slug>` |
| Commit | `<sha>` |
| Pushed | yes / no / no remote |
| Current branch | `dev` |

**Committed paths:**
- …

**Still uncommitted on dev (other tasks):**
- …

**Follow-up:** merge via `lapviewer-promote` when verified (`npm run check`, tests when relevant).
```

---

## Quick reference

```text
dev (mixed WIP)
  → checkout -b feature/task-a
  → git add <scoped paths only>
  → commit
  → [push origin feature/task-a]   # if asked
  → checkout dev                   # other tasks' WIP remains
```

---

## Related skills

| Skill | When |
|-------|------|
| `lapviewer-pickup` | Close-out during WO processing (branch often already correct) |
| `lapviewer-promote` | Merge `feature/*` → `dev`, promote `dev` → `master` |

When pickup close-out and an explicit user commit collide, **this skill wins** for branch/end-state behavior (scoped add, end on `dev`).
