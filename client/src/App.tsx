import { useRef, useState } from "react";

const DEMO_VIDEO_URL = "/api/video/demo";
const DEMO_VIDEO_PATH =
  "E:\\Racing Videos\\2-19 racing league\\GX010012.MP4";

/** GoPro default until ffprobe supplies real fps from the server. */
const VIDEO_FPS = 30;

function seekFrames(video: HTMLVideoElement, frameCount: number): void {
  if (!Number.isFinite(video.duration)) return;

  video.pause();
  const frameDuration = 1 / VIDEO_FPS;
  const nextTime = video.currentTime + frameCount * frameDuration;
  video.currentTime = Math.min(video.duration, Math.max(0, nextTime));
}

export default function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState("Press Start to play the demo clip.");

  async function handleStart() {
    const video = videoRef.current;
    if (!video) return;

    setStatus("Loading…");
    video.load();

    try {
      await video.play();
      setStatus("Playing");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Playback failed");
    }
  }

  function handleFrameStep(frameCount: number) {
    const video = videoRef.current;
    if (!video) return;

    seekFrames(video, frameCount);
    const direction = frameCount < 0 ? "Back" : "Forward";
    setStatus(`${direction} ${Math.abs(frameCount)} frame(s)`);
  }

  return (
    <main className="page">
      <header>
        <h1>LapViewer</h1>
        <p className="subtitle">Video playback spike</p>
      </header>

      <section className="player-card">
        <video
          ref={videoRef}
          className="player"
          src={DEMO_VIDEO_URL}
          controls
          preload="metadata"
        />
        <div className="controls">
          <button type="button" className="start-button" onClick={handleStart}>
            Start
          </button>
          <p className="status">{status}</p>
        </div>
        <div className="frame-controls">
          <button
            type="button"
            className="frame-button"
            onClick={() => handleFrameStep(-25)}
            title="Back 25 frames"
          >
            −25
          </button>
          <button
            type="button"
            className="frame-button"
            onClick={() => handleFrameStep(-1)}
            title="Back 1 frame"
          >
            −1
          </button>
          <button
            type="button"
            className="frame-button"
            onClick={() => handleFrameStep(1)}
            title="Forward 1 frame"
          >
            +1
          </button>
          <button
            type="button"
            className="frame-button"
            onClick={() => handleFrameStep(25)}
            title="Forward 25 frames"
          >
            +25
          </button>
        </div>
        <p className="fps-note">Frame step assumes {VIDEO_FPS} fps (GoPro default).</p>
        <p className="path">
          <strong>Hardcoded path:</strong> {DEMO_VIDEO_PATH}
        </p>
      </section>
    </main>
  );
}
