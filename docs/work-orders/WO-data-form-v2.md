# Work order: Data form v2 refactor

**Work order ID:** WO-data-form-v2  
**Feature status:** Done  
**Priority:** P1  
**Git branch:** `feature/data-form-v2` (or continued on `feature/users-v1`)

## Source of truth

- [DATA_FORM_V2.md](../features/DATA_FORM_V2.md)
- [ROADMAP.md](../ROADMAP.md) Phase 2
- [UI_DESIGN.md](../UI_DESIGN.md) § Data form

## Feature summary

Refactor the Data home screen: toolbar, filters, compact session list, tabbed lap views, sticky compare dock, session edit/delete, and `GET /api/laps`.

## Acceptance criteria (feature level)

- [x] Data toolbar with search, track/status filters, sort
- [x] Compare dock pinned below panes (always visible)
- [x] Session edit + delete from Data
- [x] All laps tab with dedicated API
- [x] `npm run check` passes

## Item index

| ID | Work type | Status | Title |
|----|-----------|--------|-------|
| WO-data-form-v2-01 | api | Done | DELETE session, GET /api/laps, updatedAt on list |
| WO-data-form-v2-02 | client | Done | D1 shell — hooks, CompareDock, component split |
| WO-data-form-v2-03 | client | Done | D2 toolbar + session cards |
| WO-data-form-v2-04 | client | Done | D3 edit/delete modal + actions |
| WO-data-form-v2-05 | client | Done | D4 All laps tab |
| WO-data-form-v2-06 | review | Done | AC vs build |

---

## WO-data-form-v2-01 — API

**Work type:** `api`  
**Status:** Done

**Delivered:**

- `DELETE /api/sessions/:id`
- `GET /api/laps`
- `createdAt` / `updatedAt` on session list DTO

---

## WO-data-form-v2-02 — Client shell

**Work type:** `client`  
**Status:** Done

**Delivered:**

- `useDataPageState`, `useSessionFilters`
- `CompareDock` outside scroll panes
- Refactored `DataPage.tsx`

---

## WO-data-form-v2-03 — Toolbar + cards

**Work type:** `client`  
**Status:** Done

**Delivered:**

- `DataToolbar`, compact `SessionList`

---

## WO-data-form-v2-04 — Edit / delete

**Work type:** `client`  
**Status:** Done

**Delivered:**

- `SessionEditModal`, `SessionSummaryStrip` actions
- Delete confirm on strip and in modal

---

## WO-data-form-v2-05 — All laps

**Work type:** `client`  
**Status:** Done

**Delivered:**

- `SessionWorkspace` tabs
- `AllLapsPanel` + `fetchAllLaps()`
