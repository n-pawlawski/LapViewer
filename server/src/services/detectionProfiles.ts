import { randomUUID } from "node:crypto";
import { getDb } from "../db/database.js";
import type {
  AddDetectionBankEntryBody,
  DetectionBankEntryDto,
  DetectionProfileDto,
  DetectionRoi,
  UpdateDetectionProfileBody,
} from "../types.js";

const DEFAULT_SCAN_FPS = 5;

interface DetectionProfileRow {
  id: string;
  trackId: string;
  roiX0: number | null;
  roiY0: number | null;
  roiX1: number | null;
  roiY1: number | null;
  scanFps: number;
  lapTimePriorMs: number | null;
  createdAt: string;
  updatedAt: string;
}

interface DetectionBankRow {
  id: string;
  profileId: string;
  sourceSessionId: string;
  timeSeconds: number;
  roiX0: number;
  roiY0: number;
  roiX1: number;
  roiY1: number;
  roiGray: Buffer;
  confirmedAt: string;
  createdAt: string;
}

function rowToRoi(row: {
  roiX0: number | null;
  roiY0: number | null;
  roiX1: number | null;
  roiY1: number | null;
}): DetectionRoi | undefined {
  if (
    row.roiX0 == null ||
    row.roiY0 == null ||
    row.roiX1 == null ||
    row.roiY1 == null
  ) {
    return undefined;
  }
  return { x0: row.roiX0, y0: row.roiY0, x1: row.roiX1, y1: row.roiY1 };
}

function profileRowToDto(row: DetectionProfileRow): DetectionProfileDto {
  return {
    id: row.id,
    trackId: row.trackId,
    roi: rowToRoi(row),
    scanFps: row.scanFps,
    lapTimePriorMs: row.lapTimePriorMs ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function bankRowToDto(row: DetectionBankRow): DetectionBankEntryDto {
  return {
    id: row.id,
    profileId: row.profileId,
    sourceSessionId: row.sourceSessionId,
    timeSeconds: row.timeSeconds,
    roiUsed: {
      x0: row.roiX0,
      y0: row.roiY0,
      x1: row.roiX1,
      y1: row.roiY1,
    },
    roiGray: row.roiGray,
    confirmedAt: row.confirmedAt,
    createdAt: row.createdAt,
  };
}

function assertTrackExists(trackId: string): void {
  const track = getDb()
    .prepare(`SELECT id FROM tracks WHERE id = ?`)
    .get(trackId);
  if (!track) {
    throw Object.assign(new Error("Track not found"), { code: "NOT_FOUND" });
  }
}

function validateRoi(roi: DetectionRoi): void {
  for (const [key, value] of Object.entries(roi)) {
    if (typeof value !== "number" || value < 0 || value > 1) {
      throw Object.assign(new Error(`Invalid ROI ${key}: must be 0..1`), {
        code: "VALIDATION",
      });
    }
  }
  if (roi.x1 <= roi.x0 || roi.y1 <= roi.y0) {
    throw Object.assign(new Error("ROI must have x1 > x0 and y1 > y0"), {
      code: "VALIDATION",
    });
  }
}

export function getDetectionProfileById(id: string): DetectionProfileDto | null {
  const row = getDb()
    .prepare(`SELECT * FROM detection_profiles WHERE id = ?`)
    .get(id) as DetectionProfileRow | undefined;
  return row ? profileRowToDto(row) : null;
}

export function getDetectionProfileByTrackId(
  trackId: string,
): DetectionProfileDto | null {
  const row = getDb()
    .prepare(`SELECT * FROM detection_profiles WHERE trackId = ?`)
    .get(trackId) as DetectionProfileRow | undefined;
  return row ? profileRowToDto(row) : null;
}

export function getOrCreateDetectionProfile(trackId: string): DetectionProfileDto {
  const existing = getDetectionProfileByTrackId(trackId);
  if (existing) {
    return existing;
  }

  assertTrackExists(trackId);

  const now = new Date().toISOString();
  const id = randomUUID();
  getDb()
    .prepare(
      `INSERT INTO detection_profiles
       (id, trackId, roiX0, roiY0, roiX1, roiY1, scanFps, lapTimePriorMs, createdAt, updatedAt)
       VALUES (?, ?, NULL, NULL, NULL, NULL, ?, NULL, ?, ?)`,
    )
    .run(id, trackId, DEFAULT_SCAN_FPS, now, now);

  return getDetectionProfileById(id)!;
}

export function updateDetectionProfile(
  profileId: string,
  body: UpdateDetectionProfileBody,
): DetectionProfileDto {
  const existing = getDetectionProfileById(profileId);
  if (!existing) {
    throw Object.assign(new Error("Detection profile not found"), { code: "NOT_FOUND" });
  }

  if (body.roi !== undefined) {
    validateRoi(body.roi);
  }
  if (body.scanFps !== undefined && body.scanFps <= 0) {
    throw Object.assign(new Error("scanFps must be positive"), { code: "VALIDATION" });
  }

  const roi = body.roi ?? existing.roi;
  const scanFps = body.scanFps ?? existing.scanFps;
  const lapTimePriorMs =
    body.lapTimePriorMs !== undefined
      ? body.lapTimePriorMs
      : existing.lapTimePriorMs ?? null;

  const now = new Date().toISOString();
  getDb()
    .prepare(
      `UPDATE detection_profiles
       SET roiX0 = ?, roiY0 = ?, roiX1 = ?, roiY1 = ?,
           scanFps = ?, lapTimePriorMs = ?, updatedAt = ?
       WHERE id = ?`,
    )
    .run(
      roi?.x0 ?? null,
      roi?.y0 ?? null,
      roi?.x1 ?? null,
      roi?.y1 ?? null,
      scanFps,
      lapTimePriorMs,
      now,
      profileId,
    );

  return getDetectionProfileById(profileId)!;
}

export function addDetectionBankEntry(
  profileId: string,
  body: AddDetectionBankEntryBody,
): DetectionBankEntryDto {
  const profile = getDetectionProfileById(profileId);
  if (!profile) {
    throw Object.assign(new Error("Detection profile not found"), { code: "NOT_FOUND" });
  }

  if (body.roiUsed !== undefined) {
    validateRoi(body.roiUsed);
  }

  const roiUsed = body.roiUsed ?? profile.roi;
  if (!roiUsed) {
    throw Object.assign(new Error("roiUsed is required when profile has no ROI"), {
      code: "VALIDATION",
    });
  }

  if (!body.roiGray || body.roiGray.length === 0) {
    throw Object.assign(new Error("roiGray blob is required"), { code: "VALIDATION" });
  }

  const now = new Date().toISOString();
  const id = randomUUID();
  const blob = Buffer.isBuffer(body.roiGray) ? body.roiGray : Buffer.from(body.roiGray);

  getDb()
    .prepare(
      `INSERT INTO detection_bank
       (id, profileId, sourceSessionId, timeSeconds, roiX0, roiY0, roiX1, roiY1, roiGray, confirmedAt, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      profileId,
      body.sourceSessionId,
      body.timeSeconds,
      roiUsed.x0,
      roiUsed.y0,
      roiUsed.x1,
      roiUsed.y1,
      blob,
      now,
      now,
    );

  return listDetectionBankEntries(profileId).find((entry) => entry.id === id)!;
}

export function listDetectionBankEntries(profileId: string): DetectionBankEntryDto[] {
  const rows = getDb()
    .prepare(
      `SELECT * FROM detection_bank WHERE profileId = ? ORDER BY confirmedAt`,
    )
    .all(profileId) as DetectionBankRow[];
  return rows.map(bankRowToDto);
}
