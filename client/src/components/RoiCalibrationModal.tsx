import { useCallback, useEffect, useRef, useState } from "react";
import {
  DEFAULT_DETECTION_ROI,
  saveDetectionProfile,
  sessionFrameUrl,
  type DetectionProfile,
  type DetectionRoi,
} from "../api/detection";
import { formatVideoTime } from "../utils/time";
import { DEFAULT_VIDEO_FPS, frameStepSeconds } from "../utils/video";
import { Modal } from "./Modal";

const MIN_ROI_SIZE = 0.05;

interface RoiCalibrationModalProps {
  open: boolean;
  sessionId: string;
  trackId: string;
  frameTimeSec: number;
  durationSeconds?: number | null;
  initialRoi?: DetectionRoi;
  onClose: () => void;
  onSaved: (profile: DetectionProfile) => void;
}

type DragState =
  | {
      mode: "move";
      pointerId: number;
      startX: number;
      startY: number;
      orig: DetectionRoi;
    }
  | {
      mode: "resize";
      corner: "nw" | "ne" | "sw" | "se";
      pointerId: number;
      startX: number;
      startY: number;
      orig: DetectionRoi;
    };

function clampRoi(roi: DetectionRoi): DetectionRoi {
  let { x0, y0, x1, y1 } = roi;
  x0 = Math.max(0, Math.min(1, x0));
  y0 = Math.max(0, Math.min(1, y0));
  x1 = Math.max(0, Math.min(1, x1));
  y1 = Math.max(0, Math.min(1, y1));
  if (x1 - x0 < MIN_ROI_SIZE) {
    x1 = Math.min(1, x0 + MIN_ROI_SIZE);
    x0 = Math.max(0, x1 - MIN_ROI_SIZE);
  }
  if (y1 - y0 < MIN_ROI_SIZE) {
    y1 = Math.min(1, y0 + MIN_ROI_SIZE);
    y0 = Math.max(0, y1 - MIN_ROI_SIZE);
  }
  return { x0, y0, x1, y1 };
}

