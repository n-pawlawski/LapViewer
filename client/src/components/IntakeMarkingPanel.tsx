import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createMarker, createSplit, deleteMarker, updateMarker } from "../api/markers";
import { sessionVideoUrl, updateSession, type SessionDetail } from "../api/sessions";
import type { Lap, Marker, SessionStatus, Split } from "../types";
import type { TrackSplit } from "../api/tracks";
import { IntakeShortcutsModal } from "./IntakeShortcutsModal";
import { IntakeSidePanel, type IntakeSidePanelTab } from "./IntakeSidePanel";
import { IntakeViewScopeBar } from "./IntakeViewScopeBar";
import {
  cancelSplitDetectionJob,
  fetchSplitBankSummary,
  fetchSplitDetectionJob,
  startSplitDetection,
  type SplitBankSummaryDto,
  type SplitDetectionJobStatus,
} from "../api/splitDetection";
import { SplitDetectionPanel, type LocalSplitProposal } from "./SplitDetectionPanel";
import { bestLapTimeMsFromMarkers, lapNumberLeftOfTime, lapTimeMsAtMarker } from "../utils/laps";
import {
  findActionForEvent,
  formatShortcutBinding,
  loadIntakeShortcuts,
  saveIntakeShortcuts,
} from "../utils/intakeShortcuts";
import { seekJumpTarget } from "../utils/seek";
import {
  isTimeInsideLap,
  lapBounds,
  splitSegmentMs,
  nextEmptySplitIndex,
  seekTimeForEmptySplitSlot,
  splitForSlot,
  splitIndexForPlacementByTime,
  splitsByLapNumber,
  tailSegmentMs,
} from "../utils/splits";
import { formatLapTime, formatVideoTime, parseVideoTime } from "../utils/time";
import { MARKER_SNAP_SECONDS, nearestWithinThreshold } from "../utils/markers";
import { DEFAULT_VIDEO_FPS, frameStepSeconds } from "../utils/video";
import {
  bankCoversMissingSplits,
  lapsWithSuggestibleMissingSplits,
  missingSplitIndicesForLap,
} from "../utils/splitDetection";
import {
  clampTimeToWindow,
  computeIntakeViewWindow,
  isTimeInWindow,
  timelinePercentInWindow,
  type IntakeLapScope,
  type IntakeViewMode,
} from "../utils/intakeViewScope";

type SaveState = "saved" | "saving" | "error";

