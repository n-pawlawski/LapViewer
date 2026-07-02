import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import type { SelectedLap } from "../context/CompareContext";
import type { ComparePaneWindow } from "../utils/compare";

export interface UseComparisonPlaybackResult {
  videoRefs: [RefObject<HTMLVideoElement | null>, RefObject<HTMLVideoElement | null>];
  comparisonTime: number;
  maxDuration: number;
  playing: boolean;
  frozen: [boolean, boolean];
  videosReady: [boolean, boolean];
  togglePlay: () => void;
  seek: (time: number, forceSeek?: boolean) => void;
  onVideoMetadataLoaded: (index: 0 | 1) => void;
}

function windowKey(windows: [ComparePaneWindow | null, ComparePaneWindow | null]): string {
  return [
    windows[0]?.startSeconds ?? "x",
    windows[0]?.durationSeconds ?? "x",
    windows[1]?.startSeconds ?? "x",
    windows[1]?.durationSeconds ?? "x",
  ].join("|");
}

export function useComparisonPlayback(
  panes: [SelectedLap, SelectedLap],
  windows: [ComparePaneWindow | null, ComparePaneWindow | null],
): UseComparisonPlaybackResult {
  const videoRef0 = useRef<HTMLVideoElement>(null);
  const videoRef1 = useRef<HTMLVideoElement>(null);
  const videoRefs: [RefObject<HTMLVideoElement | null>, RefObject<HTMLVideoElement | null>] =
    [videoRef0, videoRef1];

  const durations: [number, number] = [
    windows[0]?.durationSeconds ?? 0,
    windows[1]?.durationSeconds ?? 0,
  ];
  const maxDuration = Math.max(durations[0], durations[1], 0.001);

  const [comparisonTime, setComparisonTime] = useState(0);
  const comparisonTimeRef = useRef(0);
  comparisonTimeRef.current = comparisonTime;

  const [playing, setPlaying] = useState(false);
  const playingRef = useRef(false);
  playingRef.current = playing;

  const [frozen, setFrozen] = useState<[boolean, boolean]>([false, false]);
  const frozenRef = useRef<[boolean, boolean]>([false, false]);

  const [videosReady, setVideosReady] = useState<[boolean, boolean]>([false, false]);

  const playAnchorRef = useRef<{ wallMs: number; comparisonTime: number } | null>(null);
  const rafRef = useRef<number | null>(null);

  const windowsRef = useRef(windows);
  windowsRef.current = windows;

  const setFrozenIfChanged = useCallback((next: [boolean, boolean]) => {
    if (next[0] === frozenRef.current[0] && next[1] === frozenRef.current[1]) return;
    frozenRef.current = next;
    setFrozen(next);
  }, []);

  const pausePane = useCallback((index: 0 | 1) => {
    const video = (index === 0 ? videoRef0 : videoRef1).current;
    video?.pause();
  }, []);

  /** Seek both videos to a comparison time. Only touches currentTime when paused or forced. */
  const applyPausedTime = useCallback((time: number, forceSeek = false) => {
    const nextFrozen: [boolean, boolean] = [false, false];
    const refs = [videoRef0, videoRef1] as const;
    const currentWindows = windowsRef.current;

    currentWindows.forEach((window, i) => {
      const video = refs[i].current;
      if (!video || !window) {
        nextFrozen[i] = true;
        return;
      }

      const lapDur = window.durationSeconds;
      if (time >= lapDur) {
        video.pause();
        video.currentTime = Math.max(
          window.startSeconds,
          window.startSeconds + lapDur - 0.04,
        );
        nextFrozen[i] = true;
      } else {
        const target = window.startSeconds + time;
        if (forceSeek || Math.abs(video.currentTime - target) > 0.001) {
          video.currentTime = target;
        }
        nextFrozen[i] = false;
        video.pause();
      }
    });

    setFrozenIfChanged(nextFrozen);
  }, [setFrozenIfChanged]);

  const startVideosAt = useCallback((time: number) => {
    const refs = [videoRef0, videoRef1] as const;
    const currentWindows = windowsRef.current;
    const nextFrozen: [boolean, boolean] = [false, false];

    currentWindows.forEach((window, i) => {
      const video = refs[i].current;
      if (!video || !window) {
        nextFrozen[i] = true;
        return;
      }

      const lapDur = window.durationSeconds;
      if (time >= lapDur) {
        video.pause();
        video.currentTime = Math.max(
          window.startSeconds,
          window.startSeconds + lapDur - 0.04,
        );
        nextFrozen[i] = true;
        return;
      }

      const target = window.startSeconds + time;
      if (Math.abs(video.currentTime - target) > 0.05) {
        video.currentTime = target;
      }
      nextFrozen[i] = false;
      void video.play().catch(() => undefined);
    });

    setFrozenIfChanged(nextFrozen);
  }, [setFrozenIfChanged]);

  const readFrozenFromVideos = useCallback((time: number): [boolean, boolean] => {
    const refs = [videoRef0, videoRef1] as const;
    const currentWindows = windowsRef.current;
    const nextFrozen: [boolean, boolean] = [false, false];

    currentWindows.forEach((window, i) => {
      const video = refs[i].current;
      if (!video || !window) {
        nextFrozen[i] = true;
        return;
      }

      const endTime = window.startSeconds + window.durationSeconds;
      const reachedEnd =
        time >= window.durationSeconds - 0.02 ||
        video.currentTime >= endTime - 0.04 ||
        video.ended;

      if (reachedEnd) {
        if (!video.paused) video.pause();
        if (video.currentTime < endTime - 0.04) {
          video.currentTime = Math.max(window.startSeconds, endTime - 0.04);
        }
        nextFrozen[i] = true;
      }
    });

    return nextFrozen;
  }, []);

  const stopPlaybackLoop = useCallback(() => {
    playAnchorRef.current = null;
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const seek = useCallback(
    (time: number, forceSeek = false) => {
      const clamped = Math.max(0, Math.min(maxDuration, time));
      comparisonTimeRef.current = clamped;
      setPlaying(false);
      stopPlaybackLoop();
      setComparisonTime(clamped);
      applyPausedTime(clamped, forceSeek);
    },
    [maxDuration, applyPausedTime, stopPlaybackLoop],
  );

  const tick = useCallback(() => {
    const anchor = playAnchorRef.current;
    if (!anchor) return;

    const elapsed = (performance.now() - anchor.wallMs) / 1000;
    let nextTime = anchor.comparisonTime + elapsed;

    if (nextTime >= maxDuration) {
      nextTime = maxDuration;
      setPlaying(false);
      stopPlaybackLoop();
    }

    comparisonTimeRef.current = nextTime;
    setComparisonTime(nextTime);

    const nextFrozen = readFrozenFromVideos(nextTime);
    setFrozenIfChanged(nextFrozen);

    if (nextFrozen[0] && nextFrozen[1]) {
      setPlaying(false);
      stopPlaybackLoop();
      return;
    }

    if (playAnchorRef.current) {
      rafRef.current = requestAnimationFrame(tick);
    }
  }, [maxDuration, readFrozenFromVideos, setFrozenIfChanged, stopPlaybackLoop]);

  const togglePlay = useCallback(() => {
    if (playingRef.current) {
      setPlaying(false);
      stopPlaybackLoop();
      pausePane(0);
      pausePane(1);
      return;
    }

    let startTime = comparisonTimeRef.current;
    if (startTime >= maxDuration) {
      startTime = 0;
    }

    comparisonTimeRef.current = startTime;
    setComparisonTime(startTime);
    playAnchorRef.current = { wallMs: performance.now(), comparisonTime: startTime };
    setPlaying(true);
    startVideosAt(startTime);
    rafRef.current = requestAnimationFrame(tick);
  }, [maxDuration, pausePane, startVideosAt, stopPlaybackLoop, tick]);

  const onVideoMetadataLoaded = useCallback((index: 0 | 1) => {
    setVideosReady((prev) => {
      if (prev[index]) return prev;
      const next: [boolean, boolean] = [...prev] as [boolean, boolean];
      next[index] = true;
      return next;
    });
  }, []);

  const syncWindowsKey = windowKey(windows);

  useEffect(() => {
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  useEffect(() => {
    setVideosReady([false, false]);
    comparisonTimeRef.current = 0;
    setComparisonTime(0);
    setPlaying(false);
    stopPlaybackLoop();
    frozenRef.current = [false, false];
    setFrozen([false, false]);
  }, [panes[0].lap.id, panes[1].lap.id, stopPlaybackLoop]);

  useEffect(() => {
    if (!videosReady[0] || !videosReady[1]) return;
    if (playingRef.current) return;
    applyPausedTime(comparisonTimeRef.current, true);
  }, [videosReady, syncWindowsKey, applyPausedTime]);

  return {
    videoRefs,
    comparisonTime,
    maxDuration,
    playing,
    frozen,
    videosReady,
    togglePlay,
    seek,
    onVideoMetadataLoaded,
  };
}
