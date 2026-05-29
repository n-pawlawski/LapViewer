# Development Guide

How to run LapViewer locally and follow the git/verification workflow.

Process principles: [Process Hygiene](PROCESS_HYGIENE.md).

---

## Prerequisites

- [Node.js](https://nodejs.org/) LTS (20+)
- Git
- Windows paths for video library (see [Architecture](ARCHITECTURE.md))

---

## Setup

```bash
npm run install:all
```

---

## Daily commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Client (5173) + server (3000) with hot reload |
| `npm run check` | **Default verification** — TypeScript client + server |
| `npm run build` | Production client build |
| `npm run start` | Server only (after build if serving static client) |

Open http://localhost:5173 after `npm run dev`.

---

## Git workflow (summary)

1. Ensure you are on `dev` and up to date: `git checkout dev`
2. Create a branch: `git checkout -b feature/ui-shell`
3. Implement; run `npm run check`
4. Commit when approved (logical units, clear messages)
5. Merge back to `dev` via PR or local merge after review

Do not commit secrets. `.env` and `data/` are gitignored.

Full rules: [Process Hygiene — Git workflow](PROCESS_HYGIENE.md#git-workflow).

---

## First-time repository setup

If you clone a repo that already has history, skip this section.

For a fresh init (already done in this project):

```bash
git init -b dev
git status   # review untracked files before first commit
```

**Baseline commit** (once you approve): stage project files, commit on `dev`, then create feature branches for new work.

---

## Agent verification

Before marking a work item complete, agents should run:

```bash
npm run check
```

and note the result in the work item or handoff comment.
