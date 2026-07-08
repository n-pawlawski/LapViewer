/**
 * HTTP permission middleware checks for protected routes.
 * Run: npm run test:permissions --prefix server
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cookieParser from "cookie-parser";
import express from "express";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "lapviewer-perms-"));

process.env.DATA_DIR = tmpDir;
process.env.LAPVIEWER_DEV_USER = "1";
process.env.SESSION_SECRET = "permissions-test-session-secret";
process.env.NODE_ENV = "development";

const { initDatabase, closeDatabase } = await import("../src/db/database.js");
const { seedDevUserIfNeeded } = await import("../src/db/devSeed.js");
const { DEV_USER_ID, updateUserPermissions } = await import("../src/db/users.js");
const { findOrCreateGoogleUser } = await import("../src/services/auth.js");
const { AUTH_COOKIE_NAME, signUserId } = await import("../src/auth/session.js");
const { requireAuth } = await import("../src/middleware/auth.js");
const { tracksRouter } = await import("../src/routes/tracks.js");
const { sessionsRouter } = await import("../src/routes/sessions.js");
const { statsRouter } = await import("../src/routes/stats.js");
const { createSession } = await import("../src/services/sessions.js");
const { initializeStatsCatalog } = await import("../src/services/stats.js");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function authCookie(userId) {
  return `${AUTH_COOKIE_NAME}=${signUserId(userId)}`;
}

async function request(baseUrl, userId, method, urlPath, body) {
  const headers = {};
  if (userId) {
    headers.Cookie = authCookie(userId);
  }
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  const res = await fetch(`${baseUrl}${urlPath}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return res.status;
}

function buildApp() {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use("/api/tracks", requireAuth, tracksRouter);
  app.use("/api/sessions", requireAuth, sessionsRouter);
  app.use("/api/stats", requireAuth, statsRouter);
  return app;
}

let server;
let baseUrl;

async function startServer(app) {
  await new Promise((resolve) => {
    server = app.listen(0, "127.0.0.1", () => resolve());
  });
  const addr = server.address();
  if (!addr || typeof addr === "string") {
    throw new Error("Failed to bind test server");
  }
  baseUrl = `http://127.0.0.1:${addr.port}`;
}

async function stopServer() {
  if (!server) return;
  await new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
}

try {
  initDatabase();
  initializeStatsCatalog();
  seedDevUserIfNeeded();

  const restricted = findOrCreateGoogleUser({
    sub: "google-sub-restricted",
    email: "restricted@lapviewer.local",
    displayName: "Restricted",
    emailVerified: true,
  });
  updateUserPermissions(restricted.id, []);

  const deleter = findOrCreateGoogleUser({
    sub: "google-sub-deleter",
    email: "deleter@lapviewer.local",
    displayName: "Deleter",
    emailVerified: true,
  });
  updateUserPermissions(deleter.id, ["sessions.delete"]);

  const trackAdmin = findOrCreateGoogleUser({
    sub: "google-sub-track-admin",
    email: "trackadmin@lapviewer.local",
    displayName: "Track Admin",
    emailVerified: true,
  });
  updateUserPermissions(trackAdmin.id, ["tracks.manage"]);

  const statsViewer = findOrCreateGoogleUser({
    sub: "google-sub-stats-viewer",
    email: "statsviewer@lapviewer.local",
    displayName: "Stats Viewer",
    emailVerified: true,
  });
  updateUserPermissions(statsViewer.id, ["stats.view"]);

  await startServer(buildApp());

  // tracks.manage — list is open; mutations require grant
  assert(
    (await request(baseUrl, restricted.id, "GET", "/api/tracks")) === 200,
    "GET /api/tracks without tracks.manage should be 200",
  );
  assert(
    (await request(baseUrl, restricted.id, "POST", "/api/tracks", { name: "Forbidden Track" })) ===
      403,
    "POST /api/tracks without tracks.manage should be 403",
  );
  assert(
    (await request(baseUrl, trackAdmin.id, "POST", "/api/tracks", { name: "Permitted Track" })) ===
      201,
    "POST /api/tracks with tracks.manage should be 201",
  );

  const ownedTrack = (
    await (
      await fetch(`${baseUrl}/api/tracks`, {
        headers: { Cookie: authCookie(trackAdmin.id) },
      })
    ).json()
  )[0];
  assert(ownedTrack?.id, "track admin should have a track to mutate");

  assert(
    (await request(baseUrl, restricted.id, "PATCH", `/api/tracks/${ownedTrack.id}`, {
      name: "Renamed",
    })) === 403,
    "PATCH /api/tracks/:id without tracks.manage should be 403",
  );
  assert(
    (await request(baseUrl, trackAdmin.id, "PATCH", `/api/tracks/${ownedTrack.id}`, {
      name: "Renamed Track",
    })) === 200,
    "PATCH /api/tracks/:id with tracks.manage should be 200",
  );
  assert(
    (await request(baseUrl, restricted.id, "PUT", `/api/tracks/${ownedTrack.id}/splits`, {
      splits: [{ name: "S1" }],
    })) === 403,
    "PUT /api/tracks/:id/splits without tracks.manage should be 403",
  );
  assert(
    (await request(
      baseUrl,
      trackAdmin.id,
      "PUT",
      `/api/tracks/${ownedTrack.id}/splits`,
      { splits: [{ name: "S1" }] },
    )) === 200,
    "PUT /api/tracks/:id/splits with tracks.manage should be 200",
  );

  // sessions.delete
  const restrictedSession = createSession(
    { sourcePath: "E:\\Racing Videos\\test\\restricted.MP4", title: "Restricted session" },
    restricted.id,
  );
  assert(
    (await request(baseUrl, restricted.id, "DELETE", `/api/sessions/${restrictedSession.id}`)) ===
      403,
    "DELETE /api/sessions/:id without sessions.delete should be 403",
  );

  const deleterSession = createSession(
    { sourcePath: "E:\\Racing Videos\\test\\deleter.MP4", title: "Deleter session" },
    deleter.id,
  );
  assert(
    (await request(baseUrl, deleter.id, "DELETE", `/api/sessions/${deleterSession.id}`)) === 204,
    "DELETE /api/sessions/:id with sessions.delete should be 204",
  );

  // stats.view — admin list requires grant; /me is open to any authed user
  assert(
    (await request(baseUrl, restricted.id, "GET", "/api/stats")) === 403,
    "GET /api/stats without stats.view should be 403",
  );
  assert(
    (await request(baseUrl, statsViewer.id, "GET", "/api/stats")) === 200,
    "GET /api/stats with stats.view should be 200",
  );
  assert(
    (await request(baseUrl, DEV_USER_ID, "GET", "/api/stats")) === 200,
    "dev user (all grants) GET /api/stats should be 200",
  );

  console.log("permissions-test: all checks passed");
} finally {
  await stopServer().catch(() => {});
  closeDatabase();
  fs.rmSync(tmpDir, { recursive: true, force: true });
}
