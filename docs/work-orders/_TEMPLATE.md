# Work order: <Feature title>

**Work order ID:** WO-<short-name>  
**Feature status:** Draft | Ready | In progress | Done  
**Priority:** P0 | P1 | P2  
**Git branch:** `feature/<short-name>` (shared by all items in this WO unless noted)

## Source of truth (read before implementing)

- Feature / product: `docs/FEATURES.md` — <section>
- UX: `docs/UI_FORMS.md`, `docs/UI_DESIGN.md` — <sections>
- Architecture: `docs/ARCHITECTURE.md`
- Persistence: `docs/PERSISTENCE.md`
- Decisions: `docs/DECISIONS.md` — <IDs>

## Feature summary

<One short paragraph: what we are building and why.>

## Acceptance criteria (feature level)

- [ ] …
- [ ] …

## Item index

| ID | Work type | Status | Title |
|----|-----------|--------|-------|
| WO-<name>-01 | persistence | Draft | … |
| WO-<name>-02 | api | Draft | … |
| WO-<name>-03 | client | Draft | … |
| WO-<name>-04 | unit-test | Draft | … |
| WO-<name>-05 | review | Draft | … |

---

## WO-<name>-01 — <Title>

**Work type:** `persistence`  
**Status:** Draft  
**Priority:** P0  
**Blocked by:** —

**Goal:** …

**Context:** …

**Work to perform when Ready:**

- …

**Acceptance criteria:**

- …

**Verification:**

- …

**Docs to update when Done:**

- `docs/PERSISTENCE.md` — …

---

## WO-<name>-02 — <Title>

**Work type:** `api`  
**Status:** Draft  
**Priority:** P0  
**Blocked by:** WO-<name>-01

**Goal:** …

**Context:** …

**Work to perform when Ready:**

- …

**Acceptance criteria:**

- …

**Verification:**

- `npm run check`
- …

**Docs to update when Done:**

- …

---

## WO-<name>-03 — <Title>

**Work type:** `client`  
**Status:** Draft  
**Priority:** P0  
**Blocked by:** WO-<name>-02

**Goal:** …

**Context:** …

**Work to perform when Ready:**

- …

**Acceptance criteria:**

- …

**Verification:**

- `npm run check`
- Manual: …

**Docs to update when Done:**

- …

---

## WO-<name>-04 — <Title>

**Work type:** `unit-test`  
**Status:** Draft  
**Priority:** P1  
**Blocked by:** WO-<name>-02, WO-<name>-03

**Goal:** …

**Verification:**

- `npm test` (when available)

---

## WO-<name>-05 — <Title>

**Work type:** `review`  
**Status:** Draft  
**Priority:** P1  
**Blocked by:** WO-<name>-03, WO-<name>-04

**Goal:** Compare implementation to feature acceptance criteria.

**Verification:**

- Review agent checklist in `docs/agents/REVIEW_VERIFICATION_AGENT.md`

---

## Notes

- …
