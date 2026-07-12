import { useEffect, useState } from "react";
import { fetchVideoPlaybackUrl, sessionVideoUrl } from "../api/sessions";

export function useSessionVideoSrc(sessionId: string, playable: boolean) {
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [playbackMode, setPlaybackMode] = useState<"presigned" | "proxy" | null>(null);

  useEffect(() => {
    if (!playable) {
      setVideoSrc(null);
      setPlaybackMode(null);
      return;
    }

    let cancelled = false;
    void fetchVideoPlaybackUrl(sessionId)
      .then((result) => {
        if (cancelled) return;
        setVideoSrc(result.url);
        setPlaybackMode(result.mode);
      })
      .catch(() => {
        if (cancelled) return;
        setVideoSrc(sessionVideoUrl(sessionId));
        setPlaybackMode("proxy");
      });

    return () => {
      cancelled = true;
    };
  }, [sessionId, playable]);

  return { videoSrc, playbackMode };
}
