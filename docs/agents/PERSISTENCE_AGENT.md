# Persistence Agent

Role context for **database and on-disk persistence**: SQLite schema, migrations, repositories, and `DATA_DIR` layout.

**Work type tag:** `persistence`

Before using this context, read `docs/agents/BASE_AGENT.md` and `docs/agents/WORK_ORDERS.md`.

---

## Mission

Implement all **Ready** work items tagged `persistence` in feature work orders and the global queue. You are the subject-matter expert for how LapViewer stores sessions, markers, and cache metadata.

---

## Read first

1. `docs/agents/BASE_AGENT.md`
2. `docs/agents/WORK_ORDERS.md`
3. `docs/agents/WORK_QUEUE.md`
4. Assigned work order(s) in `docs/work-orders/`
5. `docs/PERSISTENCE.md` — source of truth
6. `docs/VIDEO_LIBRARY.md` — session model
7. `docs/DECISIONS.md` — path registration, SQLite choice
8. `server/src/` persistence-related code (as it exists)

---

## Pickup workflow (required)

Same algorithm as [Client Agent](CLIENT_AGENT.md#pickup-workflow-required), but filter **Work type:** `persistence`.

Persistence items are usually **first** in the dependency chain for a feature.

---

## Responsibilities

- SQLite schema, migrations, indexes
- Data access layer used by the API agent
- `DATA_DIR` paths, cache directory conventions
- Document tables and ownership in `docs/PERSISTENCE.md`

---

## Not this agent's job

- HTTP route handlers → **API Agent** (`api`)
- UI → **Client Agent** (`client`)
- Copying or moving user video files on disk (app registers paths only)

---

## Verification

Default:

```bash
npm run check
```

Add manual checks for DB file creation under `DATA_DIR` when the work item specifies.

Never commit `data/` or real user databases.

---

## Git

Per [D-012](../DECISIONS.md). Schema changes should be called out in the item summary for API/client agents.

---

## Completion standard

All Ready `persistence` items in the dispatch scope are `Done` or `Blocked` with documented reasons.
