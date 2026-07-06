# Feature Work Orders

Implementation plans for features: **typed work items** consumed by specialized agents.

## How to use

1. Finish documentation design and reach **Ready for implementation** ([Feature Lifecycle](../FEATURE_LIFECYCLE.md)).
2. Copy [_TEMPLATE.md](_TEMPLATE.md) to `WO-<short-name>.md`.
3. Fill in tasks with **Work type** (`persistence`, `api`, `client`, …).
4. Mark items `Ready` when dependencies are satisfied.
5. Dispatch agents per [WORK_ORDERS.md](../agents/WORK_ORDERS.md) (one prompt per work type).

## Files

| File | Purpose |
|------|---------|
| [_TEMPLATE.md](_TEMPLATE.md) | Blank work order |
| [WO-ui-shell.md](WO-ui-shell.md) | Example: first UI slice (Draft) |
| [WO-auto-lap-detection.md](WO-auto-lap-detection.md) | F7 assisted lap detection MVP (Ready) |

## Do not

- Put full product specs here — link to `FEATURES.md`, `UI_DESIGN.md`, etc.
- Implement `Draft` items.
- Mix unrelated features in one work order.
