# Where we are & how to continue (LapViewer)

**Last updated:** 2026-03-28  
**Focus:** Design and build a tool to **view and compare laps** — not agent-platform work.

---

## Current phase

**View & compare (VC-1–VC-4) done.** **Persistence (VC-5) implemented** on `feature/persistence-vc5`.

| Area | State |
|------|--------|
| **Data + Compare** | Working with API-backed sessions and laps |
| **Persistence** | SQLite at `data/lapviewer.db` |
| **Intake** | Register-by-path form only; **no marker UI yet** |
| **Next** | Intake lap marking (F2/F3) |

---

## Implementation order

| Phase | Status |
|-------|--------|
| VC-1–VC-4 | Done — mock UI → compare loop |
| **VC-5** | **Done** — SQLite + sessions API + wired client |
| **Next** | Intake markers + `POST/PATCH/DELETE` marker API |

---

## Run the app locally

```bash
npm run install:all   # if needed
npm run dev
```

- UI: http://localhost:5173 — demo player only today  
- API: http://localhost:3000/api/health  

Demo file path is in `server/src/config.ts`.

---

## What to ignore for now

- `docs/AGENT_PLATFORM_BLUEPRINT.md`, sibling `agent-platform/` repo  
- `docs/work-orders/WO-ui-shell.md` — superseded by VIEW_COMPARE_V1 for first build  
- Uncommitted agent template files under `docs/agents/` (optional cleanup)

---

## Success checklist (design — done)

- [x] Data → Compare flow documented in one place ([VIEW_COMPARE_V1.md](features/VIEW_COMPARE_V1.md))
- [x] F4 / F5 acceptance criteria match 2-up + compare tray
- [x] v1 uses **mock data** first (D-017)
- [ ] Ready to build — **yes**, open `feature/view-compare-v1`
