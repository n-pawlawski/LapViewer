import { useEffect, useMemo, useState } from "react";
import { fetchSession } from "../api/sessions";
import { AppShell } from "../components/AppShell";
import { useCompare, type SelectedLap } from "../context/CompareContext";
import {
  ComparePane,
  ComparisonTransport,
} from "../components/ComparisonView";
import { useComparisonPlayback } from "../hooks/useComparisonPlayback";
import { useRouter, useSearchParams } from "../lib/router";
import type { Session } from "../types";

function sessionFromDetail(
  detail: Awaited<ReturnType<typeof fetchSession>>,
): Session {
  return {
    id: detail.id,
    title: detail.title,
    sourcePath: detail.sourcePath,
    status: detail.status,
    track: detail.track,
    date: detail.date,
    lapCount: detail.lapCount,
    bestLapTimeMs: detail.bestLapTimeMs,
    usesDemoStream: detail.status === "ready",
  };
}

async function resolvePane(lapId: string): Promise<SelectedLap | null> {
  const match = /^(.+)-lap-\d+$/.exec(lapId);
  const sessionId = match?.[1];
  if (!sessionId) return null;

  const detail = await fetchSession(sessionId);
  const lap = detail.laps.find((l) => l.id === lapId);
  if (!lap) return null;
  return { lap, session: sessionFromDetail(detail) };
}

function CompareView({ panes }: { panes: [SelectedLap, SelectedLap] }) {
  const { navigate } = useRouter();
  const playback = useComparisonPlayback(panes);

  return (
    <AppShell>
      <div className="compare-page">
        <div className="compare-page-header">
          <button type="button" className="btn btn-secondary" onClick={() => navigate("/")}>
            ← Back to Data
          </button>
        </div>
        <div className="compare-grid">
          <ComparePane
            pane={panes[0]}
            videoRef={playback.videoRefs[0]}
            frozen={playback.frozen[0]}
          />
          <ComparePane
            pane={panes[1]}
            videoRef={playback.videoRefs[1]}
            frozen={playback.frozen[1]}
          />
        </div>
        <ComparisonTransport
          comparisonTime={playback.comparisonTime}
          maxDuration={playback.maxDuration}
          playing={playback.playing}
          onTogglePlay={playback.togglePlay}
          onSeek={playback.seek}
        />
      </div>
    </AppShell>
  );
}

export function ComparePage() {
  const { navigate } = useRouter();
  const searchParams = useSearchParams();
  const { selectedLaps, selectedLapIds } = useCompare();
  const [resolved, setResolved] = useState<[SelectedLap, SelectedLap] | null>(null);
  const [loading, setLoading] = useState(false);

  const urlLapIds = useMemo(() => {
    const raw = searchParams.get("laps");
    if (!raw) return [];
    return raw.split(",").filter(Boolean);
  }, [searchParams]);

  const targetIds = urlLapIds.length === 2 ? urlLapIds : selectedLapIds;

  useEffect(() => {
    if (targetIds.length !== 2) {
      setResolved(null);
      return;
    }

    if (selectedLaps.length === 2 && selectedLaps.every((p) => targetIds.includes(p.lap.id))) {
      setResolved([selectedLaps[0], selectedLaps[1]]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    Promise.all(targetIds.map((id) => resolvePane(id)))
      .then((panes) => {
        if (cancelled) return;
        if (panes[0] && panes[1]) {
          setResolved([panes[0], panes[1]]);
        } else {
          setResolved(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [targetIds, selectedLaps]);

  useEffect(() => {
    if (resolved && urlLapIds.length !== 2) {
      navigate(`/compare?laps=${resolved[0].lap.id},${resolved[1].lap.id}`);
    }
  }, [resolved, urlLapIds.length, navigate]);

  if (loading) {
    return (
      <AppShell>
        <div className="stub-page">
          <p>Loading comparison…</p>
        </div>
      </AppShell>
    );
  }

  if (!resolved) {
    return (
      <AppShell>
        <div className="stub-page">
          <h1>Compare</h1>
          <p className="stub-page-lead">Select exactly 2 laps on the Data screen to compare.</p>
          <button type="button" className="btn btn-primary" onClick={() => navigate("/")}>
            ← Back to Data
          </button>
        </div>
      </AppShell>
    );
  }

  return (
    <CompareView
      key={`${resolved[0].lap.id}-${resolved[1].lap.id}`}
      panes={resolved}
    />
  );
}
