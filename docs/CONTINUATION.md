# Where we are & how to continue (LapViewer)

**Last updated:** 2026-07-05  
**Focus:** Users & dev account (Roadmap Phase 1)

---

## Current phase

**Phase 1 — Users & dev account** implemented on `feature/users-v1`.

| Area | State |
|------|--------|
| **Auth** | Dev login, session cookie, scoped sessions/tracks |
| **Data + Compare** | Working; requires authenticated dev user in local dev |
| **Intake** | Register + marker UI; auto-save |
| **Next** | Phase 2 — Data screen refactor ([DATA_FORM_V2.md](features/DATA_FORM_V2.md)) |

---

## Run the app locally

```bash
npm run install:all   # if needed
npm run dev
```

- UI: http://localhost:5173 — click **Continue as Dev** on first visit  
- API: http://localhost:3000/api/health (`devUserMode: true` when using `npm run dev`)

`npm start` (no dev flag) does not seed the dev user; data routes return 401 until Phase 4 real login.

---

## Verification

```bash
npm run check
npm run test:auth --prefix server
```

---

## Traceability

- Spec: [features/USERS_V1.md](features/USERS_V1.md)
- Work order: [work-orders/WO-users-v1.md](work-orders/WO-users-v1.md)
- Decision: [DECISIONS.md](DECISIONS.md) D-018