interface IntakeMarkingPanelProps {
  sessionId: string;
  sessionTitle: string;
  status: SessionStatus;
  fileName: string;
  durationSeconds: number | null;
  trackId: string | null;
  markers: Marker[];
  splits: Split[];
  trackSplits: TrackSplit[];
  laps: Lap[];
  onSessionUpdated: (session: SessionDetail) => void;
  onBackToData: () => void;
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

export function IntakeMarkingPanel({
  sessionId,
  sessionTitle,
  status,
  fileName: _fileName,
  durationSeconds,
  trackId,
  markers,
  splits,
  trackSplits,
  laps,
  onSessionUpdated,
  onBackToData,
}: IntakeMarkingPanelProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const currentTimeRef = useRef(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(durationSeconds ?? 0);
  const [playing, setPlaying] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  const [selectedLapNumber, setSelectedLapNumber] = useState<number | null>(null);
  const [selectedSplitId, setSelectedSplitId] = useState<string | null>(null);
  const [selectedSplitIndex, setSelectedSplitIndex] = useState<number | null>(null);
  const [shortcuts, setShortcuts] = useState(loadIntakeShortcuts);
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false);
  const [sidePanelTab, setSidePanelTab] = useState<IntakeSidePanelTab>("laps");
  const [splitBankSummary, setSplitBankSummary] = useState<SplitBankSummaryDto | null>(null);
  const [splitDetectStatus, setSplitDetectStatus] = useState<SplitDetectionJobStatus | "idle">("idle");
  const [splitDetectProgress, setSplitDetectProgress] = useState(0);
  const [splitDetectError, setSplitDetectError] = useState<string | null>(null);
  const [splitJobId, setSplitJobId] = useState<string | null>(null);
  const [splitProposals, setSplitProposals] = useState<LocalSplitProposal[]>([]);
  const [splitReviewIndex, setSplitReviewIndex] = useState(0);
  const [splitDetecting, setSplitDetecting] = useState(false);
  const [splitDetectBatchLabel, setSplitDetectBatchLabel] = useState<string | null>(null);
  const [selectedSuggestLaps, setSelectedSuggestLaps] = useState<number[]>([]);
  const splitDetectQueueRef = useRef<number[]>([]);
  const splitBatchTotalRef = useRef(0);
  const splitBatchCompletedRef = useRef(0);
  const [viewMode, setViewMode] = useState<IntakeViewMode>("full-race");
  const [lapScope, setLapScope] = useState<IntakeLapScope>("all");
  const durationPersisted = useRef(durationSeconds != null);
  const lastSyncedLapRef = useRef<number | null>(null);

  const playable = status === "ready";
  const frameStep = frameStepSeconds(DEFAULT_VIDEO_FPS);
  const splitMap = useMemo(() => splitsByLapNumber(splits), [splits]);
  const splitReviewActive = splitProposals.length > 0;

  const effectiveDuration = duration > 0 ? duration : (durationSeconds ?? 0);
  const viewWindow = useMemo(
    () =>
      computeIntakeViewWindow({
        viewMode,
        lapScope,
        markers,
        laps,
        durationSeconds: effectiveDuration,
      }),
    [viewMode, lapScope, markers, laps, effectiveDuration],
  );
  const viewSpanSeconds = Math.max(0.01, viewWindow.endSeconds - viewWindow.startSeconds);
  const scopedTime = currentTime - viewWindow.startSeconds;

  const missingSplitIndices = useMemo(() => {
    if (selectedLapNumber == null) return [];
    const lapSplits = splitMap.get(selectedLapNumber) ?? [];
    const bounds = lapBounds(laps, selectedLapNumber);
    const medians = splitBankSummary?.medianOffsetBySplitIndex;
    if (bounds && medians && Object.keys(medians).length > 0) {
      return missingSplitIndicesForLap(
        bounds.startSeconds,
        lapSplits.map((s) => ({ splitIndex: s.splitIndex, timeSeconds: s.timeSeconds })),
        trackSplits,
        medians,
      );
    }
    return trackSplits
      .map((ts) => ts.splitIndex)
      .filter((splitIndex) => !lapSplits.some((s) => s.splitIndex === splitIndex));
  }, [selectedLapNumber, splitMap, trackSplits, splitBankSummary, laps]);

  const bankCoversMissing = useMemo(() => {
    if (!splitBankSummary || missingSplitIndices.length === 0) return false;
    return bankCoversMissingSplits(missingSplitIndices, splitBankSummary.bySplitIndex);
  }, [splitBankSummary, missingSplitIndices]);

  const lapsWithMissing = useMemo(
    () =>
      lapsWithSuggestibleMissingSplits({
        laps,
        splitsByLap: splitMap,
        trackSplits,
        medianOffsetBySplitIndex: splitBankSummary?.medianOffsetBySplitIndex,
        bySplitIndex: splitBankSummary?.bySplitIndex,
      }),
    [laps, splitMap, trackSplits, splitBankSummary],
  );

  const visibleSelectedSuggestLaps = useMemo(
    () =>
      selectedSuggestLaps.filter((lapNumber) =>
        lapsWithMissing.some((entry) => entry.lapNumber === lapNumber),
      ),
    [selectedSuggestLaps, lapsWithMissing],
  );

  const canSuggestSelectedLaps =
    trackId != null &&
    trackSplits.length > 0 &&
    visibleSelectedSuggestLaps.length > 0 &&
    !splitDetecting &&
    splitBankSummary != null &&
    splitBankSummary.totalEntries > 0;

  const suggestSelectedDisabledReason = useMemo(() => {
    if (!trackId) return "Assign a track to this session.";
    if (trackSplits.length === 0) return "Configure splits on the Tracks page.";
    if (lapsWithMissing.length === 0) {
      return "No laps have missing splits that can be suggested.";
    }
    if (visibleSelectedSuggestLaps.length === 0) return "Select at least one lap above.";
    if (!splitBankSummary || splitBankSummary.totalEntries === 0) {
      return "No reference images yet — mark splits manually on any lap first.";
    }
    return null;
  }, [
    trackId,
    trackSplits.length,
    lapsWithMissing.length,
    visibleSelectedSuggestLaps.length,
    splitBankSummary,
  ]);

  const suggestDisabledReason = useMemo(() => {
    if (!trackId) return "Assign a track to this session.";
    if (trackSplits.length === 0) return "Configure splits on the Tracks page.";
    if (selectedLapNumber == null) return "Select a lap in the table or timeline.";
    if (missingSplitIndices.length === 0) {
      return "Every split is assigned and within timing tolerance for this lap.";
    }
    if (!splitBankSummary || splitBankSummary.totalEntries === 0) {
      return "No reference images yet — mark splits manually on any lap first.";
    }
    const missingBank = missingSplitIndices.filter(
      (idx) => (splitBankSummary.bySplitIndex[idx] ?? 0) === 0,
    );
    if (missingBank.length > 0) {
      return `No reference for split ${missingBank.join(", ")} — mark those on another lap first.`;
    }
    return null;
  }, [trackId, trackSplits.length, selectedLapNumber, missingSplitIndices, splitBankSummary]);

  const canSuggestSplits =
    trackId != null &&
    selectedLapNumber != null &&
    missingSplitIndices.length > 0 &&
    bankCoversMissing &&
    !splitDetecting;

  const refreshSplitBankSummary = useCallback(async () => {
    if (!trackId) {
      setSplitBankSummary(null);
      return;
    }
    try {
      const summary = await fetchSplitBankSummary(trackId);
      setSplitBankSummary(summary);
    } catch {
      setSplitBankSummary(null);
    }
  }, [trackId]);

  useEffect(() => {
    void refreshSplitBankSummary();
  }, [refreshSplitBankSummary, splits.length]);

  useEffect(() => {
    const stillMissing = new Set(lapsWithMissing.map((entry) => entry.lapNumber));
    setSelectedSuggestLaps((prev) => {
      const next = prev.filter((lapNumber) => stillMissing.has(lapNumber));
      return next.length === prev.length ? prev : next;
    });
  }, [lapsWithMissing]);

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

  const acceptCurrentSplitProposal = useCallback(async () => {
    if (splitProposals.length === 0) return;
    const proposal = splitProposals[Math.min(splitReviewIndex, splitProposals.length - 1)];
    if (!proposal) return;

    const time = currentTimeRef.current;
    setSaveState("saving");
    setSaveError(null);
    try {
      const result = await createSplit(sessionId, proposal.lapNumber, proposal.splitIndex, time);
      onSessionUpdated(result.session);
      rejectCurrentSplitProposal();
      await refreshSplitBankSummary();
      setSaveState("saved");
    } catch (err) {
      setSaveState("error");
      setSaveError(err instanceof Error ? err.message : "Accept failed");
    }
  }, [
    splitProposals,
    splitReviewIndex,
    sessionId,
    onSessionUpdated,
    rejectCurrentSplitProposal,
    refreshSplitBankSummary,
  ]);

  const beginSplitDetection = useCallback(
    async (lapNumbers: number[]) => {
      if (lapNumbers.length === 0 || !trackId) return;

      setSplitDetectError(null);
      setSplitProposals([]);
      setSplitDetectStatus("queued");
      setSplitDetectProgress(0);
      setSplitDetecting(true);
      setSidePanelTab("suggest");

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
        setSplitDetectError(err instanceof Error ? err.message : "Could not start split detection");
      }
    },
    [trackId, sessionId],
  );

