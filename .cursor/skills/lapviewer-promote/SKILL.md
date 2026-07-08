---
name: lapviewer-promote
description: Promote verified LapViewer work — merge feature/chore branches into dev, and promote dev to master for deploy. Use when asked to merge, integrate, release, promote, or deploy LapViewer.
disable-model-invocation: true
---

# LapViewer — Promote / Release

Thin orchestrator. Git conventions live in `.cursor/rules/lapviewer-git-workflow.mdc` and `docs/DECISIONS.md` (D-004, D-012, D-025); deploy in `docs/DEPLOYMENT.md`.

## Always derive state first
Run `git remote -v` and `git status -sb`. Do not assume remote or branch state.

## Merge a feature/chore branch → dev
1. Confirm verification passed on the branch: `npm run check` (and `npm test` when relevant).
2. `git checkout dev` then `git merge --no-edit <branch>`.
3. If a remote exists: `git push origin dev`. Never force-push.

## Promote dev → master (deploy snapshot, D-025)
Only when deploy-ready (check + test + smoke pass):
1. `git checkout master`
2. `git merge dev` (optionally `git tag v0.x.x`)
3. `git push origin master` — the deploy workflow runs on `master` push (`docs/DEPLOYMENT.md`).

## Guardrails
- Never change `git config`, force-push protected branches, or commit secrets (D-012).
- Ask before deploying or adding a remote.
- Deleting merged local branches is optional; confirm with the user first.
