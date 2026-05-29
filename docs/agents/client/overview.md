# Client overview

Subject-matter context for the **Client Agent**. Product behavior lives in `docs/UI_DESIGN.md` and `docs/UI_FORMS.md`.

---

## Stack

| Piece | Choice |
|-------|--------|
| UI | React 19 + TypeScript |
| Build | Vite 6 |
| Dev server | `http://localhost:5173` |
| API access | `/api/*` proxied to backend in dev (see `client/vite.config.ts`) |

---

## Repository layout (current → planned)

**Today:** single `App.tsx` spike (demo video + frame step).

**Planned (UI shell work order):**

```text
client/src/
  main.tsx
  App.tsx              # router shell or route outlet
  styles/              # global theme tokens (dark only)
  components/          # shared UI (nav, buttons, layout)
  pages/
    DataPage.tsx
    IntakePage.tsx
    ComparePage.tsx
  api/                 # fetch helpers, types aligned with server
  mocks/               # labeled mock data until api WO complete
```

Keep files small; match patterns already in the repo.

---

## Development

```bash
npm run dev          # root — client + server
npm run check        # tsc client + server
npm run build        # production client bundle
```

---

## Documentation map

| Topic | Source of truth |
|-------|-----------------|
| Screen behavior | `docs/UI_FORMS.md`, `docs/UI_DESIGN.md` |
| API shapes | Architecture / API work items / future `API_CONTRACT.md` |
| Lap/session data | `docs/PERSISTENCE.md`, `docs/VIDEO_LIBRARY.md` |

When you add client behavior, update the UI docs in the same pass (checklist step 4).
