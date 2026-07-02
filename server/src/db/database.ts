import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { DATA_DIR } from "../config.js";

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
`;

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
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}
