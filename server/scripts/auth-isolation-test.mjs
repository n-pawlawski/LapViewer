/**
 * Lightweight auth isolation checks for users v1.
 * Run: node server/scripts/auth-isolation-test.mjs
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "lapviewer-auth-"));

process.env.DATA_DIR = tmpDir;
process.env.LAPVIEWER_DEV_USER = "1";

const { initDatabase, closeDatabase } = await import("../src/db/database.js");
const { seedDevUserIfNeeded } = await import("../src/db/devSeed.js");
const { DEV_USER_ID } = await import("../src/db/users.js");
const { createSession, getSessionById, listSessions } = await import(
  "../src/services/sessions.js"
);
const { authenticateUser, registerUser } = await import("../src/services/auth.js");
const { signUserId } = await import("../src/auth/session.js");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

try {
  initDatabase();
  const devUserId = seedDevUserIfNeeded();
  assert(devUserId === DEV_USER_ID, "dev user should be seeded in dev mode");

  const devAuth = await authenticateUser("root", "root");
  assert(devAuth?.id === DEV_USER_ID, "dev user can sign in as root/root");

  const session = createSession(
    { sourcePath: "E:\\Racing Videos\\test\\GX000001.MP4", title: "Auth test" },
    devUserId,
  );
  assert(listSessions(devUserId).length === 1, "dev user should see one session");
  assert(getSessionById(session.id, devUserId) !== null, "dev user can read own session");

  const other = await registerUser({
    email: "other@lapviewer.local",
    password: "password123",
    displayName: "Other Driver",
  });
  assert(listSessions(other.id).length === 0, "other user should see no sessions");
  assert(
    getSessionById(session.id, other.id) === null,
    "other user cannot read dev user's session",
  );

  const authed = await authenticateUser("other@lapviewer.local", "password123");
  assert(authed?.id === other.id, "registered user can log in with password");
  const badLogin = await authenticateUser("other@lapviewer.local", "wrong-password");
  assert(badLogin === null, "wrong password should fail login");

  const token = signUserId(devUserId);
  assert(typeof token === "string" && token.includes("."), "session token should be signed");

  console.log("auth-isolation-test: all checks passed");
} finally {
  closeDatabase();
  fs.rmSync(tmpDir, { recursive: true, force: true });
}
