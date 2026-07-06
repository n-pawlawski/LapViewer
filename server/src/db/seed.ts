import { getDb } from "../db/database.js";
import { DEMO_VIDEO_PATH } from "../config.js";
import {
  countSessions,
  createSession,
  insertMarker,
} from "../services/sessions.js";
import { countTracks, createTrack } from "../services/tracks.js";

interface SeedSession {
  title: string;
  sourcePath: string;
  trackName?: string;
  recordedAt?: string;
  status?: "ready" | "processing" | "missing";
  durationSeconds?: number;
  markerTimes: number[];
}

const SEED_DATA: SeedSession[] = [
  {
    title: "2-19 Racing League",
    sourcePath: DEMO_VIDEO_PATH,
    trackName: "Track A",
    recordedAt: "2025-02-19",
    durationSeconds: 900,
    markerTimes: [45, 145.127, 245.89, 346.017, 446.144, 546.5, 646.8, 747.2, 848.0],
  },
  {
    title: "Spring Practice",
    sourcePath: "E:\\Racing Videos\\spring\\GX010045.MP4",
    trackName: "Track B",
    recordedAt: "2025-03-12",
    durationSeconds: 700,
    markerTimes: [30, 131.5, 233.2, 334.55, 436.1, 538.0, 640.2],
  },
  {
    title: "Club Day — Heat 2",
    sourcePath: "E:\\Racing Videos\\club\\GX010078.MP4",
    trackName: "Track A",
    recordedAt: "2025-04-05",
    status: "processing",
    durationSeconds: 600,
    markerTimes: [60, 162.8, 265.9, 369.4, 472.1, 575.0],
  },
];

/** Populate demo sessions when the database is empty (dev convenience). */
export function seedIfEmpty(userId: string): void {
  if (countTracks(userId) === 0) {
    createTrack({ name: "Track A", videoFolder: "E:\\Racing Videos" }, userId);
    createTrack({ name: "Track B", videoFolder: "E:\\Racing Videos\\spring" }, userId);
    console.log("Seeded default tracks");
  }

  if (countSessions(userId) > 0) return;

  for (const seed of SEED_DATA) {
    const session = createSession(
      {
        sourcePath: seed.sourcePath,
        title: seed.title,
        trackName: seed.trackName,
        recordedAt: seed.recordedAt,
      },
      userId,
    );

    const status = seed.status ?? session.status;
    getDb()
      .prepare(
        `UPDATE sessions SET durationSeconds = ?, status = ? WHERE id = ?`,
      )
      .run(seed.durationSeconds ?? null, status, session.id);

    for (const time of seed.markerTimes) {
      insertMarker(session.id, time, undefined, userId);
    }
  }

  console.log(`Seeded ${SEED_DATA.length} demo sessions`);
}
