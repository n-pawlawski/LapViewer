import { useCallback, useEffect, useRef, useState } from "react";
import {
  cancelSplitDetectionJob,
  fetchSplitDetectionJob,
  startSplitDetection,
  type SplitDetectionJobStatus,
} from "../api/splitDetection";
import type { LocalSplitProposal } from "../components/SplitDetectionPanel";

/**
 * User-initiated split suggestion jobs (AD-5).
 * Lap boundaries must already exist from manual lap-start markers; this hook
 * only orchestrates scan jobs and proposal review state — it does not mark laps.
 */
export function useSplitDetectionWorkflow({
  sessionId,
  trackId,
  onScanStarted,
  onScanFinished,
}: {
  sessionId: string;
  trackId: string | null;
  onScanStarted?: () => void;
  onScanFinished?: () => void;
}) {
  const [splitProposals, setSplitProposals] = useState<LocalSplitProposal[]>([]);
  const [splitReviewIndex, setSplitReviewIndex] = useState(0);
  const [splitDetectStatus, setSplitDetectStatus] = useState<SplitDetectionJobStatus | "idle">(
    "idle",
  );
  const [splitDetectProgress, setSplitDetectProgress] = useState(0);
  const [splitDetectError, setSplitDetectError] = useState<string | null>(null);
  const [splitJobId, setSplitJobId] = useState<string | null>(null);
  const [splitDetecting, setSplitDetecting] = useState(false);
  const [splitDetectBatchLabel, setSplitDetectBatchLabel] = useState<string | null>(null);

  const splitDetectQueueRef = useRef<number[]>([]);
  const splitBatchTotalRef = useRef(0);
  const splitBatchCompletedRef = useRef(0);

  const selectSplitProposalIndex = useCallback(
    (index: number) => {
      setSplitReviewIndex(Math.max(0, Math.min(splitProposals.length - 1, index)));
    },
    [splitProposals.length],
  );

  const rejectCurrentSplitProposal = useCallback(() => {
    setSplitProposals((prev) => {
      if (prev.length === 0) return prev;
      const next = prev.filter((_, index) => index !== splitReviewIndex);
      if (next.length === 0) {
        setSplitDetectStatus("idle");
      } else if (splitReviewIndex >= next.length) {
        setSplitReviewIndex(next.length - 1);
      }
      return next;
    });
  }, [splitReviewIndex]);

  const beginSplitDetection = useCallback(
    async (lapNumbers: number[]) => {
      if (lapNumbers.length === 0 || !trackId) return;

      setSplitDetectError(null);
      setSplitProposals([]);
      setSplitDetectStatus("queued");
      setSplitDetectProgress(0);
      setSplitDetecting(true);
      onScanStarted?.();

      const [firstLap, ...rest] = lapNumbers;
      splitDetectQueueRef.current = rest;
      splitBatchTotalRef.current = lapNumbers.length;
      splitBatchCompletedRef.current = 0;
      setSplitDetectBatchLabel(
        lapNumbers.length > 1 ? `Lap ${firstLap} (1 of ${lapNumbers.length})` : null,
      );

      try {
        const { jobId } = await startSplitDetection(sessionId, firstLap!);
        setSplitJobId(jobId);
        setSplitDetectStatus("running");
      } catch (err) {
        splitDetectQueueRef.current = [];
        splitBatchTotalRef.current = 0;
        splitBatchCompletedRef.current = 0;
        setSplitDetectBatchLabel(null);
        setSplitDetecting(false);
        setSplitDetectStatus("error");
        setSplitDetectError(
          err instanceof Error ? err.message : "Could not start split detection",
        );
      }
    },
    [trackId, sessionId, onScanStarted],
  );

  const handleCancelSplitDetection = useCallback(async () => {
    if (!splitJobId) return;
    try {
      await cancelSplitDetectionJob(splitJobId);
    } catch {
      // Job may already be finished.
    }
    splitDetectQueueRef.current = [];
    splitBatchTotalRef.current = 0;
    splitBatchCompletedRef.current = 0;
    setSplitDetectBatchLabel(null);
    setSplitJobId(null);
    setSplitDetecting(false);
    setSplitDetectStatus("cancelled");
  }, [splitJobId]);

  useEffect(() => {
    if (!splitJobId) return;
    let cancelled = false;

    async function startNextLap(lapNumber: number) {
      const { jobId } = await startSplitDetection(sessionId, lapNumber);
      if (cancelled) return;
      setSplitJobId(jobId);
      setSplitDetectStatus("running");
    }

    async function poll() {
      try {
        const job = await fetchSplitDetectionJob(splitJobId!);
        if (cancelled) return;

        const batchTotal = splitBatchTotalRef.current;
        const batchDone = splitBatchCompletedRef.current;
        setSplitDetectStatus(job.status);
        setSplitDetectProgress(
          batchTotal > 1 ? (batchDone + job.progress) / batchTotal : job.progress,
        );

        const mapProposals = (lapNumber: number): LocalSplitProposal[] =>
          (job.proposals ?? []).map((p) => ({
            id: p.id,
            lapNumber,
            splitIndex: p.splitIndex,
            label: p.label,
            time: p.timeSeconds,
            score: p.score,
            confidence: p.confidence,
          }));

        if (job.status === "done") {
          const mapped = mapProposals(job.lapNumber);
          if (mapped.length > 0) {
            setSplitProposals((prev) => (batchTotal > 1 ? [...prev, ...mapped] : mapped));
          }

          splitBatchCompletedRef.current = batchDone + 1;
          const queue = splitDetectQueueRef.current;

          if (queue.length > 0) {
            const nextLap = queue[0]!;
            splitDetectQueueRef.current = queue.slice(1);
            setSplitDetectBatchLabel(
              `Lap ${nextLap} (${splitBatchCompletedRef.current + 1} of ${batchTotal})`,
            );
            setSplitDetectProgress(splitBatchCompletedRef.current / batchTotal);
            try {
              await startNextLap(nextLap);
            } catch (err) {
              if (cancelled) return;
              splitDetectQueueRef.current = [];
              splitBatchTotalRef.current = 0;
              splitBatchCompletedRef.current = 0;
              setSplitDetectBatchLabel(null);
              setSplitDetecting(false);
              setSplitJobId(null);
              setSplitDetectStatus("error");
              setSplitDetectError(
                err instanceof Error ? err.message : "Could not start next lap scan",
              );
            }
            return;
          }

          setSplitDetecting(false);
          setSplitJobId(null);
          setSplitDetectBatchLabel(null);
          splitDetectQueueRef.current = [];
          splitBatchTotalRef.current = 0;
          splitBatchCompletedRef.current = 0;
          onScanFinished?.();
          setSplitReviewIndex(0);
        }

        if (job.status === "error") {
          splitDetectQueueRef.current = [];
          splitBatchTotalRef.current = 0;
          splitBatchCompletedRef.current = 0;
          setSplitDetectBatchLabel(null);
          setSplitDetecting(false);
          setSplitJobId(null);
          setSplitDetectError(job.error ?? "Split detection failed");
        }

        if (job.status === "cancelled") {
          splitDetectQueueRef.current = [];
          splitBatchTotalRef.current = 0;
          splitBatchCompletedRef.current = 0;
          setSplitDetectBatchLabel(null);
          setSplitDetecting(false);
          setSplitJobId(null);
        }
      } catch (err) {
        if (cancelled) return;
        splitDetectQueueRef.current = [];
        splitBatchTotalRef.current = 0;
        splitBatchCompletedRef.current = 0;
        setSplitDetectBatchLabel(null);
        setSplitDetecting(false);
        setSplitJobId(null);
        setSplitDetectStatus("error");
        setSplitDetectError(err instanceof Error ? err.message : "Split detection poll failed");
      }
    }

    const intervalId = window.setInterval(() => void poll(), 500);
    void poll();
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [splitJobId, sessionId, onScanFinished]);

  useEffect(() => {
    if (splitProposals.length === 0) return;
    if (splitReviewIndex >= splitProposals.length) {
      setSplitReviewIndex(Math.max(0, splitProposals.length - 1));
    }
  }, [splitProposals.length, splitReviewIndex]);

  return {
    splitProposals,
    splitReviewIndex,
    splitDetectStatus,
    splitDetectProgress,
    splitDetectError,
    splitDetecting,
    splitDetectBatchLabel,
    beginSplitDetection,
    handleCancelSplitDetection,
    selectSplitProposalIndex,
    rejectCurrentSplitProposal,
  };
}