export function RoiCalibrationModal({
  open,
  sessionId,
  trackId,
  frameTimeSec,
  durationSeconds,
  initialRoi,
  onClose,
  onSaved,
}: RoiCalibrationModalProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const frameStep = frameStepSeconds(DEFAULT_VIDEO_FPS);
  const [previewTimeSec, setPreviewTimeSec] = useState(frameTimeSec);
  const [roi, setRoi] = useState<DetectionRoi>(initialRoi ?? DEFAULT_DETECTION_ROI);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [frameLoaded, setFrameLoaded] = useState(false);
  const [frameError, setFrameError] = useState(false);
  const [frameErrorMessage, setFrameErrorMessage] = useState<string | null>(null);
  const [frameObjectUrl, setFrameObjectUrl] = useState<string | null>(null);

  const maxPreviewTime =
    durationSeconds != null && durationSeconds > 0 ? durationSeconds : null;
  const canStepBack = previewTimeSec > 0;
  const canStepForward =
    maxPreviewTime == null || previewTimeSec + frameStep <= maxPreviewTime + 1e-6;

  const stepPreviewFrame = useCallback(
    (direction: -1 | 1) => {
      setPreviewTimeSec((prev) => {
        const next = prev + direction * frameStep;
        const clampedMin = Math.max(0, next);
        if (maxPreviewTime == null) return clampedMin;
        return Math.min(maxPreviewTime, clampedMin);
      });
    },
    [frameStep, maxPreviewTime],
  );

  useEffect(() => {
    if (!open) return;
    setPreviewTimeSec(frameTimeSec);
    setRoi(initialRoi ?? DEFAULT_DETECTION_ROI);
    setError(null);
    setFrameLoaded(false);
    setFrameError(false);
    setFrameErrorMessage(null);
  }, [open, initialRoi, frameTimeSec, sessionId]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        stepPreviewFrame(-1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        stepPreviewFrame(1);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, stepPreviewFrame]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    let objectUrl: string | null = null;

    async function loadFrame() {
      setFrameLoaded(false);
      setFrameError(false);
      setFrameErrorMessage(null);
      setFrameObjectUrl(null);

      try {
        const res = await fetch(sessionFrameUrl(sessionId, previewTimeSec));
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? `Frame request failed (${res.status})`);
        }
        const blob = await res.blob();
        objectUrl = URL.createObjectURL(blob);
        if (cancelled) {
          URL.revokeObjectURL(objectUrl);
          return;
        }
        setFrameObjectUrl(objectUrl);
        setFrameLoaded(true);
      } catch (err) {
        if (!cancelled) {
          setFrameError(true);
          setFrameErrorMessage(
            err instanceof Error ? err.message : "Could not load video frame.",
          );
        }
      }
    }

    void loadFrame();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [open, sessionId, previewTimeSec]);

  const pointerToFraction = useCallback((clientX: number, clientY: number) => {
    const el = canvasRef.current;
    if (!el) return { x: 0, y: 0 };
    const rect = el.getBoundingClientRect();
    const x = (clientX - rect.left) / rect.width;
    const y = (clientY - rect.top) / rect.height;
    return {
      x: Math.max(0, Math.min(1, x)),
      y: Math.max(0, Math.min(1, y)),
    };
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, mode: DragState["mode"], corner?: "nw" | "ne" | "sw" | "se") => {
      e.preventDefault();
      e.stopPropagation();
      const target = e.currentTarget as HTMLElement;
      target.setPointerCapture(e.pointerId);
      dragRef.current =
        mode === "move"
          ? {
              mode: "move",
              pointerId: e.pointerId,
              startX: e.clientX,
              startY: e.clientY,
              orig: roi,
            }
          : {
              mode: "resize",
              corner: corner!,
              pointerId: e.pointerId,
              startX: e.clientX,
              startY: e.clientY,
              orig: roi,
            };
    },
    [roi],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== e.pointerId) return;
      const el = canvasRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const dx = (e.clientX - drag.startX) / rect.width;
      const dy = (e.clientY - drag.startY) / rect.height;
      const { orig } = drag;

      if (drag.mode === "move") {
        const w = orig.x1 - orig.x0;
        const h = orig.y1 - orig.y0;
        let x0 = orig.x0 + dx;
        let y0 = orig.y0 + dy;
        x0 = Math.max(0, Math.min(1 - w, x0));
        y0 = Math.max(0, Math.min(1 - h, y0));
        setRoi(clampRoi({ x0, y0, x1: x0 + w, y1: y0 + h }));
        return;
      }

      const { corner } = drag;
      let { x0, y0, x1, y1 } = orig;
      const pt = pointerToFraction(e.clientX, e.clientY);
      if (corner.includes("w")) x0 = pt.x;
      if (corner.includes("e")) x1 = pt.x;
      if (corner.includes("n")) y0 = pt.y;
      if (corner.includes("s")) y1 = pt.y;
      if (x0 > x1) [x0, x1] = [x1, x0];
      if (y0 > y1) [y0, y1] = [y1, y0];
      setRoi(clampRoi({ x0, y0, x1, y1 }));
    },
    [pointerToFraction],
  );

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (dragRef.current?.pointerId === e.pointerId) {
      dragRef.current = null;
    }
  }, []);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const profile = await saveDetectionProfile(trackId, { roi: clampRoi(roi) });
      onSaved(profile);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} title="Calibrate start/finish landmark" onClose={onClose}>
      <p className="roi-calibration-lead">
        Draw a box around the visual cue at the start/finish line (e.g. checkered flag
        barrier). This ROI is saved per track and reused for auto-detect on future sessions.
      </p>

      <div
        ref={canvasRef}
        className="roi-calibration-canvas"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {!frameLoaded && !frameError && (
          <p className="roi-calibration-loading">Loading frame…</p>
        )}
        {frameError && (
          <p className="data-status data-status--error">
            {frameErrorMessage ?? "Could not load video frame."}
          </p>
        )}
        {frameObjectUrl && (
          <img
            className="roi-calibration-frame"
            src={frameObjectUrl}
            alt="Approach frame for ROI calibration"
            draggable={false}
          />
        )}
        {frameLoaded && (
          <div
            className="roi-calibration-box"
            style={{
              left: `${roi.x0 * 100}%`,
              top: `${roi.y0 * 100}%`,
              width: `${(roi.x1 - roi.x0) * 100}%`,
              height: `${(roi.y1 - roi.y0) * 100}%`,
            }}
            onPointerDown={(e) => handlePointerDown(e, "move")}
          >
            {(["nw", "ne", "sw", "se"] as const).map((corner) => (
              <span
                key={corner}
                className={`roi-calibration-handle roi-calibration-handle--${corner}`}
                onPointerDown={(e) => handlePointerDown(e, "resize", corner)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="roi-calibration-frame-controls">
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => stepPreviewFrame(-1)}
          disabled={!canStepBack || saving}
        >
          ← Frame
        </button>
        <span className="roi-calibration-frame-time">
          {formatVideoTime(previewTimeSec)}
          {maxPreviewTime != null && (
            <span className="roi-calibration-frame-duration">
              {" "}
              / {formatVideoTime(maxPreviewTime)}
            </span>
          )}
        </span>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => stepPreviewFrame(1)}
          disabled={!canStepForward || saving}
        >
          Frame →
        </button>
      </div>

      <p className="field-hint roi-calibration-hint">
        Step frames to find the landmark · drag box to move · corner handles to resize ·{" "}
        <kbd>←</kbd>/<kbd>→</kbd> also step
      </p>

      {error && <p className="data-status data-status--error">{error}</p>}

      <div className="modal-actions">
        <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
          Cancel
        </button>
        <div className="modal-actions-right">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setRoi(DEFAULT_DETECTION_ROI)}
            disabled={saving}
          >
            Reset default
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => void handleSave()}
            disabled={saving || !frameLoaded || frameError}
          >
            {saving ? "Saving…" : "Save ROI"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
