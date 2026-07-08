# Work order: App shell and static UI layouts

**Work order ID:** WO-ui-shell  
**Feature status:** Done (reconciled 2026-07-08)  
**Priority:** P0  
**Git branch:** `feature/ui-shell`

> **Status reconciliation (2026-07-08):** The app shell, dark theme, routing, and the
> Data / Intake / Compare screens all shipped and are live in `client/src` (see
> `App.tsx`, `AppShell.tsx`, `pages/DataPage.tsx`, `pages/IntakePage.tsx`, and the
> compare flow). This WO predates the more holistic feature commits, so the per-item
> `Draft` markers below were never advanced. Feature status set to **Done**; the item
> table is kept as a historical record and is not the active source of truth.

## Source of truth

- `docs/UI_DESIGN.md` — shell, Data/Intake/Compare layouts, resolved UI decisions
- `docs/UI_FORMS.md` — three forms, navigation
- `docs/DECISIONS.md` — D-006 (dark), D-009 (cross-session selection UX later on Data)
- `docs/PROCESS_HYGIENE.md` — verification before done

## Feature summary

First UI slice: dark app shell, routing (`/`, `/intake`, `/compare`), and **static mock** layouts for Data, Intake, and Comparison. No real API or SQLite yet.

## Acceptance criteria (feature level)

- [ ] Top nav: LapViewer, Data, Intake, Compare; dark theme only (D-006)
- [ ] Routes render three screens with mock data per UI_DESIGN
- [ ] Intake header shows save state only — no Done button (D-010)
- [ ] `npm run check` passes
- [ ] Demo video spike preserved or linked from dev route if useful

## Item index

| ID | Work type | Status | Title |
|----|-----------|--------|-------|
| WO-ui-shell-01 | client | Draft | App shell, theme tokens, React Router |
| WO-ui-shell-02 | client | Draft | Data form static layout + mock sessions |
| WO-ui-shell-03 | client | Draft | Intake form static layout |
| WO-ui-shell-04 | client | Draft | Comparison form static 2-up layout |
| WO-ui-shell-05 | client | Draft | Cross-session selection strip (mock) on Data |
| WO-ui-shell-TS | test-strategy | Draft | Post-WO test review (minimal until Vitest) |
| WO-ui-shell-06 | review | Draft | Review static UI vs UI_DESIGN |

---

## WO-ui-shell-01 — App shell and routing

**Work type:** `client`  
**Status:** Draft  
**Priority:** P0  
**Blocked by:** —  
**Auxiliary context:** `docs/agents/client/overview.md`, `docs/agents/client/page-flows.md`

**Goal:** Shared layout, dark theme baseline, routes for Data, Intake, Compare.

**Work to perform when Ready:**

- Add React Router (dependency approval if not already present)
- Extract `AppShell` with header nav
- Routes: `/`, `/intake`, `/compare`
- Global dark CSS variables per UI_DESIGN

**Acceptance criteria:**

- Nav highlights active route
- Default route is Data (`/`)

**Verification:**

- `npm run check`
- `npm run dev` — click through all routes

---

## WO-ui-shell-02 — Data form mock

**Work type:** `client`  
**Status:** Draft  
**Priority:** P0  
**Blocked by:** WO-ui-shell-01

**Goal:** Session list + selected session lap list with hardcoded mock data.

**Verification:** `npm run check`; manual layout check vs UI_DESIGN

---

## WO-ui-shell-03 — Intake form mock

**Work type:** `client`  
**Status:** Draft  
**Priority:** P0  
**Blocked by:** WO-ui-shell-01

**Goal:** Metadata strip, player placeholder, timeline/marker placeholders, save state label (no Done).

**Verification:** `npm run check`

---

## WO-ui-shell-04 — Comparison form mock

**Work type:** `client`  
**Status:** Draft  
**Priority:** P1  
**Blocked by:** WO-ui-shell-01

**Goal:** Two panes, shared transport placeholder, back to Data.

**Verification:** `npm run check`

---

## WO-ui-shell-05 — Comparison selection strip (mock)

**Work type:** `client`  
**Status:** Draft  
**Priority:** P1  
**Blocked by:** WO-ui-shell-02

**Goal:** Persistent lap checkboxes across mock session switches; comparison basket UI (D-009).

**Verification:** `npm run check`; manual: select laps on two mock sessions, see basket

---

## WO-ui-shell-TS — Test strategy review

**Work type:** `test-strategy`  
**Status:** Draft  
**Priority:** P1  
**Blocked by:** WO-ui-shell-01, WO-ui-shell-02, WO-ui-shell-03, WO-ui-shell-04, WO-ui-shell-05

**Goal:** After client items complete, review branch diff; queue tests when Vitest exists; confirm implementers ran `npm run check` / full suite if available.

**Notes:** Until UT-001 (Vitest), review may only document planned coverage and manual checks.

---

## WO-ui-shell-06 — Review UI shell

**Work type:** `review`  
**Status:** Draft  
**Priority:** P1  
**Blocked by:** WO-ui-shell-TS, WO-ui-shell-02, WO-ui-shell-03, WO-ui-shell-04, WO-ui-shell-05

**Goal:** Review pass against this work order and UI_DESIGN P0 slice.

**Verification:** Review agent report; user walkthrough

---

## Notes

- Persistence and API items intentionally omitted until catalog MVP work order.
- Mark WO-ui-shell-01 `Ready` when user approves starting implementation.
