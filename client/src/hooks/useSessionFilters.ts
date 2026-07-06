import { useMemo, useState } from "react";
import type { SessionSummary } from "../api/sessions";
import { fileNameFromPath } from "../utils/sessionUtils";

export type SessionSort = "newest" | "title" | "bestLap";
export type SessionStatusFilter = "all" | "ready" | "processing" | "missing" | "error";

export interface SessionFilterState {
  search: string;
  track: string;
  status: SessionStatusFilter;
  sort: SessionSort;
}

const DEFAULT_FILTERS: SessionFilterState = {
  search: "",
  track: "all",
  status: "all",
  sort: "newest",
};

function matchesSearch(session: SessionSummary, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const fileName = fileNameFromPath(session.sourcePath).toLowerCase();
  return (
    session.title.toLowerCase().includes(q) ||
    fileName.includes(q) ||
    (session.track?.toLowerCase().includes(q) ?? false)
  );
}

export function filterAndSortSessions(
  sessions: SessionSummary[],
  filters: SessionFilterState,
): SessionSummary[] {
  let result = sessions.filter((session) => {
    if (filters.status !== "all" && session.status !== filters.status) return false;
    if (filters.track !== "all" && (session.track ?? "") !== filters.track) return false;
    return matchesSearch(session, filters.search);
  });

  result = [...result].sort((a, b) => {
    switch (filters.sort) {
      case "title":
        return a.title.localeCompare(b.title);
      case "bestLap": {
        const aBest = a.bestLapTimeMs ?? Number.MAX_SAFE_INTEGER;
        const bBest = b.bestLapTimeMs ?? Number.MAX_SAFE_INTEGER;
        return aBest - bBest;
      }
      case "newest":
      default: {
        const aTime = a.updatedAt ?? a.createdAt ?? "";
        const bTime = b.updatedAt ?? b.createdAt ?? "";
        return bTime.localeCompare(aTime);
      }
    }
  });

  return result;
}

export function useSessionFilters(sessions: SessionSummary[]) {
  const [filters, setFilters] = useState<SessionFilterState>(DEFAULT_FILTERS);

  const trackOptions = useMemo(() => {
    const tracks = new Set<string>();
    for (const session of sessions) {
      if (session.track) tracks.add(session.track);
    }
    return [...tracks].sort((a, b) => a.localeCompare(b));
  }, [sessions]);

  const filteredSessions = useMemo(
    () => filterAndSortSessions(sessions, filters),
    [sessions, filters],
  );

  const hasActiveFilters =
    filters.search.trim() !== "" ||
    filters.track !== "all" ||
    filters.status !== "all";

  function clearFilters() {
    setFilters(DEFAULT_FILTERS);
  }

  return {
    filters,
    setFilters,
    trackOptions,
    filteredSessions,
    hasActiveFilters,
    clearFilters,
  };
}
