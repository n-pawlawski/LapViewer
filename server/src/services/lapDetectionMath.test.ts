import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  estimatePeriod,
  ncc,
  periodicWalk,
  type PeriodicWalkInput,
} from "./lapDetectionMath.js";

function gray(values: number[]): Uint8Array {
  return Uint8Array.from(values);
}

describe("ncc", () => {
  it("returns 1 for identical non-constant vectors", () => {
    const v = gray([10, 20, 30, 40, 50]);
    assert.equal(ncc(v, v), 1);
  });

  it("returns -1 for anti-correlated vectors", () => {
    const a = gray([0, 50, 100, 150, 200]);
    const b = gray([200, 150, 100, 50, 0]);
    assert.ok(ncc(a, b) < -0.99);
  });

  it("returns -1 when lengths differ", () => {
    assert.equal(ncc(gray([1, 2, 3]), gray([1, 2])), -1);
  });

  it("returns -1 for empty vectors", () => {
    assert.equal(ncc(gray([]), gray([])), -1);
  });
});

describe("estimatePeriod", () => {
  it("recovers an injected period from a periodic score series", () => {
    const fps = 10;
    const injectedPeriodSec = 32;
    const length = fps * 120;
    const scores = new Array<number>(length).fill(0.1);
    for (let i = 0; i < length; i++) {
      if (i % Math.round(injectedPeriodSec * fps) === 0) {
        scores[i] = 1;
      }
    }

    const estimated = estimatePeriod(scores, fps, 15, 60);
    assert.ok(
      Math.abs(estimated - injectedPeriodSec) <= 1,
      `expected ~${injectedPeriodSec}s, got ${estimated}s`,
    );
  });
});

describe("periodicWalk", () => {
  const template = gray([100, 120, 140, 160]);
  const nearMatch = gray([101, 119, 141, 159]);
  const lookalike = gray([100, 121, 139, 161]);

  function baseInput(
    overrides: Partial<PeriodicWalkInput> = {},
  ): PeriodicWalkInput {
    return {
      times: [0, 9.5, 10, 12, 19.5, 20, 22, 29.5, 30],
      rois: [
        nearMatch,
        nearMatch,
        nearMatch,
        lookalike,
        nearMatch,
        nearMatch,
        lookalike,
        nearMatch,
        nearMatch,
      ],
      bankTemplates: [template],
      anchorTime: 0,
      lapTimeSec: 10,
      searchWindowSec: 1.5,
      proximityWeight: 0.5,
      endTime: 35,
      minConfidence: 0.5,
      fixedSchedule: true,
      ...overrides,
    };
  }

  it("walks forward on a fixed schedule from the anchor", () => {
    const proposals = periodicWalk(baseInput());
    const times = proposals.map((p) => p.time);

    assert.ok(times.length >= 3, `expected multiple laps, got ${times.length}`);
    assert.equal(times[0], 0);
    assert.ok(Math.abs(times[1]! - 10) <= 0.6);
    assert.ok(Math.abs(times[2]! - 20) <= 0.6);
    assert.ok(Math.abs(times[times.length - 1]! - 30) <= 0.6);
  });

  it("prefers timing proximity over a stronger off-time lookalike", () => {
    const proposals = periodicWalk(
      baseInput({
        times: [0, 9.6, 12],
        rois: [nearMatch, nearMatch, lookalike],
        endTime: 15,
        lapTimeSec: 10,
        searchWindowSec: 2.5,
        proximityWeight: 0.6,
        minConfidence: 0.5,
      }),
    );

    assert.equal(proposals.length, 2);
    assert.ok(Math.abs(proposals[1]!.time - 9.6) < 0.01);
  });

  it("stops when confidence falls below the minimum threshold", () => {
    const noMatch = gray([0, 0, 0, 0]);
    const proposals = periodicWalk(
      baseInput({
        times: [0, 10],
        rois: [nearMatch, noMatch],
        endTime: 25,
        minConfidence: 0.5,
      }),
    );

    assert.equal(proposals.length, 1);
  });

  it("stops before exceeding finalMarkerTime", () => {
    const proposals = periodicWalk(
      baseInput({
        finalMarkerTime: 18,
        endTime: 40,
      }),
    );

    assert.ok(proposals.every((p) => p.time <= 18 + 0.01));
    assert.ok(proposals.length >= 2);
    assert.ok(proposals.length < 4);
  });
});
