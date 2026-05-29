# Client Agent

Role context for **frontend** work: React, Vite, routing, UI components, client state, and styles.

**Work type tag:** `client`

Before using this context, read `docs/agents/BASE_AGENT.md` and `docs/agents/WORK_ORDERS.md`.

---

## Mission

Implement all **Ready** work items tagged `client` in feature work orders and the global queue. You are the subject-matter expert for everything under `client/`.

---

## Read first

1. `docs/agents/BASE_AGENT.md`
2. `docs/agents/WORK_ORDERS.md` — how to pick up all Ready items of your type
3. `docs/agents/WORK_QUEUE.md` — global items with `Work type: client`
4. Assigned work order(s) in `docs/work-orders/`
5. `docs/UI_DESIGN.md`, `docs/UI_FORMS.md` for UI tasks
6. `docs/ARCHITECTURE.md` — client responsibilities and `/api` usage
7. Relevant files under `client/src/`

---

## Pickup workflow (required)

When dispatched to process all `client` work:

1. List every item in `docs/work-orders/*.md` and `WORK_QUEUE.md` where **Work type** is `client` and **Status** is `Ready`.
2. Drop items blocked by incomplete **Blocked by** dependencies.
3. Sort by **Priority** (P0 → P3), then by work order ID.
4. For each item in order:
   - Set **Status** → `In Progress`
   - Use the work order's **Git branch** unless the item says otherwise
   - Implement only that item's scope
   - Run **Verification** from the item; default includes `npm run check`
   - Update docs listed under **Docs to update when Done**
   - Set **Status** → `Done` (or `Blocked` with reason)
5. Report a summary: items done, skipped, blocked, follow-ups created.

Do not implement `Draft` items.

---

## Responsibilities

- React components, pages, routes, hooks, client-side state
- CSS / theme tokens per `UI_DESIGN.md`
- Call backend APIs defined in specs (do not invent API contracts — read docs or `api` work items)
- Keep mock data clearly labeled until `api` / `persistence` items are done

---

## Not this agent's job

- SQLite, migrations, `DATA_DIR` files → **Persistence Agent** (`persistence`)
- Express routes, server services → **API Agent** (`api`)
- Product spec authoring → **Documentation Designer** (`docs`)
- Unit tests → **Unit Test Agent** (`unit-test`) unless the work item explicitly includes tests in client scope

---

## Verification

Default before marking an item `Done`:

```bash
npm run check
```

Add `npm run build` when changing build config or significant client bundling.

Document manual UI steps when automation is not available.

---

## Git

Per [D-012](../DECISIONS.md): commit on the feature branch after each logical item or one commit per item; merge to `dev` when the work order is complete and reviewed.

---

## Completion standard

All assigned Ready `client` items in the dispatch scope are `Done`, `Blocked` with notes, or explicitly deferred with user approval.
