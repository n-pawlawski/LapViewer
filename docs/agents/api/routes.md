# API routes

| Method | Path | Purpose | Auth | Notes |
|--------|------|---------|------|-------|
| GET | `/api/health` | Health + dev mode flag | — | Returns `devUserMode` |
| GET | `/api/video/demo` | Demo clip stream | — | Hardcoded path |
| GET | `/api/auth/me` | Current user | cookie optional | 401 if not logged in |
| POST | `/api/auth/register` | Create account | — | Sets session cookie |
| POST | `/api/auth/login` | Username/email + password login | — | Sets session cookie |
| POST | `/api/auth/logout` | Clear session | — | |
| GET | `/api/sessions` | List sessions | cookie | Scoped to `userId` |
| POST | `/api/sessions` | Create session | cookie | |
| GET | `/api/sessions/:id` | Session detail | cookie | 404 if not owned |
| PATCH | `/api/sessions/:id` | Update session | cookie | |
| GET | `/api/sessions/:id/markers` | Lap markers | cookie | |
| POST | `/api/sessions/:id/markers` | Add marker | cookie | |
| POST | `/api/sessions/:id/detect-laps` | Start detection job | cookie | |
| GET | `/api/sessions/:id/frame` | Frame PNG | cookie | |
| PATCH | `/api/markers/:id` | Update marker | cookie | |
| DELETE | `/api/markers/:id` | Delete marker | cookie | |
| GET | `/api/tracks` | List tracks | cookie | Per-user |
| POST | `/api/tracks` | Create track | cookie | |
| GET | `/api/tracks/:id` | Track detail | cookie | |
| PATCH | `/api/tracks/:id` | Update track | cookie | |
| DELETE | `/api/tracks/:id` | Delete track | cookie | |
| PUT | `/api/tracks/:id/splits` | Replace splits | cookie | |
| GET | `/api/tracks/:trackId/detection-profile` | Detection profile | cookie | |
| PUT | `/api/tracks/:trackId/detection-profile` | Update profile | cookie | |
| GET | `/api/tracks/:trackId/detection-profile/bank` | Template bank | cookie | |
| POST | `/api/tracks/:trackId/detection-profile/bank` | Add bank entry | cookie | |
| GET | `/api/detect-laps/:jobId` | Detection job status | cookie | |
| DELETE | `/api/detect-laps/:jobId` | Cancel job | cookie | |
| POST | `/api/system/pick-video-file` | Native file picker | cookie | |
| POST | `/api/system/pick-folder` | Native folder picker | cookie | |
| GET | `/api/video/:sessionId` | Stream session video | cookie | |

## Conventions

- Base path: `/api`
- Auth: signed httpOnly cookie `lapviewer_uid` (HMAC over user id)
- Error shape: `{ "error": "message" }`
- Versioning: none (v1)
