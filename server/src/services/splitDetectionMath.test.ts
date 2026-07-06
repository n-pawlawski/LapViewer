import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildSplitDetectionProposals,
  detectSplitInScan,
  median,
  missingSplitIndicesForLap,
} from "./splitDetectionMath.js";

describe("median", () => {
  it("returns middle value", () => {
    assert.equal(median([1, 3, 9]), 3);
  });
});

describe("detectSplitInScan", () => {
  it("finds best NCC peak in window", () => {
    const template = new Uint8Array([10, 20, 30, 40]);
    const frameTimes = [0, 0.2, 0.4, 0.6];
    const frameGrays = [
      new Uint8Array([0, 0, 0, 0]),
      new Uint8Array([10, 20, 30, 40]),
      new Uint8Array([5, 5, 5, 5]),
      new Uint8Array([10, 20, 30, 40]),
    ];
    const match = detectSplitInScan(frameTimes, frameGrays, [template], 0, 1, 0.5);
    assert.ok(match);
    assert.equal(match!.timeSeconds, 0.2);
    assert.ok(match!.score > 0.99);
  });
});

describe("missingSplitIndicesForLap", () => {
  it("marks slot missing when no marker assigned to that splitIndex", () => {
    const missing = missingSplitIndicesForLap(
      217.1,
      [
        { splitIndex: 1, timeSeconds: 222.2 },
        { splitIndex: 2, timeSeconds: 226.5 },
        { splitIndex: 3, timeSeconds: 230.2 },
        { splitIndex: 4, timeSeconds: 237.5 },
        { splitIndex: 5, timeSeconds: 242.3 },
      ],
      [{ splitIndex: 1 }, { splitIndex: 2 }, { splitIndex: 3 }, { splitIndex: 4 }, { splitIndex: 5 }, { splitIndex: 6 }],
      new Map([
        [1, 5.08],
        [2, 9.42],
        [3, 13.15],
        [4, 16.25],
        [5, 20.52],
        [6, 25.22],
      ]),
    );
    assert.deepEqual(missing, [4, 5, 6]);
  });

  it("does not let one marker satisfy multiple slots", () => {
    const missing = missingSplitIndicesForLap(
      100,
      [{ splitIndex: 6, timeSeconds: 125 }],
      [{ splitIndex: 1 }, { splitIndex: 4 }, { splitIndex: 6 }],
      new Map([
        [1, 5],
        [4, 16],
        [6, 25],
      ]),
    );
    assert.deepEqual(missing, [1, 4]);
  });

  it("uses slot occupancy when no bank offset exists", () => {
    const missing = missingSplitIndicesForLap(
      100,
      [{ splitIndex: 1, timeSeconds: 105 }],
      [{ splitIndex: 1 }, { splitIndex: 2 }],
      new Map([[1, 5]]),
    );
    assert.deepEqual(missing, [2]);
  });
});

describe("buildSplitDetectionProposals", () => {
  it("detects missing splits in order", () => {
    const template1 = new Uint8Array([1, 2, 3, 4]);
    const template2 = new Uint8Array([4, 3, 2, 1]);
    const frameTimes = [0, 1, 2, 3, 4, 5, 6].map((t) => t * 0.2);
    const frameGrays = frameTimes.map((_, i) => {
      if (i === 2) return new Uint8Array([1, 2, 3, 4]);
      if (i === 5) return new Uint8Array([4, 3, 2, 1]);
      return new Uint8Array([0, 0, 0, 0]);
    });

    const bankBySplitIndex = new Map<number, Uint8Array[]>([
      [1, [template1]],
      [2, [template2]],
    ]);
    const medianOffsetBySplitIndex = new Map<number, number>([
      [1, 0.4],
      [2, 1.0],
    ]);

    const proposals = buildSplitDetectionProposals({
      missingSplitIndices: [1, 2],
      frameTimes,
      frameGrays,
      bankBySplitIndex,
      medianOffsetBySplitIndex,
      lapStartSec: 0,
      lapEndSec: 1.2,
      searchMarginSec: 0.5,
      minNcc: 0.5,
    });

    assert.equal(proposals.length, 2);
    assert.equal(proposals[0]!.splitIndex, 1);
    assert.equal(proposals[1]!.splitIndex, 2);
    assert.ok(proposals[1]!.timeSeconds > proposals[0]!.timeSeconds);
  });
});
