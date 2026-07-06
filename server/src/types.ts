export type SessionStatus = "ready" | "missing" | "processing" | "error";

export interface SessionRow {
  id: string;
  title: string;
  sourcePath: string;
  sourceRoot: string;
  relativePath: string;
  fileName: string;
  fileSizeBytes: number | null;
  fileModifiedAt: string | null;
  recordedAt: string | null;
  trackName: string | null;
  notes: string | null;
  camera: string;
  durationSeconds: number | null;
  videoCodec: string | null;
  width: number | null;
  height: number | null;
  frameRate: number | null;
  status: SessionStatus;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface MarkerRow {
  id: string;
  sessionId: string;
  timeSeconds: number;
  kind: string;
  label: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SessionSummary {
  id: string;
  title: string;
  sourcePath: string;
  status: SessionStatus;
  track?: string;
  date?: string;
  lapCount: number;
  bestLapTimeMs?: number;
}

export interface LapDto {
  id: string;
  sessionId: string;
  lapNumber: number;
  startSeconds: number;
  endSeconds: number;
  lapTimeMs: number;
  ignored: boolean;
}

export interface MarkerDto {
  id: string;
  sessionId: string;
  timeSeconds: number;
  label?: string;
  ignored: boolean;
  kind: "lapStart" | "split";
}

export interface SplitDto {
  id: string;
  sessionId: string;
  lapNumber: number;
  splitIndex: number;
  timeSeconds: number;
  label: string;
}

export interface SessionDetail extends SessionSummary {
  notes?: string;
  fileName: string;
  durationSeconds: number | null;
  markers: MarkerDto[];
  splits: SplitDto[];
  laps: LapDto[];
  trackSplits: TrackSplitDto[];
}

export interface TrackSplitDto {
  id: string;
  trackId: string;
  splitIndex: number;
  name: string;
}

export interface CreateSessionBody {
  sourcePath: string;
  title?: string;
  trackName?: string;
  recordedAt?: string;
  notes?: string;
}

export interface UpdateSessionBody {
  title?: string;
  trackName?: string | null;
  recordedAt?: string | null;
  notes?: string | null;
  durationSeconds?: number | null;
}

export interface UpdateMarkerBody {
  timeSeconds?: number;
  label?: string | null;
  ignored?: boolean;
}

export interface TrackDto {
  id: string;
  name: string;
  videoFolder?: string;
  notes?: string;
  splitCount: number;
  splits?: TrackSplitDto[];
}

export interface CreateTrackBody {
  name: string;
  videoFolder?: string;
  notes?: string;
}

export interface UpdateTrackBody {
  name?: string;
  videoFolder?: string;
  notes?: string;
}

export interface CreateMarkerBody {
  timeSeconds: number;
  label?: string;
  kind?: "lapStart" | "split";
  lapNumber?: number;
  splitIndex?: number;
}

export interface ReplaceTrackSplitsBody {
  splits: { name: string }[];
}

/** Normalized ROI box (fractions 0..1 of frame width/height). */
export interface DetectionRoi {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface DetectionProfileDto {
  id: string;
  trackId: string;
  roi?: DetectionRoi;
  scanFps: number;
  lapTimePriorMs?: number;
  createdAt: string;
  updatedAt: string;
}

export interface DetectionBankEntryDto {
  id: string;
  profileId: string;
  sourceSessionId: string;
  timeSeconds: number;
  roiUsed: DetectionRoi;
  roiGray: Buffer;
  confirmedAt: string;
  createdAt: string;
}

export interface UpdateDetectionProfileBody {
  roi?: DetectionRoi;
  scanFps?: number;
  lapTimePriorMs?: number | null;
}

export interface AddDetectionBankEntryBody {
  sourceSessionId: string;
  timeSeconds: number;
  roiUsed?: DetectionRoi;
  roiGray?: Buffer | Uint8Array | string;
  extractFromSession?: boolean;
}

export interface DetectionJobDto {
  jobId: string;
  sessionId: string;
  status: "queued" | "running" | "done" | "error" | "cancelled";
  progress: number;
  proposals?: Array<{ time: number; score: number; confidence: number }>;
  lapTimeMs?: number;
  error?: string;
}

export interface StartDetectionBody {
  anchorTime: number;
  endTime?: number;
}
