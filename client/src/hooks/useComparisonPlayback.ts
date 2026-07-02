import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import type { SelectedLap } from "../context/CompareContext";
import { lapDurationSeconds } from "../utils/time";

export interface UseComparisonPlaybackResult {
  videoRefs: [RefObject<HTMLVideoElement | null>, RefObject<HTMLVideoElement | null>];
  comparisonTime: number;
  maxDuration: number;
  playing: boolean;
  frozen: [boolean, boolean];
  togglePlay: () => void;
  seek: (time: number) => void;
}

export function useComparisonPlayback(
  panes: [SelectedLap, SelectedLap],
): UseComparisonPlaybackResult {
  const videoRef0 = useRef<HTMLVideoElement>(null);
  const videoRef1 = useRef<HTMLVideoElement>(null);
  const videoRefs: [RefObject<HTMLVideoElement | null>, RefObject<HTMLVideoElement | null>] =
    [videoRef0, videoRef1];

  const durations: [number, number] = [
    lapDurationSeconds(panes[0].lap),
    lapDurationSeconds(panes[1].lap),
  ];
  const maxDuration = Math.max(durations[0], durations[1]);

  const [comparisonTime, setComparisonTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [frozen, setFrozen] = useState<[boolean, boolean]>([false, false]);

  const playAnchorRef = useRef<{ wallMs: number; comparisonTime: number } | null>(null);
  const rafRef = useRef<number | null>(null);

  const applyTimeToVideos = useCallback(
    (time: number, shouldPlay: boolean) => {
      const nextFrozen: [boolean, boolean] = [false, false];
      const refs = [videoRef0, videoRef1] as const;

      panes.forEach((pane, i) => {
        const video = refs[i].current;
        if (!video) return;

        const lapDur = durations[i];
        const lap = pane.lap;

        if (time >= lapDur) {
          video.pause();
          video.currentTime = Math.max(lap.startSeconds, lap.endSeconds - 0.04);
          nextFrozen[i] = true;
        } else {
          const target = lap.startSeconds + time;
          if (Math.abs(video.currentTime - target) > 0.15) {
            video.currentTime = target;
          }
          nextFrozen[i] = false;
          if (shouldPlay) {
            void video.play().catch(() => {
              /* autoplay policy or load race */
            });
          } else {
            video.pause();
          }
        }
      });

      setFrozen(nextFrozen);
    },
    [panes, durations],
  );

  const seek = useCallback(
    (time: number) => {
      const clamped = Math.max(0, Math.min(maxDuration, time));
      setPlaying(false);
      playAnchorRef.current = null;
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      setComparisonTime(clamped);
      applyTimeToVideos(clamped, false);
    },
    [maxDuration, applyTimeToVideos],
  );

  const tick = useCallback(() => {
    const anchor = playAnchorRef.current;
    if (!anchor) return;

    const elapsed = (performance.now() - anchor.wallMs) / 1000;
    let nextTime = anchor.comparisonTime + elapsed;

    if (nextTime >= maxDuration) {
      nextTime = maxDuration;
      setPlaying(false);
      playAnchorRef.current = null;
    }

    setComparisonTime(nextTime);
    applyTimeToVideos(nextTime, playAnchorRef.current != null);

    if (playAnchorRef.current) {
      rafRef.current = requestAnimationFrame(tick);
    }
  }, [maxDuration, applyTimeToVideos]);

  const togglePlay = useCallback(() => {
    if (playing) {
      setPlaying(false);
      playAnchorRef.current = null;
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      applyTimeToVideos(comparisonTime, false);
      return;
    }

    let startTime = comparisonTime;
    if (startTime >= maxDuration) {
      startTime = 0;
    }

    setComparisonTime(startTime);
    playAnchorRef.current = { wallMs: performance.now(), comparisonTime: startTime };
    setPlaying(true);
    applyTimeToVideos(startTime, true);
    rafRef.current = requestAnimationFrame(tick);
  }, [playing, comparisonTime, maxDuration, applyTimeToVideos, tick]);

  useEffect(() => {
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  useEffect(() => {
    applyTimeToVideos(0, false);
    setComparisonTime(0);
    setPlaying(false);
    playAnchorRef.current = null;
  }, [panes[0].lap.id, panes[1].lap.id, applyTimeToVideos]);

  return {
    videoRefs,
    comparisonTime,
    maxDuration,
    playing,
    frozen,
    togglePlay,
    seek,
  };
}
