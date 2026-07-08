# Context: Permission redirect browser checklist (WO-unit-test-gate-04)

**Work item:** WO-unit-test-gate-04  
**Requires:** App running (`npm run dev`), two accounts

---

## Setup

1. **Dev account** (`root` / `root`) — has all permissions via dev seed.
2. **Restricted user** — sign in via Google or create user with `permissions: []` via admin panel.

To strip dev permissions for negative UI tests, use admin panel on a **non-dev** test account (do not remove dev user grants in shared DB).

---

## Checklist

Record **Pass / Fail / N/A** in `WO-unit-test-gate.md` Notes.

| # | Steps | Expected |
|---|--------|----------|
| 1 | Log in as restricted. Open `/tracks` directly | Redirect to `/` (Data) |
| 2 | Restricted user — header nav | **Tracks** tab not visible |
| 3 | Restricted — Intake session metadata | **Manage tracks** button hidden |
| 4 | Restricted — open `/account/stats` | Redirect to `/account` |
| 5 | Restricted — open `/account#account-permissions` | Redirect to `/account`; permissions section not shown |
| 6 | Admin — open `/account#account-permissions` | Permissions table visible |
| 7 | Restricted — Data session strip | **Delete** button hidden |
| 8 | Restricted — session edit modal | No delete button |
| 9 | Grant `sessions.delete` only — reload | Delete appears; DELETE API succeeds |
| 10 | Grant `tracks.manage` — reload | Tracks tab + `/tracks` accessible |
| 11 | Revoke `tracks.manage` — POST create track via UI | Server 403 or UI error if attempted |

---

## API spot-checks (optional)

With browser devtools or curl + session cookie:

- `DELETE /api/sessions/:id` without `sessions.delete` → 403 JSON
- `POST /api/tracks` without `tracks.manage` → 403 JSON

Cross-check with WO-unit-test-gate-01 script results.

---

## Evidence

Paste summary table into work order **Notes** section. Screenshots optional.

---

## Gaps → new work items

If redirect missing or wrong target, file `client` work item on same WO with `Blocked by: none`, do not mark 04 Done.