  const handleStartSplitDetection = useCallback(async () => {
    if (selectedLapNumber == null) return;
    await beginSplitDetection([selectedLapNumber]);
  }, [selectedLapNumber, beginSplitDetection]);

  const handleSuggestSelectedLaps = useCallback(async () => {
    await beginSplitDetection(visibleSelectedSuggestLaps);
  }, [visibleSelectedSuggestLaps, beginSplitDetection]);

  const toggleSuggestLap = useCallback((lapNumber: number) => {
    setSelectedSuggestLaps((prev) =>
      prev.includes(lapNumber)
        ? prev.filter((n) => n !== lapNumber)
        : [...prev, lapNumber].sort((a, b) => a - b),
    );
  }, []);

  const selectAllSuggestLaps = useCallback(() => {
    setSelectedSuggestLaps(lapsWithMissing.map((entry) => entry.lapNumber));
  }, [lapsWithMissing]);

  const clearSuggestLaps = useCallback(() => {
    setSelectedSuggestLaps([]);
  }, []);

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
    if (splitProposals.length > 0) {
      setSidePanelTab("suggest");
    }
  }, [splitProposals.length]);

  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

  useEffect(() => {
    if (durationSeconds != null) {
      setDuration(durationSeconds);
      durationPersisted.current = true;
    }
  }, [durationSeconds]);

  const persistDuration = useCallback(
    async (seconds: number) => {
      if (durationPersisted.current) return;
      durationPersisted.current = true;
      try {
        const session = await updateSession(sessionId, { durationSeconds: seconds });
        onSessionUpdated(session);
      } catch {
        durationPersisted.current = false;
      }
    },
    [sessionId, onSessionUpdated],
  );

  const seek = useCallback(
    (time: number) => {
      const video = videoRef.current;
      const max = effectiveDuration > 0 ? effectiveDuration : time;
      const clamped = clampTimeToWindow(Math.max(0, Math.min(max, time)), viewWindow);
      if (video) {
        video.currentTime = clamped;
      }
      setCurrentTime(clamped);
      currentTimeRef.current = clamped;
    },
    [effectiveDuration, viewWindow],
  );

  useEffect(() => {
    if (viewMode === "only-laps" && markers.length === 0) {
      setViewMode("full-race");
      setLapScope("all");
    }
  }, [viewMode, markers.length]);

  useEffect(() => {
    if (typeof lapScope === "number" && lapScope > markers.length) {
      setLapScope("all");
    }
  }, [lapScope, markers.length]);

  useEffect(() => {
    if (!isTimeInWindow(currentTimeRef.current, viewWindow)) {
      seek(clampTimeToWindow(currentTimeRef.current, viewWindow));
    }
  }, [viewWindow, seek]);

  const syncActiveLapFromSeeker = useCallback(
    (time: number) => {
      const lapNumber = lapNumberLeftOfTime(markers, time);

      if (lapNumber == null) {
        if (lastSyncedLapRef.current !== null) {
          lastSyncedLapRef.current = null;
          setSelectedMarkerId(null);
          setSelectedLapNumber(null);
          setSelectedSplitId(null);
          setSelectedSplitIndex(null);
        }
        return;
      }

      const marker = markers[lapNumber - 1];
      const lapSplits = splitMap.get(lapNumber) ?? [];
      const placementIndex =
        splitIndexForPlacementByTime(time, trackSplits, lapSplits) ??
        nextEmptySplitIndex(trackSplits, lapSplits) ??
        trackSplits[0]?.splitIndex ??
        null;

      if (lapNumber !== lastSyncedLapRef.current) {
        lastSyncedLapRef.current = lapNumber;
        setSelectedSplitId(null);
      }

      setSelectedMarkerId(marker.id);
      setSelectedLapNumber(lapNumber);
      setSelectedSplitIndex(placementIndex);
    },
    [markers, splitMap, trackSplits],
  );

  const seekAndSync = useCallback(
    (time: number) => {
      seek(time);
      syncActiveLapFromSeeker(time);
    },
    [seek, syncActiveLapFromSeeker],
  );

  const handleViewModeChange = useCallback(
    (mode: IntakeViewMode) => {
      setViewMode(mode);
      if (mode === "only-laps" && markers.length > 0) {
        seekAndSync(markers[0]!.timeSeconds);
      }
    },
    [markers, seekAndSync],
  );

  const handleLapScopeChange = useCallback(
    (scope: IntakeLapScope) => {
      setLapScope(scope);
      if (typeof scope === "number") {
        const marker = markers[scope - 1];
        const bounds = lapBounds(laps, scope);
        if (marker) {
          lastSyncedLapRef.current = scope;
          setSelectedMarkerId(marker.id);
          setSelectedLapNumber(scope);
          setSelectedSplitId(null);
          seekAndSync(bounds?.startSeconds ?? marker.timeSeconds);
        }
        return;
      }
      if (markers.length > 0) {
        seekAndSync(markers[0]!.timeSeconds);
      }
    },
    [markers, laps, seekAndSync],
  );

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
            setSplitProposals((prev) =>
              batchTotal > 1 ? [...prev, ...mapped] : mapped,
            );
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
          setSidePanelTab("suggest");
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
  }, [splitJobId, seekAndSync, sessionId]);

  useEffect(() => {
    if (splitProposals.length === 0) return;
    if (splitReviewIndex >= splitProposals.length) {
      setSplitReviewIndex(Math.max(0, splitProposals.length - 1));
    }
  }, [splitProposals.length, splitReviewIndex]);

  useEffect(() => {
    if (!splitReviewActive) return;
    const proposal = splitProposals[splitReviewIndex];
    if (!proposal) return;
    seekAndSync(proposal.time);
    const marker = markers[proposal.lapNumber - 1];
    if (marker) {
      lastSyncedLapRef.current = proposal.lapNumber;
      setSelectedMarkerId(marker.id);
      setSelectedLapNumber(proposal.lapNumber);
      setSelectedSplitId(null);
      setSelectedSplitIndex(proposal.splitIndex);
    }
  }, [splitReviewIndex, splitReviewActive, splitProposals, seekAndSync, markers]);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      void video.play().catch(() => undefined);
      setPlaying(true);
    } else {
      video.pause();
      setPlaying(false);
    }
  }, []);

  const stepFrame = useCallback(
    (direction: -1 | 1) => {
      const video = videoRef.current;
      if (video) video.pause();
      setPlaying(false);
      seekAndSync(currentTimeRef.current + direction * frameStep);
    },
    [frameStep, seekAndSync],
  );

  const stepJump = useCallback(
    (direction: "left" | "right") => {
      const video = videoRef.current;
      if (video) video.pause();
      setPlaying(false);
      const dur = duration > 0 ? duration : (durationSeconds ?? 0);
      const target = seekJumpTarget(
        direction,
        currentTimeRef.current,
        markers,
        dur,
      );
      seekAndSync(target);
    },
    [markers, duration, durationSeconds, seekAndSync],
  );

  const stepSeek = useCallback(
    (deltaSeconds: number) => {
      const video = videoRef.current;
      if (video) video.pause();
      setPlaying(false);
      seekAndSync(currentTimeRef.current + deltaSeconds);
    },
    [seekAndSync],
  );

  async function runMarkerMutation(
    action: () => Promise<{ session: SessionDetail }>,
  ): Promise<SessionDetail | null> {
    setSaveState("saving");
    setSaveError(null);
    try {
      const result = await action();
      onSessionUpdated(result.session);
      setSaveState("saved");
      return result.session;
    } catch (err) {
      setSaveState("error");
      setSaveError(err instanceof Error ? err.message : "Save failed");
      return null;
    }
  }

  const addMarkerAtCurrentTime = useCallback(() => {
    const time = currentTimeRef.current;
    const nearby = nearestWithinThreshold(markers, time, MARKER_SNAP_SECONDS);
    if (nearby) {
      setSelectedMarkerId(nearby.id);
      void runMarkerMutation(() => updateMarker(nearby.id, { timeSeconds: time }));
      return;
    }
    void runMarkerMutation(() => createMarker(sessionId, time));
  }, [sessionId, markers]);

  const addSplitAtCurrentTime = useCallback(async () => {
    if (selectedLapNumber == null) return;
    const bounds = lapBounds(laps, selectedLapNumber);
    if (!bounds) return;
    const time = currentTimeRef.current;
    if (!isTimeInsideLap(time, bounds.startSeconds, bounds.endSeconds)) return;

    const lapNumber = selectedLapNumber;
    const lapSplits = splits.filter((split) => split.lapNumber === lapNumber);
    const nearby = nearestWithinThreshold(lapSplits, time, MARKER_SNAP_SECONDS);
    if (nearby) {
      setSelectedSplitId(nearby.id);
      setSelectedSplitIndex(nearby.splitIndex);
      const session = await runMarkerMutation(() => updateMarker(nearby.id, { timeSeconds: time }));
      if (!session) return;
      const updatedLapSplits = session.splits.filter((split) => split.lapNumber === lapNumber);
      setSelectedSplitIndex(
        splitIndexForPlacementByTime(time, trackSplits, updatedLapSplits) ?? null,
      );
      return;
    }

    if (lapSplits.length >= trackSplits.length) return;

    const emptySelectedSlot =
      selectedSplitIndex != null && !splitForSlot(lapSplits, selectedSplitIndex);
    const splitIndex = emptySelectedSlot
      ? selectedSplitIndex
      : splitIndexForPlacementByTime(time, trackSplits, lapSplits) ??
        nextEmptySplitIndex(trackSplits, lapSplits) ??
        trackSplits[0]?.splitIndex;
    if (splitIndex == null) return;

    const session = await runMarkerMutation(() =>
      createSplit(sessionId, lapNumber, splitIndex, time),
    );
    if (!session) return;
    const updatedLapSplits = session.splits.filter((split) => split.lapNumber === lapNumber);
    setSelectedSplitIndex(
      splitIndexForPlacementByTime(time, trackSplits, updatedLapSplits) ?? null,
    );
    setSelectedSplitId(null);
  }, [sessionId, selectedLapNumber, selectedSplitIndex, laps, trackSplits, splits]);

  useEffect(() => {
    lastSyncedLapRef.current = null;
    syncActiveLapFromSeeker(currentTimeRef.current);
  }, [markers, syncActiveLapFromSeeker]);

  function handleTimeUpdate() {
    const video = videoRef.current;
    if (!video) return;
    let time = video.currentTime;
    if (time > viewWindow.endSeconds + 0.05) {
      time = viewWindow.endSeconds;
      video.pause();
      video.currentTime = time;
      setPlaying(false);
    }
    setCurrentTime(time);
    currentTimeRef.current = time;
    syncActiveLapFromSeeker(time);
  }

  function handleLoadedMetadata() {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration)) return;
    setDuration(video.duration);
    void persistDuration(video.duration);
  }

  function handleDeleteMarker(markerId: string) {
    void runMarkerMutation(() => deleteMarker(markerId));
    if (selectedMarkerId === markerId) {
      setSelectedMarkerId(null);
      setSelectedLapNumber(null);
    }
    lastSyncedLapRef.current = null;
  }

  function handleMarkerTimeCommit(markerId: string, value: string) {
    const seconds = parseVideoTime(value);
    if (seconds == null) return;
    void runMarkerMutation(() => updateMarker(markerId, { timeSeconds: seconds }));
  }

  function handleDeleteSplit(splitId: string) {
    void runMarkerMutation(() => deleteMarker(splitId));
    if (selectedSplitId === splitId) {
      setSelectedSplitId(null);
      setSelectedSplitIndex(null);
    }
  }

  function handleSplitTimeCommit(splitId: string, value: string) {
    const seconds = parseVideoTime(value);
    if (seconds == null) return;
    void runMarkerMutation(() => updateMarker(splitId, { timeSeconds: seconds }));
  }
  function handleIgnoredChange(markerId: string, ignored: boolean) {
    void runMarkerMutation(() => updateMarker(markerId, { ignored }));
  }

  const removeTarget = useMemo(() => {
    if (selectedSplitId) {
      const split = splits.find((entry) => entry.id === selectedSplitId);
      if (split) {
        return {
          type: "split" as const,
          id: split.id,
          label: `${split.label} (Lap ${split.lapNumber})`,
        };
      }
    }

    if (selectedLapNumber != null) {
      const lapSplits = splitMap.get(selectedLapNumber) ?? [];
      const nearby = nearestWithinThreshold(
        lapSplits,
        currentTime,
        MARKER_SNAP_SECONDS,
      );
      if (nearby) {
        return {
          type: "split" as const,
          id: nearby.id,
          label: `${nearby.label} (Lap ${nearby.lapNumber})`,
        };
      }
    }

    if (selectedMarkerId) {
      const lapNumber = markers.findIndex((marker) => marker.id === selectedMarkerId) + 1;
      if (lapNumber > 0) {
        return {
          type: "lap" as const,
          id: selectedMarkerId,
          label: `Lap ${lapNumber} start`,
        };
      }
    }

    return null;
  }, [
    selectedSplitId,
    splits,
    selectedLapNumber,
    splitMap,
    currentTime,
    selectedMarkerId,
    markers,
  ]);

  const removeSelectedMarker = useCallback(() => {
    if (!removeTarget) return;
    if (removeTarget.type === "split") {
      handleDeleteSplit(removeTarget.id);
      return;
    }
    handleDeleteMarker(removeTarget.id);
  }, [removeTarget]);

  function handleMarkerClick(marker: Marker, lapNumber: number) {
    const bounds = lapBounds(laps, lapNumber);
    const lapSplits = splitMap.get(lapNumber) ?? [];
    const nextEmpty = nextEmptySplitIndex(trackSplits, lapSplits);

    if (bounds && nextEmpty != null) {
      const seekTime = seekTimeForEmptySplitSlot(bounds, lapSplits, trackSplits, nextEmpty);
      seek(seekTime);
      lastSyncedLapRef.current = lapNumber;
      setSelectedSplitIndex(nextEmpty);
    } else {
      seekAndSync(marker.timeSeconds);
    }

    setSelectedMarkerId(marker.id);
    setSelectedLapNumber(lapNumber);
    setSelectedSplitId(null);
  }

  function handleSplitClick(split: Split) {
    seekAndSync(split.timeSeconds);
    setSelectedSplitId(split.id);
    setSelectedSplitIndex(split.splitIndex);
  }

  function handleSplitSlotClick(lapNumber: number, splitIndex: number, split?: Split) {
    if (split) {
      seekAndSync(split.timeSeconds);
      setSelectedSplitId(split.id);
      setSelectedSplitIndex(split.splitIndex);
      return;
    }

    const marker = markers[lapNumber - 1];
    const bounds = lapBounds(laps, lapNumber);
    const lapSplits = splitMap.get(lapNumber) ?? [];
    setSelectedMarkerId(marker?.id ?? null);
    setSelectedLapNumber(lapNumber);
    setSelectedSplitId(null);
    setSelectedSplitIndex(splitIndex);

    if (bounds) {
      const seekTime = seekTimeForEmptySplitSlot(bounds, lapSplits, trackSplits, splitIndex);
      seek(seekTime);
      lastSyncedLapRef.current = lapNumber;
    } else if (marker) {
      seekAndSync(marker.timeSeconds);
    }
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (isTypingTarget(e.target)) return;
      if (shortcutsModalOpen) return;

      if (e.key === "?" && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setShortcutsModalOpen(true);
        return;
      }

      if (
        e.key === "Backspace" &&
        !e.ctrlKey &&
        !e.altKey &&
        !e.shiftKey &&
        removeTarget
      ) {
        e.preventDefault();
        removeSelectedMarker();
        return;
      }

      if (splitReviewActive) {
        const key = e.key.toLowerCase();
        if (key === ",") {
          e.preventDefault();
          selectSplitProposalIndex(splitReviewIndex - 1);
          return;
        }
        if (key === ".") {
          e.preventDefault();
          selectSplitProposalIndex(splitReviewIndex + 1);
          return;
        }
        if (key === "x") {
          e.preventDefault();
          rejectCurrentSplitProposal();
          return;
        }
      }

      const action = findActionForEvent(e, shortcuts);
      if (!action) return;

      e.preventDefault();
      switch (action) {
        case "playPause":
          togglePlay();
          break;
        case "frameBack":
          stepFrame(-1);
          break;
        case "frameForward":
          stepFrame(1);
          break;
        case "jumpBack":
          stepJump("left");
          break;
        case "jumpForward":
          stepJump("right");
          break;
        case "seekBack5":
          stepSeek(-5);
          break;
        case "seekForward5":
          stepSeek(5);
          break;
        case "seekBack15":
          stepSeek(-15);
          break;
        case "seekForward15":
          stepSeek(15);
          break;
        case "addLap":
          addMarkerAtCurrentTime();
          break;
        case "addSplit":
          if (splitReviewActive) {
            void acceptCurrentSplitProposal();
          } else {
            void addSplitAtCurrentTime();
          }
          break;
        case "removeMarker":
          removeSelectedMarker();
          break;
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    shortcuts,
    shortcutsModalOpen,
    splitReviewActive,
    removeTarget,
    removeSelectedMarker,
    splitReviewIndex,
    selectSplitProposalIndex,
    acceptCurrentSplitProposal,
    rejectCurrentSplitProposal,
    togglePlay,
    addMarkerAtCurrentTime,
    addSplitAtCurrentTime,
    removeSelectedMarker,
    stepFrame,
    stepJump,
    stepSeek,
  ]);

  const shortcutsHint = useMemo(
    () =>
      [
        `${formatShortcutBinding(shortcuts.frameBack)}/${formatShortcutBinding(shortcuts.frameForward)} frame`,
        `${formatShortcutBinding(shortcuts.jumpBack)}/${formatShortcutBinding(shortcuts.jumpForward)} jump`,
        `${formatShortcutBinding(shortcuts.seekBack5)}/${formatShortcutBinding(shortcuts.seekForward5)} ±5s`,
        `${formatShortcutBinding(shortcuts.seekBack15)}/${formatShortcutBinding(shortcuts.seekForward15)} ±15s`,
        `${formatShortcutBinding(shortcuts.playPause)} play`,
        `${formatShortcutBinding(shortcuts.addLap)} lap`,
        `${formatShortcutBinding(shortcuts.addSplit)} split`,
        `${formatShortcutBinding(shortcuts.removeMarker)} remove`,
      ].join(" · "),
    [shortcuts],
  );

  const selectedLapBounds =
    selectedLapNumber != null ? lapBounds(laps, selectedLapNumber) : null;
  const selectedLapSplits =
    selectedLapNumber != null ? (splitMap.get(selectedLapNumber) ?? []) : [];
  const placementSplitIndex =
    selectedLapNumber != null
      ? splitIndexForPlacementByTime(currentTime, trackSplits, selectedLapSplits)
      : null;
  const nearbySplit =
    selectedLapNumber != null
      ? nearestWithinThreshold(selectedLapSplits, currentTime, MARKER_SNAP_SECONDS)
      : undefined;
  const emptySelectedSlot =
    selectedLapNumber != null &&
    selectedSplitIndex != null &&
    !splitForSlot(selectedLapSplits, selectedSplitIndex);
  const playheadInsideLap =
    selectedLapBounds != null &&
    isTimeInsideLap(
      currentTime,
      selectedLapBounds.startSeconds,
      selectedLapBounds.endSeconds,
    );
  const canAddSplit =
    trackSplits.length > 0 &&
    selectedLapNumber != null &&
    selectedLapBounds != null &&
    playheadInsideLap &&
    (nearbySplit != null ||
      emptySelectedSlot ||
      (selectedLapSplits.length < trackSplits.length && placementSplitIndex != null));

  const firstMarkerTime = markers[0]?.timeSeconds;
  const bestLapMs = bestLapTimeMsFromMarkers(markers, effectiveDuration);

  const visibleLapMarkers = useMemo(() => {
    if (viewMode !== "only-laps" || typeof lapScope !== "number") {
      return markers.map((marker, index) => ({ marker, lapNumber: index + 1 }));
    }
    const marker = markers[lapScope - 1];
    return marker ? [{ marker, lapNumber: lapScope }] : [];
  }, [viewMode, lapScope, markers]);

  const visibleSplits = useMemo(() => {
    if (viewMode !== "only-laps" || typeof lapScope !== "number") {
      return splits.filter((split) => isTimeInWindow(split.timeSeconds, viewWindow));
    }
    return splits.filter((split) => split.lapNumber === lapScope);
  }, [viewMode, lapScope, splits, viewWindow]);

  const visibleSplitProposals = useMemo(
    () => splitProposals.filter((proposal) => isTimeInWindow(proposal.time, viewWindow)),
    [splitProposals, viewWindow],
  );

  return (
    <section className="intake-marking">
      <div className="intake-marking-header">
        <div className="intake-marking-header-left">
          <button type="button" className="btn btn-secondary btn-sm" onClick={onBackToData}>
            ← Data
          </button>
          <h2>{sessionTitle}</h2>
        </div>
        <span className={`intake-save-state intake-save-state--${saveState}`}>
          {saveState === "saving" && "Saving…"}
          {saveState === "saved" && "Saved ✓"}
          {saveState === "error" && "Save error"}
        </span>
      </div>

      {!playable && (
        <p className="data-status data-status--error">
          Video file is not available ({status}). Check the path on disk.
        </p>
      )}

      {playable && (
        <>
          <IntakeViewScopeBar
            viewMode={viewMode}
            onViewModeChange={handleViewModeChange}
            lapScope={lapScope}
            onLapScopeChange={handleLapScopeChange}
            lapCount={markers.length}
            hasLapMarkers={markers.length > 0}
          />
        <div className="intake-marking-player-row intake-marking-player-row--with-panel">
          <div className="intake-marking-player">
          <div className="intake-player-wrap">
            <video
              ref={videoRef}
              className="intake-player"
              src={sessionVideoUrl(sessionId)}
              preload="metadata"
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onClick={togglePlay}
            />
          </div>

          <div className="intake-timeline">
            <div className="intake-timeline-track">
              {viewSpanSeconds > 0 &&
                visibleLapMarkers.map(({ marker, lapNumber }) => (
                  <button
                    key={marker.id}
                    type="button"
                    className={`intake-timeline-marker intake-timeline-marker--lap ${
                      selectedMarkerId === marker.id ? "intake-timeline-marker--selected" : ""
                    }`}
                    style={{
                      left: `${timelinePercentInWindow(marker.timeSeconds, viewWindow)}%`,
                    }}
                    title={`Lap ${lapNumber} — ${formatVideoTime(marker.timeSeconds)}`}
                    onClick={() => handleMarkerClick(marker, lapNumber)}
                  />
                ))}
              {viewSpanSeconds > 0 &&
                visibleSplits.map((split) => (
                  <button
                    key={split.id}
                    type="button"
                    className={`intake-timeline-marker intake-timeline-marker--split ${
                      selectedSplitId === split.id ? "intake-timeline-marker--selected" : ""
                    }`}
                    style={{
                      left: `${timelinePercentInWindow(split.timeSeconds, viewWindow)}%`,
                    }}
                    title={`Lap ${split.lapNumber} ${split.label} — ${formatVideoTime(split.timeSeconds)}`}
                    onClick={() => handleSplitClick(split)}
                  />
                ))}
              {viewSpanSeconds > 0 &&
                visibleSplitProposals.map((proposal) => {
                  const index = splitProposals.findIndex((entry) => entry.id === proposal.id);
                  return (
                    <button
                      key={proposal.id}
                      type="button"
                      className={`intake-timeline-marker intake-timeline-marker--split-suggested ${
                        splitReviewActive && index === splitReviewIndex
                          ? "intake-timeline-marker--selected"
                          : ""
                      }`}
                      style={{
                        left: `${timelinePercentInWindow(proposal.time, viewWindow)}%`,
                      }}
                      title={`Suggested ${proposal.label} — ${formatVideoTime(proposal.time)} (${(proposal.confidence * 100).toFixed(0)}%)`}
                      onClick={() => {
                        selectSplitProposalIndex(index);
                        seekAndSync(proposal.time);
                      }}
                    />
                  );
                })}
            </div>
            <input
              type="range"
              className="intake-scrubber"
              min={0}
              max={viewSpanSeconds}
              step={0.01}
              value={Math.max(0, Math.min(viewSpanSeconds, scopedTime))}
              onChange={(e) => seekAndSync(viewWindow.startSeconds + Number(e.target.value))}
            />
          </div>

          <div className="intake-transport">
            <button type="button" className="btn btn-transport" onClick={togglePlay}>
              {playing ? "Pause" : "Play"}
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => stepFrame(-1)}>
              ← Frame
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => stepFrame(1)}>
              Frame →
            </button>
            <span className="intake-time-readout">
              {formatVideoTime(currentTime)}
              {viewMode === "only-laps" ? (
                <>
                  {" "}
                  <span className="intake-time-readout-scope">
                    ({formatVideoTime(viewWindow.startSeconds)}–{formatVideoTime(viewWindow.endSeconds)})
                  </span>
                </>
              ) : (
                <> / {formatVideoTime(effectiveDuration)}</>
              )}
            </span>
            <button type="button" className="btn btn-primary" onClick={addMarkerAtCurrentTime}>
              + Lap
            </button>
            <button
              type="button"
              className="btn btn-auto-detect"
              onClick={() => void handleStartSplitDetection()}
              disabled={!canSuggestSplits}
              title={
                canSuggestSplits
                  ? `Suggest missing splits on lap ${selectedLapNumber} using track reference images`
                  : (suggestDisabledReason ?? "Cannot suggest splits")
              }
            >
              {splitDetecting ? "Scanning…" : "Suggest splits"}
            </button>
            <button
              type="button"
              className="btn btn-split"
              onClick={addSplitAtCurrentTime}
              disabled={!canAddSplit}
              title={
                trackSplits.length === 0
                  ? "Configure splits on the Tracks page"
                  : selectedLapNumber == null
                    ? "Select a lap first"
                    : !playheadInsideLap
                      ? "Scrub inside the lap — splits cannot sit on the lap start or end marker"
                      : canAddSplit
                        ? nearbySplit
                          ? `Adjust ${nearbySplit.label} (snaps within ${MARKER_SNAP_SECONDS}s)`
                          : emptySelectedSlot
                            ? `Place ${
                                trackSplits.find((s) => s.splitIndex === selectedSplitIndex)?.name ??
                                "split"
                              } on Lap ${selectedLapNumber}`
                            : `Place ${
                                trackSplits.find((s) => s.splitIndex === placementSplitIndex)?.name ??
                                "split"
                              } on Lap ${selectedLapNumber} by lap time`
                        : "This lap already has all splits marked"
              }
            >
              + Split
            </button>
            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={removeSelectedMarker}
              disabled={!removeTarget}
              title={
                removeTarget
                  ? `Remove ${removeTarget.label}`
                  : "Select a marker, split, or scrub near a split to remove"
              }
            >
              Remove
            </button>
            <span className="field-hint intake-shortcuts">{shortcutsHint}</span>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setShortcutsModalOpen(true)}
            >
              Shortcuts
            </button>
          </div>
          </div>

          <IntakeSidePanel
            activeTab={sidePanelTab}
            onTabChange={setSidePanelTab}
            proposalCount={splitProposals.length}
            lapCount={markers.length}
            suggest={
              <SplitDetectionPanel
                status={
                  splitDetecting
                    ? splitDetectStatus
                    : splitProposals.length > 0
                      ? "done"
                      : splitDetectStatus
                }
                progress={splitDetectProgress}
                proposals={splitProposals}
                reviewIndex={splitReviewIndex}
                bankSummary={splitBankSummary}
                missingSplitIndices={missingSplitIndices}
                selectedLapNumber={selectedLapNumber}
                lapsWithMissing={lapsWithMissing}
                selectedSuggestLaps={visibleSelectedSuggestLaps}
                batchLabel={splitDetectBatchLabel}
                detecting={splitDetecting}
                canSuggest={canSuggestSplits}
                canSuggestSelected={canSuggestSelectedLaps}
                suggestDisabledReason={suggestDisabledReason}
                suggestSelectedDisabledReason={suggestSelectedDisabledReason}
                error={splitDetectError}
                onToggleSuggestLap={toggleSuggestLap}
                onSelectAllSuggestLaps={selectAllSuggestLaps}
                onClearSuggestLaps={clearSuggestLaps}
                onSuggestSelected={() => void handleSuggestSelectedLaps()}
                onSelectIndex={selectSplitProposalIndex}
                onAccept={() => void acceptCurrentSplitProposal()}
                onReject={rejectCurrentSplitProposal}
                onCancelJob={() => void handleCancelSplitDetection()}
              />
            }
            laps={
              <div className="intake-marker-table-wrap">
                {trackSplits.length === 0 && markers.length > 0 && (
                  <p className="data-status data-status--warn intake-track-splits-hint">
                    Assign a track with splits on the <strong>Tracks</strong> page before marking
                    splits.
                  </p>
                )}
                {markers.length === 0 ? (
                  <p className="intake-empty-hint">
                    Scrub or frame-step to each lap start, then press <strong>M</strong> or{" "}
                    <strong>+ Lap</strong>.
                  </p>
                ) : trackSplits.length === 0 ? (
                  <p className="intake-empty-hint">
                    Laps are marked. Configure splits for this track, then select a lap and fill each
                    split slot with <strong>S</strong>.
                  </p>
                ) : (
                  <table className="intake-marker-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Time</th>
                    <th>Segment</th>
                    <th>Ignore</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {firstMarkerTime != null && firstMarkerTime > 0.5 && (
                    <tr className="intake-marker-row intake-marker-row--outlap">
                      <td>Outlap</td>
                      <td>{formatVideoTime(0)}</td>
                      <td>{formatVideoTime(firstMarkerTime)}</td>
                      <td />
                      <td />
                    </tr>
                  )}
                  {markers.map((marker, index) => {
                    const lapNumber = index + 1;
                    const lap = laps[index];
                    const lapSplits = splitMap.get(lapNumber) ?? [];
                    const lapTimeMs = lapTimeMsAtMarker(
                      markers,
                      index,
                      duration > 0 ? duration : durationSeconds,
                    );
                    const isBest =
                      !marker.ignored && bestLapMs != null && lapTimeMs === bestLapMs;
                    const lapSelected = selectedLapNumber === lapNumber && !selectedSplitId;
                    return (
                      <Fragment key={marker.id}>
                        <tr
                          className={`intake-marker-row intake-marker-row--lap ${
                            selectedMarkerId === marker.id ? "intake-marker-row--selected" : ""
                          } ${lapSelected ? "intake-marker-row--lap-active" : ""} ${
                            isBest ? "intake-marker-row--best" : ""
                          } ${marker.ignored ? "intake-marker-row--ignored" : ""}`}
                          onClick={() => handleMarkerClick(marker, lapNumber)}
                        >
                          <td>Lap {lapNumber}</td>
                          <td onClick={(e) => e.stopPropagation()}>
                            <input
                              type="text"
                              className="intake-marker-time-input"
                              defaultValue={formatVideoTime(marker.timeSeconds)}
                              key={marker.timeSeconds}
                              onBlur={(e) => handleMarkerTimeCommit(marker.id, e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") e.currentTarget.blur();
                              }}
                            />
                          </td>
                          <td className="lap-time-cell">
                            {lapTimeMs != null ? formatLapTime(lapTimeMs) : "—"}
                          </td>
                          <td onClick={(e) => e.stopPropagation()}>
                            <label className="intake-ignore-label">
                              <input
                                type="checkbox"
                                checked={marker.ignored ?? false}
                                onChange={(e) =>
                                  handleIgnoredChange(marker.id, e.target.checked)
                                }
                              />
                              Ignore
                            </label>
                          </td>
                          <td onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              className="btn btn-danger btn-sm"
                              aria-label={`Remove lap ${lapNumber} start marker`}
                              onClick={() => handleDeleteMarker(marker.id)}
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                        {trackSplits.map((trackSplit, splitIdx) => {
                          const split = splitForSlot(lapSplits, trackSplit.splitIndex);
                          const priorSplit =
                            splitIdx > 0
                              ? splitForSlot(lapSplits, trackSplits[splitIdx - 1].splitIndex)
                              : undefined;
                          const segmentMs = split
                            ? splitSegmentMs(split, marker.timeSeconds, priorSplit)
                            : null;
                          const slotSelected =
                            selectedLapNumber === lapNumber &&
                            selectedSplitIndex === trackSplit.splitIndex;
                          return (
                            <tr
                              key={`${lapNumber}-${trackSplit.splitIndex}`}
                              className={`intake-marker-row intake-split-row ${
                                split && selectedSplitId === split.id
                                  ? "intake-marker-row--selected"
                                  : ""
                              } ${slotSelected ? "intake-split-row--slot-active" : ""} ${
                                !split ? "intake-split-row--empty" : ""
                              }`}
                              onClick={() =>
                                handleSplitSlotClick(lapNumber, trackSplit.splitIndex, split)
                              }
                            >
                              <td>{trackSplit.name}</td>
                              <td onClick={(e) => e.stopPropagation()}>
                                {split ? (
                                  <input
                                    type="text"
                                    className="intake-marker-time-input"
                                    defaultValue={formatVideoTime(split.timeSeconds)}
                                    key={split.timeSeconds}
                                    onBlur={(e) =>
                                      handleSplitTimeCommit(split.id, e.target.value)
                                    }
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") e.currentTarget.blur();
                                    }}
                                  />
                                ) : (
                                  "—"
                                )}
                              </td>
                              <td className="lap-time-cell">
                                {segmentMs != null ? formatLapTime(segmentMs) : "—"}
                              </td>
                              <td />
                              <td onClick={(e) => e.stopPropagation()}>
                                {split ? (
                                  <button
                                    type="button"
                                    className="btn btn-danger btn-sm"
                                    aria-label={`Remove ${split.label} on lap ${lapNumber}`}
                                    onClick={() => handleDeleteSplit(split.id)}
                                  >
                                    Remove
                                  </button>
                                ) : null}
                              </td>
                            </tr>
                          );
                        })}
                        {trackSplits.length > 0 && lap && (
                          <tr className="intake-marker-row intake-split-tail-row">
                            <td>→ end</td>
                            <td>{formatVideoTime(lap.endSeconds)}</td>
                            <td className="lap-time-cell">
                              {formatLapTime(
                                tailSegmentMs(
                                  marker.timeSeconds,
                                  lap.endSeconds,
                                  lapSplits[lapSplits.length - 1],
                                ),
                              )}
                            </td>
                            <td colSpan={2} />
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            )}
              </div>
            }
          />
        </div>
        </>
      )}

      <IntakeShortcutsModal
        open={shortcutsModalOpen}
        shortcuts={shortcuts}
        onClose={() => setShortcutsModalOpen(false)}
        onSave={(next) => {
          setShortcuts(next);
          saveIntakeShortcuts(next);
        }}
      />

      {saveError && <p className="data-status data-status--error">{saveError}</p>}
    </section>
  );
}
