import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "lapviewer-stats-"));

process.env.DATA_DIR = tmpDir;
process.env.LAPVIEWER_DEV_USER = "1";

const { initDatabase, closeDatabase, getDb } = await import("../db/database.js");
const { createUser } = await import("../db/users.js");
const {
  initializeStatsCatalog,
  incrementUserStat,
  getUserStats,
  recordUserLogin,
} = await import("./stats.js");

function createSession(userId: string): void {
  const id = randomUUID();
  const ts = new Date().toISOString();
  getDb()
    .prepare(
      `INSERT INTO sessions (
        id, userId, title, sourcePath, sourceRoot, relativePath, fileName,
        camera, status, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'GoPro', 'ready', ?, ?)`,
    )
    .run(id, userId, "Test", `/videos/${id}.mp4`, "/videos", `${id}.mp4`, `${id}.mp4`, ts, ts);
}

function createTrack(userId: string, name: string): void {
  const id = randomUUID();
  const ts = new Date().toISOString();
  getDb()
    .prepare(
      `INSERT INTO tracks (id, userId, name, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)`,
    )
    .run(id, userId, name, ts, ts);
}

test("initializeStatsCatalog seeds default stat definitions", () => {
  initDatabase();
  initializeStatsCatalog();
  const rows = getDb()
    .prepare(`SELECT key, kind FROM stat_definitions ORDER BY key`)
    .all() as Array<{ key: string; kind: string }>;
  assert.deepEqual(
    rows.map((row) => row.key),
    ["auth.login_count", "sessions.count", "tracks.count"],
  );
});

test("incrementUserStat increases counter and rejects computed keys", () => {
  initDatabase();
  initializeStatsCatalog();
  const user = createUser({
    email: "stats@example.com",
    displayName: "Stats User",
    passwordHash: null,
  });

  incrementUserStat(user.id, "auth.login_count");
  incrementUserStat(user.id, "auth.login_count");

  const stats = getUserStats(user.id);
  const loginStat = stats.find((item) => item.key === "auth.login_count");
  assert.equal(loginStat?.value, 2);
  assert.equal(loginStat?.kind, "counter");

  assert.throws(() => incrementUserStat(user.id, "sessions.count"), /not a counter/);
  assert.throws(() => incrementUserStat(user.id, "unknown.stat"), /Unknown stat key/);
});

test("getUserStats resolves computed session and track counts", () => {
  initDatabase();
  initializeStatsCatalog();
  const user = createUser({
    email: "computed@example.com",
    displayName: "Computed User",
    passwordHash: null,
  });

  createSession(user.id);
  createSession(user.id);
  createTrack(user.id, `Track-${randomUUID()}`);

  const stats = getUserStats(user.id);
  assert.equal(stats.find((item) => item.key === "sessions.count")?.value, 2);
  assert.equal(stats.find((item) => item.key === "tracks.count")?.value, 1);
});

test("recordUserLogin increments auth.login_count", () => {
  initDatabase();
  initializeStatsCatalog();
  const user = createUser({
    email: "login@example.com",
    displayName: "Login User",
    passwordHash: null,
  });

  recordUserLogin(user.id);
  const stats = getUserStats(user.id);
  assert.equal(stats.find((item) => item.key === "auth.login_count")?.value, 1);
});

test.after(() => {
  closeDatabase();
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code !== "EBUSY" && code !== "EPERM") {
      throw err;
    }
  }
});
