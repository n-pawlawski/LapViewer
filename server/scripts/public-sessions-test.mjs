/**
 * Public session sharing checks.
 * Run: node server/scripts/public-sessions-test.mjs
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "lapviewer-public-"));

process.env.DATA_DIR = tmpDir;
process.env.LAPVIEWER_DEV_USER = "1";

const { initDatabase, closeDatabase, getDb } = await import("../src/db/database.js");
const { seedDevUserIfNeeded } = await import("../src/db/devSeed.js");
const { DEV_USER_ID } = await import("../src/db/users.js");
const { findOrCreateGoogleUser } = await import("../src/services/auth.js");
const {
  createS3UploadSession,
  getSessionById,
  getSessionVideoTarget,
  insertMarker,
  listPublicSessions,
  updateMarker,
  updateSession,
} = await import("../src/services/sessions.js");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function completeS3Session(sessionId, userId) {
  getDb()
    .prepare(
      `UPDATE sessions SET uploadStatus = 'complete', status = 'ready', durationSeconds = 120 WHERE id = ? AND userId = ?`,
    )
    .run(sessionId, userId);
}

try {
  initDatabase();
  const devUserId = seedDevUserIfNeeded();
  assert(devUserId === DEV_USER_ID, "dev user should be seeded");

  const other = findOrCreateGoogleUser({
    sub: "google-sub-public-viewer",
    email: "viewer@lapviewer.local",
    displayName: "Viewer",
    emailVerified: true,
  });

  const sessionId = randomUUID();
  createS3UploadSession(
    { sessionId, fileName: "GX010012.MP4", title: "Public test session" },
    devUserId,
  );
  completeS3Session(sessionId, devUserId);

  insertMarker(sessionId, 0, undefined, devUserId);
  insertMarker(sessionId, 60, undefined, devUserId);
  const ignoredMarker = insertMarker(sessionId, 90, undefined, devUserId);
  insertMarker(sessionId, 120, undefined, devUserId);
  updateMarker(ignoredMarker.id, { ignored: true }, devUserId);

  try {
    updateSession(sessionId, { isPublic: true }, other.id);
    assert(false, "non-owner should not toggle public");
  } catch (err) {
    assert(err?.code === "NOT_FOUND", "non-owner patch should 404");
  }

  const published = updateSession(sessionId, { isPublic: true }, devUserId);
  assert(published.isPublic === true, "owner can make session public");

  assert(listPublicSessions(devUserId).length === 0, "owner does not see own session in public list");

  const publicList = listPublicSessions(other.id);
  assert(publicList.length === 1, "viewer should see one public session");
  assert(publicList[0].ownerDisplayName === "Root", "public list includes owner display name");

  const ownerView = getSessionById(sessionId, devUserId);
  assert(ownerView !== null, "owner can read session");
  assert(ownerView.laps.some((lap) => lap.ignored), "owner still sees ignored laps");

  const viewerView = getSessionById(sessionId, other.id);
  assert(viewerView !== null, "viewer can read public session");
  assert(viewerView.isOwner === false, "viewer is not owner");
  assert(!viewerView.laps.some((lap) => lap.ignored), "viewer does not see ignored laps");
  assert(viewerView.notes === undefined, "viewer does not see notes");
  assert(viewerView.sourcePath === "", "viewer does not see source path");

  const videoTarget = getSessionVideoTarget(sessionId, other.id);
  assert(videoTarget?.kind === "s3", "viewer can stream public S3 video");

  updateSession(sessionId, { isPublic: false }, devUserId);
  assert(getSessionById(sessionId, other.id) === null, "private session blocked for viewer");

  console.log("public-sessions-test: all checks passed");
} finally {
  closeDatabase();
  fs.rmSync(tmpDir, { recursive: true, force: true });
}
