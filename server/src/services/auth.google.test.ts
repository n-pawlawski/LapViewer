import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "lapviewer-google-auth-"));

process.env.DATA_DIR = tmpDir;
process.env.LAPVIEWER_DEV_USER = "1";

const { initDatabase, closeDatabase } = await import("../db/database.js");
const { findOrCreateGoogleUser } = await import("./auth.js");
const { createUser, getUserByEmail, getUserByGoogleSub } = await import("../db/users.js");

test("findOrCreateGoogleUser creates a new Google account", () => {
  initDatabase();
  const user = findOrCreateGoogleUser({
    sub: "google-sub-1",
    email: "driver@example.com",
    displayName: "Test Driver",
    emailVerified: true,
  });

  assert.equal(user.email, "driver@example.com");
  assert.equal(user.displayName, "Test Driver");
  assert.equal(user.googleSub, "google-sub-1");
  assert.equal(user.passwordHash, null);
});

test("findOrCreateGoogleUser logs in an existing Google account", () => {
  const again = findOrCreateGoogleUser({
    sub: "google-sub-1",
    email: "driver@example.com",
    displayName: "Changed Name",
    emailVerified: true,
  });
  assert.equal(again.googleSub, "google-sub-1");
  assert.equal(getUserByGoogleSub("google-sub-1")?.id, again.id);
});

test("findOrCreateGoogleUser links a legacy email account to Google", () => {
  const legacy = createUser({
    email: "legacy@example.com",
    displayName: "Legacy Driver",
    passwordHash: "hash",
  });

  const linked = findOrCreateGoogleUser({
    sub: "google-sub-legacy",
    email: "legacy@example.com",
    displayName: "Legacy Driver",
    emailVerified: true,
  });

  assert.equal(linked.id, legacy.id);
  assert.equal(getUserByEmail("legacy@example.com")?.googleSub, "google-sub-legacy");
});

test("findOrCreateGoogleUser rejects unverified email", () => {
  assert.throws(
    () =>
      findOrCreateGoogleUser({
        sub: "google-sub-unverified",
        email: "unverified@example.com",
        displayName: "No Verify",
        emailVerified: false,
      }),
    /not verified/,
  );
});

test.after(() => {
  closeDatabase();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});
