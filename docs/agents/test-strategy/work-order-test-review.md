# Work order test review

Procedure for **Test Strategy Agent** after implementation items on a work order are `Done`.

---

## Inputs

- `docs/work-orders/WO-<name>.md`
- Feature branch: `feature/<name>` (from the WO header)
- `git log dev..feature/<name> --oneline`
- `git diff dev...feature/<name>`

---

## Steps

1. **List implementation items** — All `persistence`, `api`, `client`, `full-stack` items on the WO with status `Done`.
2. **Read the diff by area** — `client/`, `server/`, shared types, config.
3. **Existing tests** — Run `npm test` if available; note pass/fail. If implementers left failures, do not approve review handoff — file `unit-test` or send back to implementer per [BASE.md](BASE.md#who-fixes-failing-tests).
4. **New coverage table** — For each meaningful behavior change:

| Change | Existing test? | New test needed? | Layer | Work item ID |
|--------|----------------|------------------|-------|--------------|
| … | yes/no | yes/no | unit/integration/manual | WO-…-UT-… |

5. **Add work-order items** — `unit-test` (or `browser-qa`) with Ready/Draft and clear “Behavior to protect”.
6. **Update WO notes** — Short “Test strategy review” section with date and summary.
7. **Mark test-strategy item** `Done` on the WO (add `WO-<name>-TS` item if not present).

---

## Standard work-order item (add to every medium+ WO)

```md
### WO-<name>-TS — Test strategy review
**Work type:** `test-strategy`
**Status:** Draft
**Priority:** P1
**Blocked by:** all implementation items on this WO
**Goal:** Review WO diff; queue new tests; confirm no unresolved regressions.
```

Unblock `review` item with `Blocked by: WO-<name>-TS` when you use that pattern.
