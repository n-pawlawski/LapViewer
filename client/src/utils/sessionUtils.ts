import type { SessionDetail, SessionSummary } from "../api/sessions";
import type { Session } from "../types";

export function summaryToSession(summary: SessionSummary): Session {
  return {
    id: summary.id,
    title: summary.title,
    sourcePath: summary.sourcePath,
    status: summary.status,
    track: summary.track,
    date: summary.date,
    lapCount: summary.lapCount,
    bestLapTimeMs: summary.bestLapTimeMs,
    usesDemoStream: summary.status === "ready",
  };
}

export function statusLabel(status: string): string {
  switch (status) {
    case "ready":
      return "Ready";
    case "processing":
      return "Processing proxy";
    case "missing":
      return "Missing file";
    case "error":
      return "Error";
    default:
      return status;
  }
}

export function fileNameFromPath(sourcePath: string): string {
  const parts = sourcePath.split(/[/\\]/);
  return parts[parts.length - 1] ?? sourcePath;
}

export function sessionSummaryFromDetail(detail: SessionDetail): SessionSummary {
  return {
    id: detail.id,
    title: detail.title,
    sourcePath: detail.sourcePath,
    status: detail.status,
    track: detail.track,
    date: detail.date,
    lapCount: detail.lapCount,
    bestLapTimeMs: detail.bestLapTimeMs,
    createdAt: detail.createdAt,
    updatedAt: detail.updatedAt,
  };
}
