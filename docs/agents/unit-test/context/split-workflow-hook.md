# Context: `useSplitDetectionWorkflow` hook tests (WO-unit-test-gate-03)

**Work item:** WO-unit-test-gate-03  
**Blocked by:** WO-unit-test-gate-00 (Vitest)  
**File under test:** `client/src/hooks/useSplitDetectionWorkflow.ts`

---

## Test file

`client/src/hooks/useSplitDetectionWorkflow.test.ts`

Use `renderHook` from `@testing-library/react` and `vi.useFakeTimers()` for the 500ms poll interval.

---

## Mock API module

```typescript
vi.mock("../api/splitDetection", () => ({
  startSplitDetection: vi.fn(),
  fetchSplitDetectionJob: vi.fn(),
  cancelSplitDetectionJob: vi.fn(),
}));
```

---

## Scenarios

### 1. Single lap — success

- `beginSplitDetection([2])` calls `startSplitDetection(sessionId, 2)`
- Poll returns `{ status: "done", lapNumber: 2, progress: 1, proposals: [...] }`
- `splitProposals` length > 0; `splitDetecting` false; `onScanFinished` called

### 2. Multi-lap batch

- `beginSplitDetection([1, 2, 3])`
- First job completes → second `startSplitDetection` called with lap 2
- Proposals **append** across laps (`batchTotal > 1`)
- `splitDetectBatchLabel` mentions lap index

### 3. Start failure

- `startSplitDetection` rejects → `splitDetectStatus === "error"`, `splitDetecting` false

### 4. Job error status

- Poll returns `{ status: "error", error: "..." }` → error surfaced, queue cleared

### 5. Cancel

- `handleCancelSplitDetection` calls `cancelSplitDetectionJob`; status `cancelled`

### 6. Reject proposal

- `rejectCurrentSplitProposal` removes current index; resets status idle when empty

---

## Proposal fixture shape

Match `SplitDetectionPanel` / API DTO mapping inside hook:

```typescript
{
  id: "p1",
  splitIndex: 1,
  label: "S1",
  timeSeconds: 12.5,
  score: 0.9,
  confidence: 0.8,
}
```

---

## Callbacks

- `onScanStarted` fired when batch begins
- `onScanFinished` fired when queue empty after last job `done`

---

## Out of scope

- `IntakeMarkingPanel` keyboard shortcuts
- `acceptCurrentSplitProposal` (stays in panel; uses `createSplit` API)

---

## Product invariant to protect

Split suggestion is **user-initiated** only. Tests should not imply automatic lap detection on marker create.

---

## Verification

```bash
npm run test --prefix client
npm run check
```
