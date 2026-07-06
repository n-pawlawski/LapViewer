export interface DetectionRoi {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface DetectionProfile {
  id: string;
  trackId: string;
  roi?: DetectionRoi;
  scanFps: number;
  lapTimePriorMs?: number;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateDetectionProfileRequest {
  roi?: DetectionRoi;
  scanFps?: number;
  lapTimePriorMs?: number | null;
}

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message =
      typeof body.error === "string" ? body.error : `Request failed (${res.status})`;
    throw new Error(message);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}

export function sessionFrameUrl(
  sessionId: string,
  timeSec: number,
  roi?: DetectionRoi,
): string {
  const params = new URLSearchParams({ t: String(timeSec) });
  if (roi) {
    params.set("roi", `${roi.x0},${roi.y0},${roi.x1},${roi.y1}`);
  }
  return `/api/sessions/${sessionId}/frame?${params.toString()}`;
}

export async function fetchDetectionProfile(
  trackId: string,
): Promise<DetectionProfile | null> {
  const res = await fetch(`/api/tracks/${trackId}/detection-profile`);
  if (res.status === 404) return null;
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message =
      typeof body.error === "string" ? body.error : `Request failed (${res.status})`;
    throw new Error(message);
  }
  return res.json() as Promise<DetectionProfile>;
}

export async function saveDetectionProfile(
  trackId: string,
  body: UpdateDetectionProfileRequest,
): Promise<DetectionProfile> {
  return apiFetch<DetectionProfile>(`/api/tracks/${trackId}/detection-profile`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** Default landmark box from vision spike (fractions of frame). */
export const DEFAULT_DETECTION_ROI: DetectionRoi = {
  x0: 0.54,
  y0: 0.27,
  x1: 1,
  y1: 0.63,
};

export interface DetectionProposalDto {
  time: number;
  score: number;
  confidence: number;
}

export type DetectionJobStatus = "queued" | "running" | "done" | "error" | "cancelled";

export interface DetectionJobDto {
  jobId: string;
  sessionId: string;
  status: DetectionJobStatus;
  progress: number;
  proposals?: DetectionProposalDto[];
  lapTimeMs?: number;
  error?: string;
}

export async function startDetection(
  sessionId: string,
  anchorTime: number,
  endTime?: number,
): Promise<{ jobId: string }> {
  return apiFetch<{ jobId: string }>(`/api/sessions/${sessionId}/detect-laps`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ anchorTime, endTime }),
  });
}

export async function fetchDetectionJob(jobId: string): Promise<DetectionJobDto> {
  return apiFetch<DetectionJobDto>(`/api/detect-laps/${jobId}`);
}

export async function cancelDetectionJob(jobId: string): Promise<void> {
  await apiFetch<{ jobId: string; status: string }>(`/api/detect-laps/${jobId}`, {
    method: "DELETE",
  });
}

export async function addBankEntryFromSession(
  trackId: string,
  sourceSessionId: string,
  timeSeconds: number,
): Promise<void> {
  await apiFetch(`/api/tracks/${trackId}/detection-profile/bank`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sourceSessionId,
      timeSeconds,
      extractFromSession: true,
    }),
  });
}
