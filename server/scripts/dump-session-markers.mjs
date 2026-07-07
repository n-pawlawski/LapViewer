import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";

const fileName = process.argv[2] ?? "GX010012.MP4";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database(path.join(__dirname, "..", "..", "data", "lapviewer.db"), {
  readonly: true,
});

const session = db
  .prepare(
    `SELECT id, fileName, sourcePath, trackName, durationSeconds, createdAt FROM sessions WHERE fileName = ? ORDER BY datetime(createdAt) DESC LIMIT 1`,
  )
  .get(fileName);

const markers = db
  .prepare(
    `SELECT id, timeSeconds, label, kind, splitIndex FROM markers WHERE sessionId = ? ORDER BY timeSeconds`,
  )
  .all(session.id);

const allMarkers = db
  .prepare(`SELECT id, sessionId, timeSeconds, label, kind, splitIndex FROM markers ORDER BY timeSeconds`)
  .all();

const trackSplits = session.trackName
  ? db
      .prepare(
        `SELECT ts.splitIndex, ts.name FROM track_splits ts JOIN tracks t ON t.id = ts.trackId WHERE t.name = ? ORDER BY ts.splitIndex`,
      )
      .all(session.trackName)
  : [];

console.log(JSON.stringify({ session, markers, trackSplits, allMarkersCount: allMarkers.length, splitMarkers: allMarkers.filter(m=>m.kind==='split') }, null, 2));
db.close();
