import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { fetchSession, type SessionDetail } from "../api/sessions";
import type { Lap, Session, Split } from "../types";
import type { TrackSplit } from "../api/tracks";
import { parseLapId } from "../utils/lapIds";
import { buildSelectedLap } from "../utils/compare";

const STORAGE_KEY = "lapviewer-compare-tray";
const MAX_SELECTION = 2;

export interface SelectedLap {
  lap: Lap;
  session: Session;
  splits: Split[];
  trackSplits: TrackSplit[];
  lapStartMarkerId: string | null;
}

interface CompareContextValue {
  selectedLapIds: string[];
  selectedLaps: SelectedLap[];
  toggleLap: (lap: Lap, session: Session, detail?: SessionDetail) => void;
  setComparePair: (panes: [SelectedLap, SelectedLap]) => void;
  removeLap: (lapId: string) => void;
  clearAll: () => void;
  isSelected: (lapId: string) => boolean;
  selectionHint: string | null;
  canCompare: boolean;
  hydrateFromApi: () => Promise<void>;
}

const CompareContext = createContext<CompareContextValue | null>(null);

function loadStoredIds(): string[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === "string");
  } catch {
    return [];
  }
}

function selectedLapFromDetail(detail: SessionDetail, lap: Lap): SelectedLap {
  return buildSelectedLap(detail, lap);
}

export function CompareProvider({ children }: { children: ReactNode }) {
  const [selectedLapIds, setSelectedLapIds] = useState<string[]>(loadStoredIds);
  const [lapCache, setLapCache] = useState<Record<string, SelectedLap>>({});
  const [selectionHint, setSelectionHint] = useState<string | null>(null);

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(selectedLapIds));
  }, [selectedLapIds]);

  const registerLap = useCallback((entry: SelectedLap) => {
    setLapCache((prev) => ({ ...prev, [entry.lap.id]: entry }));
  }, []);

  useEffect(() => {
    const ids = loadStoredIds();
    if (ids.length === 0) return;

    let cancelled = false;

    void (async () => {
      const sessionIds = new Set<string>();
      for (const lapId of ids) {
        const parsed = parseLapId(lapId);
        if (parsed) sessionIds.add(parsed.sessionId);
      }

      const entries: SelectedLap[] = [];
      for (const sessionId of sessionIds) {
        try {
          const detail = await fetchSession(sessionId);
          for (const lap of detail.laps) {
            if (ids.includes(lap.id)) {
              entries.push(selectedLapFromDetail(detail, lap));
            }
          }
        } catch {
          /* session removed */
        }
      }

      if (!cancelled && entries.length > 0) {
        setLapCache((prev) => {
          const next = { ...prev };
          for (const entry of entries) {
            next[entry.lap.id] = entry;
          }
          return next;
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const hydrateFromApi = useCallback(async () => {
    /* tray hydration runs on mount */
  }, []);

  const selectedLaps = useMemo(
    () =>
      selectedLapIds
        .map((id) => lapCache[id])
        .filter((entry): entry is SelectedLap => entry != null),
    [selectedLapIds, lapCache],
  );

  const toggleLap = useCallback(
    (lap: Lap, session: Session, detail?: SessionDetail) => {
      setSelectionHint(null);
      if (detail) {
        registerLap(selectedLapFromDetail(detail, lap));
      } else {
        const cached = lapCache[lap.id];
        if (cached) {
          registerLap(cached);
        } else {
          registerLap({
            lap,
            session,
            splits: [],
            trackSplits: [],
            lapStartMarkerId: null,
          });
        }
      }

      setSelectedLapIds((prev) => {
        if (prev.includes(lap.id)) {
          return prev.filter((id) => id !== lap.id);
        }
        if (prev.length >= MAX_SELECTION) {
          setSelectionHint(`Maximum ${MAX_SELECTION} laps for comparison`);
          return prev;
        }
        return [...prev, lap.id];
      });
    },
    [registerLap, lapCache],
  );

  const removeLap = useCallback((lapId: string) => {
    setSelectionHint(null);
    setSelectedLapIds((prev) => prev.filter((id) => id !== lapId));
  }, []);

  const setComparePair = useCallback((panes: [SelectedLap, SelectedLap]) => {
    setSelectionHint(null);
    for (const pane of panes) {
      registerLap(pane);
    }
    setSelectedLapIds([panes[0].lap.id, panes[1].lap.id]);
  }, [registerLap]);

  const clearAll = useCallback(() => {
    setSelectionHint(null);
    setSelectedLapIds([]);
  }, []);

  const isSelected = useCallback(
    (lapId: string) => selectedLapIds.includes(lapId),
    [selectedLapIds],
  );

  const canCompare = selectedLapIds.length === MAX_SELECTION;

  const value = useMemo(
    () => ({
      selectedLapIds,
      selectedLaps,
      toggleLap,
      setComparePair,
      removeLap,
      clearAll,
      isSelected,
      selectionHint,
      canCompare,
      hydrateFromApi,
    }),
    [
      selectedLapIds,
      selectedLaps,
      toggleLap,
      setComparePair,
      removeLap,
      clearAll,
      isSelected,
      selectionHint,
      canCompare,
      hydrateFromApi,
    ],
  );

  return (
    <CompareContext.Provider value={value}>{children}</CompareContext.Provider>
  );
}

export function useCompare(): CompareContextValue {
  const ctx = useContext(CompareContext);
  if (!ctx) throw new Error("useCompare must be used within CompareProvider");
  return ctx;
}
