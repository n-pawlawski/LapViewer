import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildSplitProposalsForMarkedLaps,
  lapNumberAtTime,
  type ProgressCandidate,
  type ProgressFrame,
} from "./trackProgressMath.js";

describe("lapNumberAtTime", () => {
  const starts = [51.376, 80.775, 109.421];

  it("returns null before the first lap start", () => {
    assert.equal(lapNumberAtTime(40, starts), null);
  });

  it("returns lap 1 between first and second starts", () => {
    assert.equal(lapNumberAtTime(77.9, starts), 1);
  });

  it("returns lap 3 from the third start onward", () => {
    assert.equal(lapNumberAtTime(109.5, starts), 3);
  });
});

describe("buildSplitProposalsForMarkedLaps", () => {
  it("emits every split on every marked lap, using visual when available", () => {
    const lapStarts = [51.376, 80.775, 109.421];
    const frames: ProgressFrame[] = [];
    const candidateLists: ProgressCandidate[][] = [];

    for (let lap = 0; lap < lapStarts.length; lap++) {
      const start = lapStarts[lap]!;
      const end = lapStarts[lap + 1] ?? 140;
      for (let t = start; t <= end; t += 0.2) {
        const progress = Math.min(1, (t - start) / (end - start));
        frames.push({ timestampMs: Math.round(t * 1000), timeSec: t });
        candidateLists.push([{ progress, visualScore: 0.95 }]);
      }
    }

    const proposals = buildSplitProposalsForMarkedLaps(
      frames,
      candidateLists,
      [
        { splitIndex: 1, progress: 0.184 },
        { splitIndex: 2, progress: 0.339 },
      ],
      0.5,
      lapStarts,
      140,
      5,
      0.12,
    );

    assert.equal(proposals.length, lapStarts.length * 2);
    for (let lap = 1; lap <= lapStarts.length; lap++) {
      assert.ok(proposals.some((p) => p.lapNumber === lap && p.splitIndex === 1));
      assert.ok(proposals.some((p) => p.lapNumber === lap && p.splitIndex === 2));
    }
  });
});
