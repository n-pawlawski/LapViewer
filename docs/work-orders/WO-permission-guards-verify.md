# WO-permission-guards-verify — Permission UI & redirect verification

**Work order ID:** WO-permission-guards-verify  
**Feature status:** Ready for implementation  
**Priority:** P2  
**Git branch:** `feature/permission-guards-verify`

**Parallel safe:** Yes — independent of `WO-unit-test-gate` (different branch). Can run Browser QA agent while unit-test agents work on 4C.

## Source of truth

- Implementation (on `dev`): `client/src/components/RequirePermission.tsx`, `client/src/lib/permissions.ts`, `client/src/App.tsx`, `client/src/components/AppShell.tsx`
- Server: `server/src/middleware/requirePermission.ts`, `server/src/routes/tracks.ts`, `server/src/routes/sessions.ts`
- Manual checklist: `docs/agents/browser-qa/context/permission-redirects-checklist.md`

## Feature summary

Verify and document that permission guards behave correctly end-to-end. Code may already be merged; this WO is **verification + gap fixes** only.

## Acceptance criteria

- [ ] Browser checklist all Pass (or gaps fixed)
- [ ] `docs/features/USERS_V1.md` or `docs/TESTING_STRATEGY.md` mentions client redirect matrix
- [ ] No unauthorized access to track admin or user permissions panel

## Item index

| ID | Work type | Status | Title | Blocked by |
|----|-----------|--------|-------|------------|
| WO-permission-guards-verify-01 | browser-qa | **Ready** | Execute redirect checklist | — |
| WO-permission-guards-verify-02 | client | Draft | Fix any checklist failures | 01 |
| WO-permission-guards-verify-03 | review | Draft | Sign-off | 01, 02 |

---

## WO-permission-guards-verify-01 — Execute redirect checklist

**Work type:** `browser-qa`  
**Status:** Ready  
**Auxiliary context:** `docs/agents/browser-qa/context/permission-redirects-checklist.md`

Run checklist; record results in this file's Notes. If all pass, skip 02 and mark 03 Ready.

---

## WO-permission-guards-verify-02 — Fix checklist failures

**Work type:** `client`  
**Status:** Draft  
**Blocked by:** 01

Only implement if checklist found failures. May also touch `api` if server gap found.

---

## WO-permission-guards-verify-03 — Review

**Work type:** `review`  
**Status:** Draft  
**Blocked by:** 01, 02

---

## Notes

*(Browser QA: paste checklist results here.)*
