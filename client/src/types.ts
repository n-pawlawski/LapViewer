export type SessionStatus = "ready" | "missing" | "processing" | "error";

export interface Session {
  id: string;
  title: string;
  sourcePath: string;
  status: SessionStatus;
  track?: string;
  date?: string;
  lapCount: number;
  bestLapTimeMs?: number;
  usesDemoStream?: boolean;
}

export interface Lap {
  id: string;
  sessionId: string;
  lapNumber: number;
  startSeconds: number;
  endSeconds: number;
  lapTimeMs: number;
  ignored?: boolean;
}

export interface Marker {
  id: string;
  sessionId: string;
  timeSeconds: number;
  label?: string;
  ignored?: boolean;
  kind?: "lapStart" | "split";
}

export interface Split {
  id: string;
  sessionId: string;
  lapNumber: number;
  splitIndex: number;
  timeSeconds: number;
  label: string;
}

export interface LapSelection {
  lapId: string;
  sessionId: string;
}
