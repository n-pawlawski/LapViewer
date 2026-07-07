# Application Architecture

How LapViewer is structured and how you run it day to day. Stack: **React (Vite) frontend + Node backend**, local-first on your Windows PC.

Related: [Technical Approach](TECHNICAL_APPROACH.md), [Persistence](PERSISTENCE.md), [Open Questions §4](OPEN_QUESTIONS.md).

---

## High-level shape

**Monorepo, two processes in development, one process when “running for real” locally.**

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser  →  http://localhost:5173 (dev) or :3000 (local run)   │
└───────────────────────────────┬─────────────────────────────────┘
                                │
        ┌───────────────────────┴───────────────────────┐
        │                                                 │
        ▼                                                 ▼
┌───────────────────┐                         ┌───────────────────┐
│  React + Vite     │   /api/*  proxy (dev)   │  Node API         │
│  UI Forms         │ ──────────────────────▶ │  REST + file serve│
│  Data / Intake /  │                         │  ffmpeg jobs      │
│  Comparison       │                         │  SQLite           │
└───────────────────┘                         └─────────┬─────────┘
                                                        │
                        ┌───────────────────────────────┼───────────────────────────────┐
                        ▼                               ▼                               ▼
                 ┌─────────────┐              ┌─────────────────┐              ┌──────────────┐
                 │  SQLite     │              │  App data dir   │              │  Video drive │
                 │  sessions,  │              │  scrub proxies, │              │  GoPro files │
                 │  markers    │              │  thumbnails     │              │  (paths only)│
                 └─────────────┘              └─────────────────┘              └──────────────┘
```

| Layer | Technology | Role |
|-------|------------|------|
| **Frontend** | React, TypeScript, Vite | Three forms: Data, Intake, Comparison |
| **Backend** | Node (Fastify or Express) | API, video streaming with Range, ffmpeg, SQLite |
| **Database** | SQLite | Session metadata, lap markers, paths to originals + proxies |
| **Video processing** | ffmpeg / ffprobe | Scrub proxy generation on intake (system binary) |
| **Original videos** | Your existing drive | Path pointers only — no copy |
| **Derived cache** | App data directory | Scrub proxies, thumbnails |

---

## Persistence requirement

Persistence is mandatory. Added videos and lap markers must survive browser refreshes, server restarts, PC reboots, and Docker/container rebuilds.

Use [Persistence](PERSISTENCE.md) as the source of truth for durable storage rules.

| Data | Durable location |
|------|------------------|
| SQLite DB | `DATA_DIR/lapviewer.db` |
| Scrub proxies/cache | `DATA_DIR/cache/{sessionId}/` |
| Original videos | `VIDEO_LIBRARY_ROOT` |

If running in Docker, both `DATA_DIR` and `VIDEO_LIBRARY_ROOT` must be mounted from the host. Do not store the SQLite DB only inside the container filesystem.

---

## Video library data ownership

The [Video Library](VIDEO_LIBRARY.md) is the source of truth for videos that have been added to LapViewer.

| Data | Stored where | Notes |
|------|--------------|-------|
| Original GoPro file | Existing racing video drive | Never copied by default |
| Session row | SQLite | Title, path, status, probe metadata |
| Lap markers | SQLite | Timestamp markers tied to a session |
| Computed laps | Derived from markers | No table required in v1 |
| Scrub proxy / thumbnails | `DATA_DIR/cache/{sessionId}/` | Rebuildable derived files |

The Data form lists session rows from SQLite. Selecting a row makes that session the active video for details, lap display, Intake edit mode, and Comparison selection.

---

## Repository layout (proposed)

```
LapViewer/
├── client/                 # React + Vite frontend
│   ├── src/
│   │   ├── pages/          # Data, Intake, Comparison routes
│   │   ├── components/
│   │   └── api/            # fetch wrappers
│   └── vite.config.ts      # dev proxy → backend
├── server/                 # Node API
│   ├── src/
│   │   ├── routes/
│   │   ├── db/             # SQLite schema + queries
│   │   ├── video/          # Range streaming, ffmpeg jobs
│   │   └── config.ts       # paths from env
│   └── package.json
├── data/                     # gitignored — default app data root
│   ├── lapviewer.db
│   └── cache/{sessionId}/
├── config/
│   └── .env.example        # VIDEO_LIBRARY_ROOT, DATA_DIR, PORT
├── docs/
└── package.json            # workspace root; npm run dev starts both
```

---

## How the frontend and backend talk

| Concern | Owner |
|---------|--------|
| UI, routing, forms | Frontend |
| Session CRUD, video selection data, lap markers | Backend API → SQLite |
| Register video path, probe file | Backend (ffprobe) |
| Generate scrub proxy | Backend (ffmpeg, background job) |
| Stream original + proxy video | Backend (`GET /api/video/:id` with Range headers) |
| File picker path | Frontend calls backend with chosen path (backend validates under `VIDEO_LIBRARY_ROOT`) |

**Development:** Vite on port **5173**; API on **3000**; Vite proxies `/api` to the backend.

**Local run (daily use):** Build frontend to static files; Node serves `client/dist` and `/api` on one port (**3000**). You open one URL in the browser.

---

## Local native vs Docker

**Recommendation:** Use **Docker Compose (Mode C)** for production-parity testing (MinIO + browser upload). Use **native Node (Mode A)** for day-to-day UI iteration with MinIO sidecar.

### Why browser upload + object storage

| Factor | Path registration (legacy) | Browser upload + S3/MinIO |
|--------|---------------------------|----------------------------|
| **Containers** | File picker fails in Docker; volume mounts awkward | Same flow in Docker and ECS |
| **ffmpeg processing** | Direct filesystem read | Materialize from object store to cache |
| **Multi-user SaaS** | Not viable on ECS | Presigned PUT + Range GET ([D-026](DECISIONS.md)) |
| **Dev parity** | Different UX per environment | One Intake flow everywhere ([D-028](DECISIONS.md)) |

### Suggested approach

```
Daily UI work:     npm run dev + MinIO sidecar (docker compose up minio minio-init -d)
Parity testing:    docker compose up --build
Production:        ECS + AWS S3
```

Legacy `local_path` sessions remain supported for existing data.

---

## Runtime modes

### Mode A — Development (default while building)

```bash
npm run dev
```

- Starts Vite (frontend) + Node (API) concurrently.
- Browser: `http://localhost:5173`
- API: `http://localhost:3000/api/...`

### Mode B — Local production (how you run it after install)

```bash
npm run build
npm start
```

- Node serves built React app + API on `http://localhost:3000`
- Same machine, no container.

### Mode C — Docker (production parity)

```bash
npm run docker:hosts   # once, elevated — adds deltaview.docker → 127.0.0.1
docker compose up --build
```

- Browser: `http://deltaview.docker:3090` (port **3090** avoids conflict with dev API on **3000**)
- Container runs Node + bundled ffmpeg + built client + MinIO (S3-compatible)
- **Volumes:** `lapviewer-data:/data` (SQLite, cache); `minio-data` (object storage)
- Env: `STORAGE_BACKEND=s3`, `S3_BUCKET=lapviewer-videos`, `AWS_ENDPOINT_URL=http://minio:9000`
- Browser upload uses `S3_PUBLIC_ENDPOINT=http://127.0.0.1:9000` for presigned PUT URLs

Persistence depends on named volumes. If `lapviewer-data` is omitted, the SQLite DB can disappear when the container is recreated.

---

## Configuration

Single config surface (environment or `.env`):

| Variable | Example | Purpose |
|----------|---------|---------|
| `VIDEO_LIBRARY_ROOT` | `D:\RacingFootage` | Root for path validation / file picker scope |
| `DATA_DIR` | `./data` | SQLite + scrub proxy cache |
| `PORT` | `3000` | API (+ static UI in local run mode) |
| `FFMPEG_PATH` | `ffmpeg` | Optional; default assumes ffmpeg on PATH |

Paths stored in SQLite should include the runtime path and relative path:

- `sourceRoot`: configured root, e.g. `E:\Racing Videos` or `/videos`
- `relativePath`: path under the root, e.g. `2-19 racing league/GX010012.MP4`
- `sourcePath`: backend-readable resolved path

The relative path keeps the database portable if we switch between native Windows and Docker path mappings.

---

## Backend responsibilities (Node)

| Module | Responsibility |
|--------|----------------|
| `sessions` | CRUD, register path, list/select data for Data form |
| `markers` | Lap marker CRUD per session |
| `laps` | Computed lap times from markers |
| `video` | Stream original/proxy with HTTP Range |
| `jobs` | ffmpeg scrub proxy queue, status polling |
| `health` | ffmpeg/ffprobe available, paths writable |

No separate job worker process for v1 — ffmpeg runs as a child process on the same Node server; intake UI polls job status.

---

## Frontend responsibilities (React)

| Route | Form |
|-------|------|
| `/` | Data — sessions + laps |
| `/intake`, `/intake/:sessionId` | Intake — register + markers |
| `/compare?laps=…` | Comparison — multi-pane sync |

Client-side: video elements point at backend URLs (`/api/video/:id?variant=proxy|original`), not at `file://` paths — browsers block local file access from web pages.

---

## Security note (local app)

- Bind API to **localhost only** (`127.0.0.1`) unless you intentionally expose on LAN.
- **Auth (Phase 1):** Data routes require a signed httpOnly session cookie. Dev mode seeds a fixed dev user and exposes `POST /api/auth/dev-login`; `npm start` without dev flags returns 401 until real login (Phase 4).
- Validate all file paths stay under `VIDEO_LIBRARY_ROOT` to avoid path traversal if API is ever exposed.

---

## Decision summary (draft)

| Question | Proposal |
|----------|----------|
| Frontend | React + TypeScript + Vite |
| Backend | Node (Fastify or Express) |
| Run where | **Your Windows PC, locally** |
| Container | **Optional later**, not default for dev or v1 |
| Processes | Dev: 2 (Vite + Node); local run: 1 (Node serves all) |
| Internet | Fully offline after Node + ffmpeg installed |
| Persistence | SQLite in durable `DATA_DIR`; Docker requires host volume |

**Your confirmation:** Local native OK, or do you prefer Docker from day one?

---

## Next steps after architecture sign-off

1. Scaffold monorepo (`client/`, `server/`, root scripts).
2. `.env.example` with `VIDEO_LIBRARY_ROOT` and `DATA_DIR`.
3. Health endpoint checks ffmpeg + SQLite.
4. Empty Data / Intake / Comparison routes.

See [Technical Approach — implementation phases](TECHNICAL_APPROACH.md#suggested-implementation-phases).
