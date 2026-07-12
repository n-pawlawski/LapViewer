import fs from "node:fs";
import path from "node:path";
import type Database from "better-sqlite3";
import DatabaseConstructor from "better-sqlite3";
import { DATA_DIR, DATABASE_URL, isDevUserMode } from "../config.js";
import { ensureDevUser } from "./users.js";
import {
  type DbClient,
  type PostgresDbClient,
  checkPostgresHealth,
  createPostgresClient,
} from "./postgresClient.js";
import type pg from "pg";

let db: DbClient | null = null;
let sqliteDb: Database.Database | null = null;
let pgPool: pg.Pool | null = null;
let dbKind: "sqlite" | "postgres" = "sqlite";

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

function wrapSqliteDb(database: Database.Database): DbClient {
  return {
    prepare: (sql) => database.prepare(sql),
    exec: (sql) => { database.exec(sql); },
    transaction: (fn) => database.transaction(fn) as unknown as typeof fn,
  };
}

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

  const devUserId = ensureDevUser(wrapSqliteDb(database));
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

function migrateGoogleAuth(database: Database.Database): void {
  let userCols = tableColumns(database, "users");
  if (userCols.length === 0) return;

  if (!userCols.includes("googleSub")) {
    database.exec(`ALTER TABLE users ADD COLUMN googleSub TEXT`);
    database.exec(
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_sub ON users(googleSub) WHERE googleSub IS NOT NULL`,
    );
  }

  userCols = tableColumns(database, "users");
  if (!userCols.includes("permissions")) {
    database.exec(`ALTER TABLE users ADD COLUMN permissions TEXT NOT NULL DEFAULT '[]'`);
  }
}

function migrateStorageColumns(database: Database.Database): void {
  const sessionCols = tableColumns(database, "sessions");
  if (!sessionCols.includes("storageKind")) {
    database.exec(`ALTER TABLE sessions ADD COLUMN storageKind TEXT NOT NULL DEFAULT 'local_path'`);
  }
  if (!sessionCols.includes("objectKey")) {
    database.exec(`ALTER TABLE sessions ADD COLUMN objectKey TEXT`);
  }
  if (!sessionCols.includes("uploadStatus")) {
    database.exec(`ALTER TABLE sessions ADD COLUMN uploadStatus TEXT`);
  }
  if (!sessionCols.includes("isPublic")) {
    database.exec(`ALTER TABLE sessions ADD COLUMN isPublic INTEGER NOT NULL DEFAULT 0`);
  }
}

function migrateStatsTables(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS stat_definitions (
      key TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      kind TEXT NOT NULL,
      scope TEXT NOT NULL DEFAULT 'user',
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS stat_counters (
      userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      statKey TEXT NOT NULL REFERENCES stat_definitions(key) ON DELETE CASCADE,
      value INTEGER NOT NULL DEFAULT 0,
      updatedAt TEXT NOT NULL,
      UNIQUE(userId, statKey)
    );

    CREATE INDEX IF NOT EXISTS idx_stat_counters_user ON stat_counters(userId);
  `);
}

function migrateSqlite(database: Database.Database): void {
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
  migrateGoogleAuth(database);
  migrateStorageColumns(database);
  migrateStatsTables(database);

  const splitCols = tableColumns(database, "track_splits");
  if (splitCols.length > 0 && !splitCols.includes("progress")) {
    database.exec(`ALTER TABLE track_splits ADD COLUMN progress REAL`);
  }

  database.exec(`
    CREATE TABLE IF NOT EXISTS track_reference_profiles (
      id TEXT PRIMARY KEY,
      trackId TEXT NOT NULL UNIQUE REFERENCES tracks(id) ON DELETE CASCADE,
      referenceSessionId TEXT NOT NULL REFERENCES sessions(id),
      referenceLapNumber INTEGER NOT NULL,
      referenceStartMarkerId TEXT REFERENCES markers(id),
      referenceEndMarkerId TEXT REFERENCES markers(id),
      referenceStartSeconds REAL NOT NULL,
      referenceEndSeconds REAL NOT NULL,
      cropTop REAL NOT NULL DEFAULT 0.15,
      cropBottom REAL NOT NULL DEFAULT 0.20,
      cropLeft REAL NOT NULL DEFAULT 0,
      cropRight REAL NOT NULL DEFAULT 0,
      direction TEXT NOT NULL DEFAULT 'unknown',
      scanFps INTEGER NOT NULL DEFAULT 5,
      minLapTimeMs INTEGER NOT NULL DEFAULT 25000,
      maxProgressJumpPerSec REAL NOT NULL DEFAULT 0.12,
      lapBoundaryConfidenceMin REAL NOT NULL DEFAULT 0.65,
      splitConfidenceMin REAL NOT NULL DEFAULT 0.61,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS track_reference_points (
      id TEXT PRIMARY KEY,
      profileId TEXT NOT NULL REFERENCES track_reference_profiles(id) ON DELETE CASCADE,
      timestampMs INTEGER NOT NULL,
      progress REAL NOT NULL,
      featurePath TEXT NOT NULL,
      perceptualHash TEXT,
      createdAt TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_track_reference_points_profile
      ON track_reference_points(profileId, progress);
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS track_split_bank (
      id TEXT PRIMARY KEY,
      trackId TEXT NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
      splitIndex INTEGER NOT NULL,
      sourceMarkerId TEXT NOT NULL UNIQUE REFERENCES markers(id) ON DELETE CASCADE,
      sourceSessionId TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      timeSeconds REAL NOT NULL,
      lapOffsetSeconds REAL NOT NULL,
      frameGray BLOB NOT NULL,
      confirmedAt TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_track_split_bank_track
      ON track_split_bank(trackId, splitIndex);
  `);
}

export function getDbKind(): "sqlite" | "postgres" {
  return dbKind;
}

export function getPgPool(): pg.Pool | null {
  return pgPool;
}

export function getDb(): DbClient {
  if (!db) {
    throw new Error("Database not initialized. Call initDatabase() first.");
  }
  return db;
}

export function getDbClient(): DbClient {
  return getDb();
}

export async function checkDatabaseHealth(): Promise<{
  ok: boolean;
  kind: "sqlite" | "postgres";
  error?: string;
}> {
  if (dbKind === "postgres" && pgPool) {
    return checkPostgresHealth(pgPool);
  }
  try {
    getDbClient().prepare(`SELECT 1 AS ok`).get();
    return { ok: true, kind: dbKind };
  } catch (err) {
    return {
      ok: false,
      kind: dbKind,
      error: err instanceof Error ? err.message : "SQLite check failed",
    };
  }
}

function initSqliteDatabase(): DbClient {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const dbPath = path.join(DATA_DIR, "lapviewer.db");
  sqliteDb = new DatabaseConstructor(dbPath);
  sqliteDb.pragma("journal_mode = WAL");
  sqliteDb.pragma("foreign_keys = ON");
  sqliteDb.exec(SCHEMA);
  migrateSqlite(sqliteDb);
  db = wrapSqliteDb(sqliteDb);
  dbKind = "sqlite";
  return db;
}

export async function initDatabase(): Promise<DbClient> {
  if (DATABASE_URL) {
    const client = await createPostgresClient(DATABASE_URL);
    db = client;
    dbKind = "postgres";
    pgPool = client.pool;
    return client;
  }
  return initSqliteDatabase();
}

export function closeDatabase(): void {
  if (sqliteDb) {
    sqliteDb.close();
    sqliteDb = null;
  }
  if (pgPool) {
    void pgPool.end();
    pgPool = null;
  }
  db = null;
}
