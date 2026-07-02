/** Default frame step for GoPro-style footage until probe supplies fps. */
export const DEFAULT_VIDEO_FPS = 30;

export function frameStepSeconds(fps = DEFAULT_VIDEO_FPS): number {
  return 1 / fps;
}
