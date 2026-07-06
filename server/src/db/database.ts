import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { DATA_DIR, isDevUserMode } from "../config.js";
import { ensureDevUser } from "./users.js";

let db: Database.Database | null = null;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  sourcePath TEXT NOT NULL UNIQUE,
  sourceRoot TEXT NOT NULL,
  relativePath TEXT NOT NULL,
  fileName TEXT NOT NULL,
  fileSizeBytes INTEGER,
  fileModifiedAt TEXT,
  recordedAt TEXT,
  trackName TEXT,
  notes TEXT,
  camera TEXT NOT NULL DEFAULT 'GoPro',
  durationSeconds REAL,
  videoCodec TEXT,
  width INTEGER,
  height INTEGER,
  frameRate REAL,
  status TEXT NOT NULL DEFAULT 'ready',
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS markers (
  id TEXT PRIMARY KEY,
  sessionId TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  timeSeconds REAL NOT NULL,
  kind TEXT NOT NULL DEFAULT 'lapStart',
  label TEXT,
  ignored INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_markers_session ON markers(sessionId);

CREATE TABLE IF NOT EXISTS tracks (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  videoFolder TEXT,
  notes TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS track_splits (
  id TEXT PRIMARY KEY,
  trackId TEXT NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  splitIndex INTEGER NOT NULL,
  name TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  UNIQUE(trackId, splitIndex)
);

CREATE INDEX IF NOT EXISTS idx_track_splits_track ON track_splits(trackId);

CREATE TABLE IF NOT EXISTS detection_profiles (
  id TEXT PRIMARY KEY,
  trackId TEXT NOT NULL UNIQUE REFERENCES tracks(id) ON DELETE CASCADE,
  roiX0 REAL,
  roiY0 REAL,
  roiX1 REAL,
  roiY1 REAL,
  scanFps INTEGER NOT NULL DEFAULT 5,
  lapTimePriorMs REAL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS detection_bank (
  id TEXT PRIMARY KEY,
  profileId TEXT NOT NULL REFERENCES detection_profiles(id) ON DELETE CASCADE,
  sourceSessionId TEXT NOT NULL,
  timeSeconds REAL NOT NULL,
  roiX0 REAL NOT NULL,
  roiY0 REAL NOT NULL,
  roiX1 REAL NOT NULL,
  roiY1 REAL NOT NULL,
  roiGray BLOB NOT NULL,
  confirmedAt TEXT NOT NULL,
  createdAt TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_detection_bank_profile ON detection_bank(profileId);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  displayName TEXT NOT NULL,
  passwordHash TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  createdAt TEXT NOT NULL
);
`;

function tableColumns(database: Database.Database, table: string): string[] {
  return (
    database.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>
  ).map((col) => col.name);
}

function backfillOrphanUserIds(database: Database.Database): void {
  const orphanSessions = (
    database.prepare(`SELECT COUNT(*) AS c FROM sessions WHERE userId IS NULL`).get() as {
      c: number;
    }
  ).c;
  const orphanTracks = (
    database.prepare(`SELECT COUNT(*) AS c FROM tracks WHERE userId IS NULL`).get() as {
      c: number;
    }
  ).c;
  if (orphanSessions === 0 && orphanTracks === 0) return;

  if (!isDevUserMode()) {
    throw new Error(
      `Database has ${orphanSessions} session(s) and ${orphanTracks} track(s) without userId. ` +
        `Set LAPVIEWER_DEV_USER=1 or NODE_ENV=development to migrate, or delete data/lapviewer.db`,
    );
  }

  const devUserId = ensureDevUser(database);
  database.prepare(`UPDATE sessions SET userId = ? WHERE userId IS NULL`).run(devUserId);
  database.prepare(`UPDATE tracks SET userId = ? WHERE userId IS NULL`).run(devUserId);
}

function rebuildTracksWithUserScope(database: Database.Database): void {
  const table = database
    .prepare(`SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'tracks'`)
    .get() as { sql: string } | undefined;
  if (table?.sql.includes("UNIQUE(userId, name)")) return;

  database.exec(`
    CREATE TABLE tracks_migrated (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL REFERENCES users(id),
      name TEXT NOT NULL,
      videoFolder TEXT,
      notes TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      UNIQUE(userId, name)
    );
    INSERT INTO tracks_migrated (id, userId, name, videoFolder, notes, createdAt, updatedAt)
      SELECT id, userId, name, videoFolder, notes, createdAt, updatedAt FROM tracks;
    DROP TABLE tracks;
    ALTER TABLE tracks_migrated RENAME TO tracks;
    CREATE INDEX IF NOT EXISTS idx_tracks_user ON tracks(userId);
  `);
}

function rebuildSessionsWithUserScope(database: Database.Database): void {
  const table = database
    .prepare(`SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'sessions'`)
    .get() as { sql: string } | undefined;
  if (table?.sql.includes("userId TEXT NOT NULL")) return;

  database.exec(`
    CREATE TABLE sessions_migrated (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL REFERENCES users(id),
      title TEXT NOT NULL,
      sourcePath TEXT NOT NULL UNIQUE,
      sourceRoot TEXT NOT NULL,
      relativePath TEXT NOT NULL,
      fileName TEXT NOT NULL,
      fileSizeBytes INTEGER,
      fileModifiedAt TEXT,
      recordedAt TEXT,
      trackName TEXT,
      notes TEXT,
      camera TEXT NOT NULL DEFAULT 'GoPro',
      durationSeconds REAL,
      videoCodec TEXT,
      width INTEGER,
      height INTEGER,
      frameRate REAL,
      status TEXT NOT NULL DEFAULT 'ready',
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
    INSERT INTO sessions_migrated (
      id, userId, title, sourcePath, sourceRoot, relativePath, fileName,
      fileSizeBytes, fileModifiedAt, recordedAt, trackName, notes, camera,
      durationSeconds, videoCodec, width, height, frameRate, status, createdAt, updatedAt
    )
    SELECT
      id, userId, title, sourcePath, sourceRoot, relativePath, fileName,
      fileSizeBytes, fileModifiedAt, recordedAt, trackName, notes, camera,
      durationSeconds, videoCodec, width, height, frameRate, status, createdAt, updatedAt
    FROM sessions;
    DROP TABLE sessions;
    ALTER TABLE sessions_migrated RENAME TO sessions;
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(userId);
  `);
}

function migrateUserOwnership(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      displayName TEXT NOT NULL,
      passwordHash TEXT,
      role TEXT NOT NULL DEFAULT 'user',
      createdAt TEXT NOT NULL
    );
  `);

  const sessionCols = tableColumns(database, "sessions");
  if (!sessionCols.includes("userId")) {
    database.exec(`ALTER TABLE sessions ADD COLUMN userId TEXT REFERENCES users(id)`);
  }

  const trackCols = tableColumns(database, "tracks");
  if (!trackCols.includes("userId")) {
    database.exec(`ALTER TABLE tracks ADD COLUMN userId TEXT REFERENCES users(id)`);
  }

  backfillOrphanUserIds(database);
  rebuildTracksWithUserScope(database);
  rebuildSessionsWithUserScope(database);
}

export function getDb(): Database.Database {
  if (!db) {
    throw new Error("Database not initialized. Call initDatabase() first.");
  }
  return db;
}

export function initDatabase(): Database.Database {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const dbPath = path.join(DATA_DIR, "lapviewer.db");
  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA);
  migrate(db);
  return db;
}

function migrate(database: Database.Database): void {
  const columns = database
    .prepare(`PRAGMA table_info(markers)`)
    .all() as Array<{ name: string }>;
  if (!columns.some((col) => col.name === "ignored")) {
    database.exec(`ALTER TABLE markers ADD COLUMN ignored INTEGER NOT NULL DEFAULT 0`);
  }
  if (!columns.some((col) => col.name === "splitIndex")) {
    database.exec(`ALTER TABLE markers ADD COLUMN splitIndex INTEGER`);
  }

  database.exec(`
    CREATE TABLE IF NOT EXISTS track_splits (
      id TEXT PRIMARY KEY,
      trackId TEXT NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
      splitIndex INTEGER NOT NULL,
      name TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      UNIQUE(trackId, splitIndex)
    );
    CREATE INDEX IF NOT EXISTS idx_track_splits_track ON track_splits(trackId);
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS detection_profiles (
      id TEXT PRIMARY KEY,
      trackId TEXT NOT NULL UNIQUE REFERENCES tracks(id) ON DELETE CASCADE,
      roiX0 REAL,
      roiY0 REAL,
      roiX1 REAL,
      roiY1 REAL,
      scanFps INTEGER NOT NULL DEFAULT 5,
      lapTimePriorMs REAL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS detection_bank (
      id TEXT PRIMARY KEY,
      profileId TEXT NOT NULL REFERENCES detection_profiles(id) ON DELETE CASCADE,
      sourceSessionId TEXT NOT NULL,
      timeSeconds REAL NOT NULL,
      roiX0 REAL NOT NULL,
      roiY0 REAL NOT NULL,
      roiX1 REAL NOT NULL,
      roiY1 REAL NOT NULL,
      roiGray BLOB NOT NULL,
      confirmedAt TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_detection_bank_profile ON detection_bank(profileId);
  `);

  migrateUserOwnership(database);
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}
