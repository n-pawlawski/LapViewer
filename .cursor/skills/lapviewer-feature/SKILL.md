---
name: lapviewer-feature
description: Take a new LapViewer feature from idea to a ready-to-implement work order. Use when the user proposes a new feature or asks to design, spec, or plan feature work before writing code.
disable-model-invocation: true
---

# LapViewer — Feature Design → Ready

Thin orchestrator. Follow the source-of-truth docs; this is the sequence, not a substitute.

## Read first
- `docs/FEATURE_LIFECYCLE.md` — statuses and the readiness gate
- `docs/DOCUMENTATION_SYSTEM.md` — where each concern's spec lives (SOT table)
- `docs/DECISIONS.md` — record non-obvious trade-offs here
- `docs/work-orders/_TEMPLATE.md` — work-order shape

## Sequence
1. **Capture intent** in the right home: `docs/FEATURES.md` (compact) or `docs/features/<NAME>.md` (large); open questions in `docs/OPEN_QUESTIONS.md`.
2. **Design the spec**: intent, user flow, testable acceptance criteria, non-goals, UX states, data/API impact, open questions. Status starts `Draft` — do not implement.
3. **Readiness gate** (FEATURE_LIFECYCLE §3): AC testable, non-goals listed, blocking questions resolved/deferred, data/API/arch impact documented, verification expectations noted. Only then → `Ready for implementation`.
4. **Decide scope tier** (see Process tiers in `BASE_AGENT.md`):
   - Small / single-layer → implement directly, keep it light.
   - Multi-layer (persistence + api + client) → create `docs/work-orders/WO-<name>.md` from the template; split typed items in dependency order; set first wave `Ready`.
5. **Record decisions** that future work shouldn't re-litigate in `DECISIONS.md`.
6. **Hand off** to implementation via the `lapviewer-pickup` skill (dispatch by work type).

## Guardrails
Ask before: new dependencies, data deletion, deploy, adding a git remote, broad architecture changes.
