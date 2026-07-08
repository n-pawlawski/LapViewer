# Development Guide

How to run LapViewer locally and follow the git/verification workflow.

Process principles: [Process Hygiene](PROCESS_HYGIENE.md).

---

## Prerequisites

- [Node.js](https://nodejs.org/) LTS (20+)
- Git
- Windows paths for video library (see [Architecture](ARCHITECTURE.md))

---

## Setup

```bash
npm run install:all
```

---

## Daily commands


| Command         | Purpose                                               |
| --------------- | ----------------------------------------------------- |
| `npm run dev`   | Client (5173) + server (3000) with hot reload         |
| `npm run check` | **Default verification** — TypeScript client + server |
| `npm run build` | Production client build                               |
| `npm run start` | Server only (after build if serving static client)    |


Open [http://localhost:5173](http://localhost:5173) after `npm run dev`.

### Run dev and Docker together

| Mode | URL | API |
|------|-----|-----|
| **Dev** (hot reload) | [http://localhost:5173](http://localhost:5173) | `localhost:3000` |
| **Docker** (prod parity) | [http://deltaview.docker:3090](http://deltaview.docker:3090) | same host (built client) |

Docker uses port **3090** so it does not conflict with the dev server on **3000** (or other stacks on 3080).

**One-time hosts setup** (Administrator PowerShell):

```powershell
npm run docker:hosts
```

Or add manually to `C:\Windows\System32\drivers\etc\hosts` (see `config/docker-hosts.snippet`):

```text
127.0.0.1 deltaview.docker
```

Then start Docker (separate terminal from `npm run dev`):

```powershell
npm run docker:up
```

**Video library in Docker:** copy `config/docker.env.example` to `.env` at the repo root and set `VIDEO_HOST_PATH` if your footage is not on `E:/Racing Videos`. Compose mounts that folder at `/videos` inside the container — no Docker Desktop volume edits needed.

```powershell
copy config\docker.env.example .env
# edit .env if your racing videos live elsewhere
```

Sessions store a `relativePath` under the library root, so the same database resolves correctly in native dev (`E:\...`) and Docker (`/videos/...`).

Health: [http://deltaview.docker:3090/api/ops/status](http://deltaview.docker:3090/api/ops/status)

### Auth and dev account

| Variable | When | Purpose |
|----------|------|---------|
| `GOOGLE_CLIENT_ID` | Production / optional local | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Production / optional local | Google OAuth client secret |
| `GOOGLE_REDIRECT_URI` | Optional | OAuth callback URL (default: `CLIENT_ORIGIN/api/auth/google/callback`) |
| `LAPVIEWER_DEV_USER=1` | Set automatically by `npm run dev` (server) | Seeds dev user **`root` / `root`** |
| `NODE_ENV=development` | Alternative to above | Same dev-user behavior |
| `SESSION_SECRET` | Optional | HMAC secret for session cookies (set before any hosted deploy) |
| `CLIENT_ORIGIN` | Optional | CORS origin (default `http://localhost:5173`) |

Production sign-in uses **Google OAuth only**. Password registration is disabled. In dev mode you can still sign in as **`root` / `root`** from the gate’s **Dev login** section.

#### Google Cloud OAuth setup (one-time)

1. Open [Google Cloud Console](https://console.cloud.google.com/) and create or select a project.
2. **APIs & Services → OAuth consent screen**
   - User type: **External**
   - App name: **DeltaView**
   - While the app is in **Testing**, add your Google account under **Test users**.
3. **Credentials → Create credentials → OAuth client ID → Web application**
4. Add **Authorized redirect URIs** (must match exactly):
   - Docker (Google OAuth): `http://deltaview.docker.com:3090/api/auth/google/callback`
   - Native dev (Vite): `http://localhost:5173/api/auth/google/callback`
   - Production: `https://deltaview.info/api/auth/google/callback` (or your live domain)

   Google rejects `deltaview.docker` and `*.localhost` — use `deltaview.docker.com` with a hosts entry (`npm run docker:hosts`).
5. Copy **Client ID** and **Client secret** into repo-root `.env` (never commit):

```env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
```

For Docker, the same values are read from `.env` via `docker-compose.yml`.

| Command | Dev user | API without login |
|---------|----------|-------------------|
| `npm run dev` | Seeded if missing | 401 on data routes |
| `npm start` | **Not** seeded | 401 on data routes |

After `npm run dev`, sign in with **Continue with Google** (when configured) or **Dev login** with **`root` / `root`**. The dev account shows a **DEV ACCOUNT** badge in the header.

Verify auth isolation: `npm run test:auth --prefix server`

---

## Git workflow (summary)

1. Ensure you are on `dev` and up to date: `git checkout dev`
2. Create a branch: `git checkout -b feature/ui-shell`
3. Implement; run `npm run check`
4. Commit logical units with clear messages (agents do this per [D-012](DECISIONS.md))
5. Merge back to `dev` after review; push when `origin` exists

Do not commit secrets. `.env` and `data/` are gitignored.

Full rules: [Process Hygiene — Git workflow](PROCESS_HYGIENE.md#git-workflow).

---

## First-time repository setup

If you clone a repo that already has history, skip this section.

For a fresh init (already done in this project):

```bash
git init -b dev
git status   # review untracked files before first commit
```

**Baseline commit:** completed on `dev` (see `git log`). Create feature branches for new work:

```bash
git checkout dev
git checkout -b feature/ui-shell
```

---

## Agent verification

Before marking a work item complete, agents should run:

```bash
npm run check
```

and note the result in the work item or handoff comment.