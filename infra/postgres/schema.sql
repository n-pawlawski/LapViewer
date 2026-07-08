-- LapViewer Postgres schema (cloud production)
-- Applied on startup when DATABASE_URL is set.

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  displayName TEXT NOT NULL,
  passwordHash TEXT,
  googleSub TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  permissions TEXT NOT NULL DEFAULT '[]',
  createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_sub ON users(googleSub) WHERE googleSub IS NOT NULL;

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  sourcePath TEXT NOT NULL,
  sourceRoot TEXT NOT NULL,
  relativePath TEXT NOT NULL,
  fileName TEXT NOT NULL,
  fileSizeBytes BIGINT,
  fileModifiedAt TIMESTAMPTZ,
  recordedAt DATE,
  trackName TEXT,
  notes TEXT,
  camera TEXT NOT NULL DEFAULT 'GoPro',
  durationSeconds DOUBLE PRECISION,
  videoCodec TEXT,
  width INTEGER,
  height INTEGER,
  frameRate DOUBLE PRECISION,
  status TEXT NOT NULL DEFAULT 'ready',
  storageKind TEXT NOT NULL DEFAULT 'local_path',
  objectKey TEXT,
  uploadStatus TEXT,
  isPublic INTEGER NOT NULL DEFAULT 0,
  createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(userId, sourcePath)
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(userId);

CREATE TABLE IF NOT EXISTS markers (
  id TEXT PRIMARY KEY,
  sessionId TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  timeSeconds DOUBLE PRECISION NOT NULL,
  kind TEXT NOT NULL DEFAULT 'lapStart',
  label TEXT,
  ignored INTEGER NOT NULL DEFAULT 0,
  splitIndex INTEGER,
  createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_markers_session ON markers(sessionId);

CREATE TABLE IF NOT EXISTS tracks (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  videoFolder TEXT,
  notes TEXT,
  createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(userId, name)
);

CREATE INDEX IF NOT EXISTS idx_tracks_user ON tracks(userId);

CREATE TABLE IF NOT EXISTS track_splits (
  id TEXT PRIMARY KEY,
  trackId TEXT NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  splitIndex INTEGER NOT NULL,
  name TEXT NOT NULL,
  progress DOUBLE PRECISION,
  createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(trackId, splitIndex)
);

CREATE INDEX IF NOT EXISTS idx_track_splits_track ON track_splits(trackId);

CREATE TABLE IF NOT EXISTS detection_profiles (
  id TEXT PRIMARY KEY,
  trackId TEXT NOT NULL UNIQUE REFERENCES tracks(id) ON DELETE CASCADE,
  roiX0 DOUBLE PRECISION,
  roiY0 DOUBLE PRECISION,
  roiX1 DOUBLE PRECISION,
  roiY1 DOUBLE PRECISION,
  scanFps INTEGER NOT NULL DEFAULT 5,
  lapTimePriorMs DOUBLE PRECISION,
  createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS detection_bank (
  id TEXT PRIMARY KEY,
  profileId TEXT NOT NULL REFERENCES detection_profiles(id) ON DELETE CASCADE,
  sourceSessionId TEXT NOT NULL,
  timeSeconds DOUBLE PRECISION NOT NULL,
  roiX0 DOUBLE PRECISION NOT NULL,
  roiY0 DOUBLE PRECISION NOT NULL,
  roiX1 DOUBLE PRECISION NOT NULL,
  roiY1 DOUBLE PRECISION NOT NULL,
  roiGray BYTEA NOT NULL,
  confirmedAt TIMESTAMPTZ NOT NULL,
  createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_detection_bank_profile ON detection_bank(profileId);

CREATE TABLE IF NOT EXISTS track_reference_profiles (
  id TEXT PRIMARY KEY,
  trackId TEXT NOT NULL UNIQUE REFERENCES tracks(id) ON DELETE CASCADE,
  referenceSessionId TEXT NOT NULL REFERENCES sessions(id),
  referenceLapNumber INTEGER NOT NULL,
  referenceStartMarkerId TEXT REFERENCES markers(id),
  referenceEndMarkerId TEXT REFERENCES markers(id),
  referenceStartSeconds DOUBLE PRECISION NOT NULL,
  referenceEndSeconds DOUBLE PRECISION NOT NULL,
  cropTop DOUBLE PRECISION NOT NULL DEFAULT 0.15,
  cropBottom DOUBLE PRECISION NOT NULL DEFAULT 0.20,
  cropLeft DOUBLE PRECISION NOT NULL DEFAULT 0,
  cropRight DOUBLE PRECISION NOT NULL DEFAULT 0,
  direction TEXT NOT NULL DEFAULT 'unknown',
  scanFps INTEGER NOT NULL DEFAULT 5,
  minLapTimeMs INTEGER NOT NULL DEFAULT 25000,
  maxProgressJumpPerSec DOUBLE PRECISION NOT NULL DEFAULT 0.12,
  lapBoundaryConfidenceMin DOUBLE PRECISION NOT NULL DEFAULT 0.65,
  splitConfidenceMin DOUBLE PRECISION NOT NULL DEFAULT 0.61,
  createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS track_reference_points (
  id TEXT PRIMARY KEY,
  profileId TEXT NOT NULL REFERENCES track_reference_profiles(id) ON DELETE CASCADE,
  timestampMs INTEGER NOT NULL,
  progress DOUBLE PRECISION NOT NULL,
  featurePath TEXT NOT NULL,
  perceptualHash TEXT,
  createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_track_reference_points_profile
  ON track_reference_points(profileId, progress);

CREATE TABLE IF NOT EXISTS track_split_bank (
  id TEXT PRIMARY KEY,
  trackId TEXT NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  splitIndex INTEGER NOT NULL,
  sourceMarkerId TEXT NOT NULL UNIQUE REFERENCES markers(id) ON DELETE CASCADE,
  sourceSessionId TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  timeSeconds DOUBLE PRECISION NOT NULL,
  lapOffsetSeconds DOUBLE PRECISION NOT NULL,
  frameGray BYTEA NOT NULL,
  confirmedAt TIMESTAMPTZ NOT NULL,
  createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_track_split_bank_track
  ON track_split_bank(trackId, splitIndex);
