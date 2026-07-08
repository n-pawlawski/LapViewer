export type SessionStatus = "ready" | "missing" | "processing" | "error";
export type StorageKind = "local_path" | "s3";
export type UploadStatus = "pending" | "complete" | "failed";

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
  storageKind?: StorageKind | string;
  objectKey?: string | null;
  uploadStatus?: UploadStatus | string | null;
  isPublic?: number;
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
  isPublic?: boolean;
  isOwner?: boolean;
  ownerDisplayName?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface FlatLapRow {
  id: string;
  sessionId: string;
  sessionTitle: string;
  sessionTrack?: string;
  sessionDate?: string;
  lapNumber: number;
  lapTimeMs: number;
  isBestInSession: boolean;
  ignored: boolean;
  ownerDisplayName?: string;
  isPublicSession?: boolean;
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
  storageKind?: StorageKind;
  objectKey?: string | null;
  uploadStatus?: UploadStatus | null;
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
  progress?: number;
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
  isPublic?: boolean;
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

export interface ReferenceProfileCrop {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface ReferenceProfileDto {
  id: string;
  trackId: string;
  referenceSessionId: string;
  referenceLapNumber: number;
  referenceStartMarkerId?: string;
  referenceEndMarkerId?: string;
  referenceStartSeconds: number;
  referenceEndSeconds: number;
  crop: ReferenceProfileCrop;
  direction: "clockwise" | "counterclockwise" | "unknown";
  scanFps: number;
  minLapTimeMs: number;
  maxProgressJumpPerSec: number;
  lapBoundaryConfidenceMin: number;
  splitConfidenceMin: number;
  referencePointCount: number;
  splits: TrackSplitDto[];
  createdAt: string;
  updatedAt: string;
}

export type ProgressJobStatus = "queued" | "running" | "done" | "error" | "cancelled";

export interface ReferenceBuildJobDto {
  jobId: string;
  trackId: string;
  status: ProgressJobStatus;
  progress: number;
  pointCount?: number;
  error?: string;
}

export interface TrackMatchProposalDto {
  id: string;
  kind: "lapStart" | "split";
  timeSeconds: number;
  splitIndex?: number;
  lapNumber?: number;
  confidence: number;
}

export interface ProgressCurveSampleDto {
  timestampMs: number;
  timeSec: number;
  estimatedProgress: number;
  confidence: number;
  visualScore: number;
}

export interface LowConfidenceRangeDto {
  startMs: number;
  endMs: number;
  avgConfidence: number;
}

export interface TrackMatchJobDto {
  jobId: string;
  sessionId: string;
  trackId: string;
  status: ProgressJobStatus;
  progress: number;
  curveSamples?: ProgressCurveSampleDto[];
  proposals?: TrackMatchProposalDto[];
  lowConfidenceRanges?: LowConfidenceRangeDto[];
  error?: string;
}

export interface StartTrackMatchBody {
  trackId: string;
  scanStart?: number;
  scanEnd?: number;
}

export interface AcceptTrackMatchBody {
  proposalIds: string[];
}

export interface SplitBankSummaryDto {
  trackId: string;
  bySplitIndex: Record<number, number>;
  medianOffsetBySplitIndex: Record<number, number>;
  totalEntries: number;
}

export interface SplitDetectionProposalDto {
  id: string;
  splitIndex: number;
  label: string;
  timeSeconds: number;
  score: number;
  confidence: number;
}

export interface SplitDetectionJobDto {
  jobId: string;
  sessionId: string;
  lapNumber: number;
  status: ProgressJobStatus;
  progress: number;
  proposals?: SplitDetectionProposalDto[];
  error?: string;
}

export interface StartSplitDetectionBody {
  lapNumber: number;
}

export interface SaveReferenceProfileBody {
  referenceSessionId: string;
  referenceLapNumber: number;
  crop?: Partial<ReferenceProfileCrop>;
  direction?: ReferenceProfileDto["direction"];
  scanFps?: number;
  minLapTimeMs?: number;
  maxProgressJumpPerSec?: number;
  lapBoundaryConfidenceMin?: number;
  splitConfidenceMin?: number;
}
