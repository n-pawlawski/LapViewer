---
name: lapviewer-pickup
description: Process LapViewer typed work orders using the project's pickup loop. Use when starting work on a docs/work-orders/WO-*.md item, or when asked to "pick up", "process ready work", or act as a LapViewer typed agent (client/api/persistence/unit-test/review/etc.).
disable-model-invocation: true
---

# LapViewer — Work Pickup

Thin orchestrator. The authoritative procedure lives in the docs below; read them rather than trusting this summary if they disagree.

## Read first (source of truth)
- `docs/agents/BASE_AGENT.md` — doc map, guardrails, **Process tiers**
- `docs/agents/PICKUP.md` — the discover → filter → branch → verify → close loop
- `docs/agents/<work-type>/BASE.md` — your role checklist (e.g. `client/BASE.md`)
- `docs/agents/WORK_ORDERS.md` — work types & dispatch

## Loop (per PICKUP.md)
1. **Derive state first** — run `git remote -v` and `git status -sb`; do not assume branch/remote. (Or read `docs/agents/PROJECT_STATE.generated.md`.)
2. **Discover** eligible items: `Work type` matches, `Status: Ready`, all `Blocked by` are `Done`. Sort P0→P3. Never implement `Draft` without approval.
3. **Start** — set item `In Progress`; checkout/create the WO's `feature/<name>` branch from `dev`.
4. **Do the role checklist** in `docs/agents/<work-type>/BASE.md`.
5. **Verify** — `npm run check` always; `npm test` when a runner exists; `npm run build` if the bundler/config changed.
6. **Close** — update the item's **Docs to update**; set `Done` (or `Blocked` + follow-up); commit on the WO branch per D-012.
7. **Report** — session summary table per PICKUP.md §4.

## Process tier reminder
Solo maintainer + AI: apply the full typed-item ceremony only for genuinely multi-layer features (Tier 2). For small/single-layer changes, keep it light and reconcile status rather than faking ceremony. See **Process tiers** in `BASE_AGENT.md`.
