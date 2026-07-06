# Data Form — v2 Refactor

**Status:** Done (2026-07-06)  
**Phase:** Roadmap Phase 2  
**Related:** [ROADMAP.md](../ROADMAP.md), [UI_FORMS.md](../UI_FORMS.md), [UI_DESIGN.md](../UI_DESIGN.md), [VIEW_COMPARE_V1.md](VIEW_COMPARE_V1.md), [WO-data-form-v2.md](../work-orders/WO-data-form-v2.md)

---

## Intent

Refactor the Data form into the **catalog and control center**: toolbar with search/filters, denser session cards, tabbed lap browsing (per session + all laps), sticky compare dock, and session edit/delete.

---

## Layout

```text
┌─ App header ─────────────────────────────────────────────────────────┐
├─ Data toolbar: [Search] [Track ▼] [Status ▼] [Sort ▼]  N sessions ──┤
├──────────────────────────────┬───────────────────────────────────────┤
│ Sessions (scroll)            │ [ This session (N) ] [ All laps (M) ] │
│ compact cards                │ lap table or all-laps table           │
├──────────────────────────────┴───────────────────────────────────────┤
│ COMPARE dock — chips + Compare selected + Clear all                   │
└───────────────────────────────────────────────────────────────────────┘
```

---

## Sub-phases (implemented)

### D1 — Shell + component split

| Piece | Location |
|-------|----------|
| `useDataPageState` | `client/src/hooks/useDataPageState.ts` |
| `useSessionFilters` | `client/src/hooks/useSessionFilters.ts` |
| `DataToolbar` | `client/src/components/data/DataToolbar.tsx` |
| `SessionListPanel` | `client/src/components/data/SessionListPanel.tsx` |
| `SessionWorkspace` | `client/src/components/data/SessionWorkspace.tsx` |
| `CompareDock` | `client/src/components/data/CompareDock.tsx` |

Compare dock is **outside** the scrolling right pane so it stays visible.

### D2 — Toolbar + session cards

- Search: title, filename, track (client-side)
- Filters: track, status
- Sort: newest (`updatedAt`), title, best lap
- Session cards: title / subline (file · track · date) / status · laps · best

### D3 — Organization (2C)

- **Edit** modal: title, track, date, notes via `PATCH /api/sessions/:id`
- **Delete** with confirm via `DELETE /api/sessions/:id`
- **Relink**: stubbed (disabled button)

### D4 — All laps tab (2D)

- Tab **All laps** on right pane
- `GET /api/laps` — flat list scoped to current user
- Same compare selection as per-session `LapTable`
- Toolbar filters apply to which sessions' laps appear

---

## API

### `GET /api/laps`

Returns:

```ts
{
  id: string;
  sessionId: string;
  sessionTitle: string;
  sessionTrack?: string;
  sessionDate?: string;
  lapNumber: number;
  lapTimeMs: number;
  isBestInSession: boolean;
  ignored: boolean;
}[]
```

### `DELETE /api/sessions/:id`

Removes session row and cascaded markers. Does not delete original video file.

### `SessionSummary` additions

- `createdAt`, `updatedAt` — used for newest sort

---

## Acceptance criteria

- [x] Toolbar + two-pane + compare dock
- [x] Search and filters on session list
- [x] Rename/edit/delete session from Data
- [x] Component split per D1
- [x] All-laps tab + API

---

## Non-goals (deferred)

- Relink file implementation
- Tags / folders
- Cross-user lap browsing
- Thumbnails on session cards
