import { initDatabase } from "../src/db/database.js";
import { getDb } from "../src/db/database.js";
import { getSessionById, getSessionSourcePath } from "../src/services/sessions.js";
import { getTrackByName } from "../src/services/tracks.js";
import {
  getSplitBankSummary,
  listSplitBankTemplates,
  medianLapOffsetForSplit,
} from "../src/services/splitBank.js";
import { runSplitDetection } from "../src/services/splitDetection.js";
import {
  buildSplitDetectionProposals,
  missingSplitIndicesForLap,
} from "../src/services/splitDetectionMath.js";

initDatabase();
const db = getDb();

const target =
  db
    .prepare(
      `SELECT id, title, trackName, userId FROM sessions
       WHERE title LIKE '%Nick%og%' OR title LIKE '%B class%Nick%' OR title LIKE '%b class%nick%'
       ORDER BY datetime(createdAt) DESC LIMIT 1`,
    )
    .get() ??
  db
    .prepare(
      `SELECT id, title, trackName, userId FROM sessions WHERE title LIKE '%Nick%' LIMIT 1`,
    )
    .get();

if (!target) {
  console.log("Session not found");
  process.exit(1);
}

console.log("Session:", target.title, target.id);
const detail = getSessionById(target.id, target.userId);
const track = getTrackByName(detail.track, target.userId);
console.log("Track:", track.name);
console.log(
  "Splits config:",
  track.splits.map((s) => `${s.splitIndex}:${s.name}`).join(", "),
);

for (const lap of detail.laps) {
  const lapSplits = detail.splits.filter((s) => s.lapNumber === lap.lapNumber);
  const missing = track.splits
    .map((ts) => ts.splitIndex)
    .filter((splitIndex) => !lapSplits.some((s) => s.splitIndex === splitIndex));
  if (missing.length > 0) {
    console.log(
      `Lap ${lap.lapNumber}: have ${lapSplits.length} missing [${missing.map((i) => `${i}:${track.splits.find((s) => s.splitIndex === i)?.name}`).join(", ")}]`,
    );
  }
}

const lapWithMissing = detail.laps.find((l) => {
  const ls = detail.splits.filter((s) => s.lapNumber === l.lapNumber);
  return ls.length < track.splits.length;
});
const lapNumber = Number(process.argv[2]) || lapWithMissing?.lapNumber || 3;
const lap = detail.laps.find((l) => l.lapNumber === lapNumber) ?? detail.laps[1];
if (!lap) throw new Error("No lap");

const lapSplits = detail.splits.filter((s) => s.lapNumber === lap.lapNumber);
const bank = getSplitBankSummary(track.id, target.userId);
const medianOffsetMap = new Map(
  Object.entries(bank.medianOffsetBySplitIndex).map(([k, v]) => [Number(k), v]),
);
const missingSplitIndices = missingSplitIndicesForLap(
  lap.startSeconds,
  lapSplits.map((s) => ({ splitIndex: s.splitIndex, timeSeconds: s.timeSeconds })),
  track.splits,
  medianOffsetMap,
);

console.log(`\nLap ${lap.lapNumber} (${lap.startSeconds.toFixed(1)} - ${lap.endSeconds.toFixed(1)})`);
console.log("Have:", lapSplits.map((s) => `${s.splitIndex}:${s.label}@${s.timeSeconds.toFixed(1)}`).join(", ") || "none");
console.log(
  "Missing (unassigned or >4s off expected):",
  missingSplitIndices.map((i) => `${i}:${track.splits.find((s) => s.splitIndex === i)?.name}`).join(", ") || "none",
);
for (const s of lapSplits) {
  const offset = medianOffsetMap.get(s.splitIndex);
  if (offset == null) continue;
  const expected = lap.startSeconds + offset;
  const delta = s.timeSeconds - expected;
  console.log(`  ${s.splitIndex} delta vs bank: ${delta >= 0 ? "+" : ""}${delta.toFixed(2)}s (expected ${expected.toFixed(1)})`);
}
console.log("\nBank:", bank.bySplitIndex);

for (const idx of track.splits.map((s) => s.splitIndex)) {
  const name = track.splits.find((s) => s.splitIndex === idx)?.name;
  console.log(
    `  ${idx} (${name}): templates=${listSplitBankTemplates(track.id, idx).length}, median=${medianLapOffsetForSplit(track.id, idx)?.toFixed(2) ?? "—"}`,
  );
}

const sourcePath = getSessionSourcePath(target.id, target.userId);
console.log("\nRunning detection...");
const result = await runSplitDetection({
  videoPath: sourcePath,
  sessionId: target.id,
  trackId: track.id,
  lapStartSec: lap.startSeconds,
  lapEndSec: lap.endSeconds,
  missingSplitIndices,
});

console.log("\nProposals:", result.proposals.length);
for (const p of result.proposals) {
  const name = track.splits.find((s) => s.splitIndex === p.splitIndex)?.name;
  console.log(`  ${p.splitIndex} ${name} @ ${p.timeSeconds.toFixed(2)} score ${p.score.toFixed(3)}`);
}

const notFound = missingSplitIndices.filter(
  (idx) => !result.proposals.some((p) => p.splitIndex === idx),
);
if (notFound.length) {
  console.log("\nNOT PROPOSED:", notFound.map((i) => `${i}:${track.splits.find((s) => s.splitIndex === i)?.name}`).join(", "));
}
