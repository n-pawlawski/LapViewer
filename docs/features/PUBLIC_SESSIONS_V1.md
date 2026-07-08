# Public Sessions — v1

**Status:** Implemented  
**Phase:** Roadmap Phase 4 (multi-user foundation)  
**Related:** [USERS_V1.md](USERS_V1.md), [DECISIONS.md](../DECISIONS.md) D-030, [WO-public-sessions.md](../work-orders/WO-public-sessions.md)

---

## Intent

Let authenticated users **share uploaded sessions** with other accounts and **browse public sessions** from other drivers. Public viewers can compare their laps against shared sessions. Ignored laps from intake are **not** included in shared views.

---

## Scope

| In scope | Out of scope |
|----------|--------------|
| Session-level `isPublic` toggle (owner only) | Anonymous / unauthenticated URLs |
| My sessions \| Public sessions tabs on Data | Public sessions in owner's All laps tab |
| Read-only public session detail + video (S3) | Full removal of `local_path` legacy rows |
| Cross-owner Compare | Leagues, permissions to publish |

---

## Rules

1. **Make public** only when `storageKind=s3` and `uploadStatus=complete`.
2. **Legacy `local_path`** sessions cannot be shared (toggle disabled).
3. **Ignored laps** are stripped server-side for non-owner API responses.
4. **Private fields** (`sourcePath`, `notes`, `objectKey`) are omitted for viewers.
5. All mutation routes (markers, intake, delete) remain **owner-only**.

---

## API

| Method | Path | Behavior |
|--------|------|----------|
| GET | `/api/sessions` | Owner's sessions; includes `isPublic` |
| GET | `/api/sessions/public` | Other users' public S3 sessions |
| GET | `/api/sessions/:id` | Owner or public viewer |
| PATCH | `/api/sessions/:id` | `{ isPublic?: boolean }` — owner only |
| GET | `/api/video/:sessionId` | Owner or public S3 session |
| GET | `/api/laps/public` | Flat laps from public sessions (optional client use) |

---

## UI

- Data left pane: **My sessions \| Public sessions** switcher under Sessions title.
- Owner session strip: **Make public** / **Make private** + Public badge.
- Public session cards: owner display name subline.
- Non-owned session: read-only strip; lap table + Compare enabled; no Intake/Edit/Delete.
- Compare: marker frame adjust disabled for non-owned panes.

---

## Verification

```bash
node server/scripts/public-sessions-test.mjs
node server/scripts/auth-isolation-test.mjs
npm run check
```

Manual: User A uploads, marks laps (one ignored), makes public → User B sees session in Public tab without ignored lap; Compare works.
