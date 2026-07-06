import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { initDatabase } from "../src/db/database.js";
import { getReferenceProfileByTrackId } from "../src/services/referenceProfiles.js";
import { getSessionSourcePath } from "../src/services/sessions.js";
import { getTrackByName } from "../src/services/tracks.js";
import { loadReferencePoints, runTrackMatch } from "../src/services/trackProgressVision.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "..", "data");

initDatabase();
const db = new Database(path.join(DATA_DIR, "lapviewer.db"), { readonly: true });

const session = db
  .prepare(
    `SELECT id, title, trackName, durationSeconds, userId FROM sessions
     WHERE title LIKE '%7/2%' OR title LIKE '%League%'
     ORDER BY datetime(createdAt) DESC LIMIT 1`,
  )
  .get();

console.log("Session:", session.title, session.id);

const lapStarts = db
  .prepare(
    `SELECT timeSeconds FROM markers WHERE sessionId = ? AND kind = 'lapStart' ORDER BY timeSeconds`,
  )
  .all(session.id);

console.log(
  "Lap starts:",
  lapStarts.length,
  lapStarts.map((m) => m.timeSeconds.toFixed(1)).join(", "),
);

const track = getTrackByName(session.trackName, session.userId);
if (!track) throw new Error("track not found");

const profile = getReferenceProfileByTrackId(track.id);
if (!profile) throw new Error("no profile");

console.log(
  "Splits with progress:",
  profile.splits.filter((s) => s.progress != null).length,
  profile.splits.map((s) => `${s.splitIndex}:${s.progress?.toFixed(3)}`).join(", "),
);

const sourcePath = getSessionSourcePath(session.id, session.userId);
console.log("Video:", sourcePath);

const refPoints = loadReferencePoints(profile.id);
console.log("Ref points:", refPoints.length);

const lapStartTimes = lapStarts.map((m) => m.timeSeconds);
const scanStart = lapStartTimes[0] ?? 0;
const scanEnd = session.durationSeconds ?? scanStart + 7200;

console.log("Running match...", { scanStart, scanEnd, laps: lapStartTimes.length });

const result = await runTrackMatch(profile, sourcePath, scanStart, scanEnd, refPoints, {
  lapStartTimes,
});

const splits = result.proposals.filter((p) => p.kind === "split");
const lapProposals = result.proposals.filter((p) => p.kind === "lapStart");

console.log("\nTotal proposals:", result.proposals.length);
console.log("Lap starts proposed:", lapProposals.length);
console.log("Split proposals:", splits.length);

const byLap = new Map();
for (const p of splits) {
  byLap.set(p.lapNumber ?? 0, (byLap.get(p.lapNumber ?? 0) ?? 0) + 1);
}
console.log("Splits by lap:", Object.fromEntries(byLap));

for (const p of splits) {
  console.log(
    `  L${p.lapNumber} split ${p.splitIndex} @ ${p.timeSeconds.toFixed(3)} conf ${p.confidence.toFixed(2)}`,
  );
}

db.close();
