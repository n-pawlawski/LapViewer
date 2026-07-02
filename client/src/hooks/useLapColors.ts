import { useEffect, useState } from "react";
import { loadLapColors } from "../utils/lapColors";

export const LAP_COLORS_CHANGED = "lapviewer-lap-colors-changed";

export function notifyLapColorsChanged(): void {
  window.dispatchEvent(new Event(LAP_COLORS_CHANGED));
}

/** Lap slot colors (persisted); updates when the chart color editor changes. */
export function useLapColors(): [string, string, string, string] {
  const [colors, setColors] = useState(loadLapColors);

  useEffect(() => {
    function refresh() {
      setColors(loadLapColors());
    }
    window.addEventListener(LAP_COLORS_CHANGED, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(LAP_COLORS_CHANGED, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  return colors;
}
