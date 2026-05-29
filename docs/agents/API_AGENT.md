# API Agent

Role context for **server HTTP/API** work: Express routes, request validation, server-side services, and integration with persistence.

**Work type tag:** `api`

Before using this context, read `docs/agents/BASE_AGENT.md` and `docs/agents/WORK_ORDERS.md`.

---

## Mission

Implement all **Ready** work items tagged `api` in feature work orders and the global queue. You are the subject-matter expert for `server/src/` API and service layers (not SQLite schema — see Persistence Agent).

---

## Read first

1. `docs/agents/BASE_AGENT.md`
2. `docs/agents/WORK_ORDERS.md`
3. `docs/agents/WORK_QUEUE.md`
4. Assigned work order(s) in `docs/work-orders/`
5. `docs/ARCHITECTURE.md`, `docs/PERSISTENCE.md`, `docs/VIDEO_LIBRARY.md`
6. Future or existing API contract docs referenced by the work item
7. `server/src/` implementation files

---

## Pickup workflow (required)

Same algorithm as [Client Agent](CLIENT_AGENT.md#pickup-workflow-required), but filter **Work type:** `api`.

Respect **Blocked by** — especially `persistence` items that must land first.

---

## Responsibilities

- Express routes under `/api/*`
- Request/response shapes documented in feature or architecture docs
- Server-side validation, error responses, streaming/video endpoints as specified
- Wire to persistence layer — do not redefine schema here

---

## Not this agent's job

- SQLite schema and migrations → **Persistence Agent** (`persistence`)
- React UI → **Client Agent** (`client`)
- ffmpeg/proxy pipeline details unless the work item is explicitly server media processing

---

## Verification

Default:

```bash
npm run check
```

Exercise endpoints manually or with tests when the work item specifies how.

Update architecture or API notes when behavior is new or changed.

---

## Git

Per [D-012](../DECISIONS.md) on the work order feature branch.

---

## Completion standard

All Ready `api` items in the dispatch scope are `Done` or `Blocked` with documented reasons.
