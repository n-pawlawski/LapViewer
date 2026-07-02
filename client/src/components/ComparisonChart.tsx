import { useEffect, useMemo, useRef, useState } from "react";
import {
  buildComparisonChartData,
  formatChartDelta,
  formatSegmentDuration,
  type ComparisonChartData,
} from "../utils/compareChart";
import { loadLapColors, saveLapColors } from "../utils/lapColors";
import { notifyLapColorsChanged } from "../hooks/useLapColors";
import type { SelectedLap } from "../context/CompareContext";
import type { ComparePaneWindow } from "../utils/compare";
import { formatComparisonTime, formatLapTime } from "../utils/time";

const EPSILON = 0.001;

const PLOT_HEIGHT = 90;
const LABEL_HEIGHT = 15;
const AXIS_HEIGHT = 18;
const MARGIN = { top: 8, right: 12, bottom: 2, left: 40 };

const STRIP_HEIGHT = 24;
const STRIP_GAP = 6;

const COLOR_GRID = "#2a3544";
const COLOR_TEXT = "#9aa7b5";
const COLOR_TIE = "#6b7a8c";
const COLOR_PLAYHEAD = "#e7ecf1";

type ChartMode = "bars" | "line" | "timeline";
const MODE_STORAGE_KEY = "lapviewer-compare-chart-mode";

function loadMode(): ChartMode {
  const raw = typeof localStorage !== "undefined" ? localStorage.getItem(MODE_STORAGE_KEY) : null;
  return raw === "line" || raw === "timeline" ? raw : "bars";
}

interface ComparisonChartProps {
  panes: [SelectedLap, SelectedLap];
  windows: [ComparePaneWindow | null, ComparePaneWindow | null];
  comparisonTime: number;
  maxDuration: number;
  onSeek: (time: number) => void;
}

function svgHeight(): number {
  return MARGIN.top + PLOT_HEIGHT + LABEL_HEIGHT + AXIS_HEIGHT + MARGIN.bottom;
}

const MODE_HINTS: Record<ChartMode, string> = {
  bars: "Per-sector delta — bar height = time won/lost, colored by the faster lap",
  line: "Cumulative delta — each stretch is colored by the faster lap in that sector",
  timeline: "Proportional sector timeline — brighter segment = faster lap",
};

export function ComparisonChart({
  panes,
  windows,
  comparisonTime,
  maxDuration,
  onSeek,
}: ComparisonChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [chartWidth, setChartWidth] = useState(720);
  const [mode, setMode] = useState<ChartMode>(loadMode);
  const [lapColors, setLapColors] = useState<[string, string, string, string]>(loadLapColors);
  const [colorsOpen, setColorsOpen] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 720;
      setChartWidth(Math.max(360, Math.round(width)));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  function selectMode(next: ChartMode) {
    setMode(next);
    try {
      localStorage.setItem(MODE_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }

  function updateLapColor(index: number, value: string) {
    setLapColors((prev) => {
      const next = [...prev] as [string, string, string, string];
      next[index] = value;
      saveLapColors(next);
      notifyLapColorsChanged();
      return next;
    });
  }

  const data = useMemo(
    () => buildComparisonChartData(panes, windows),
    [panes, windows],
  );

  const lap1Color = lapColors[0];
  const lap2Color = lapColors[1];

  const height = svgHeight();
  const plotWidth = chartWidth - MARGIN.left - MARGIN.right;
  const plotEnd = MARGIN.left + plotWidth;
  const plotTop = MARGIN.top;
  const plotBottom = plotTop + PLOT_HEIGHT;
  const baseline = plotTop + PLOT_HEIGHT / 2;
  const barHalf = PLOT_HEIGHT / 2 - 13;
  const labelY = plotBottom + 11;
  const axisTop = plotBottom + LABEL_HEIGHT;

  const duration = Math.max(maxDuration, data?.maxDuration ?? 0, 0.001);
  const nSectors = data?.sectors.length ?? 0;
  const colWidth = nSectors > 0 ? plotWidth / nSectors : plotWidth;

  const xTime = (t: number) => MARGIN.left + (t / duration) * plotWidth;

  const refSegments = data?.panes[0]?.segments ?? [];
  const currentSectorIndex = refSegments.findIndex(
    (seg) =>
      comparisonTime >= seg.startComparisonTime - EPSILON &&
      comparisonTime < seg.endComparisonTime - EPSILON,
  );

  const winnerColor = (winner: 0 | 1 | null) =>
    winner == null ? COLOR_TIE : winner === 0 ? lap1Color : lap2Color;

  const cumulativePoints = useMemo(() => {
    if (!data) return [] as { time: number; cumulative: number }[];
    const points = [{ time: 0, cumulative: 0 }];
    let running = 0;
    data.sectors.forEach((sector, i) => {
      running += sector.deltaSeconds;
      const endTime =
        i < data.sectors.length - 1
          ? (data.splitGuides[i]?.comparisonTime ??
             data.panes[0]?.segments[i]?.endComparisonTime ??
             duration)
          : duration;
      points.push({ time: endTime, cumulative: running });
    });
    return points;
  }, [data, duration]);

  if (!data || data.sectors.length === 0) {
    return (
      <div className="comparison-chart comparison-chart--empty" ref={containerRef}>
        <p>Chart unavailable — sync point missing on one or both laps.</p>
      </div>
    );
  }

  const chart = data;

  const maxAbsBar = Math.max(...chart.sectors.map((s) => Math.abs(s.deltaSeconds)), 0.03);
  const maxAbsCumulative = Math.max(
    ...cumulativePoints.map((p) => Math.abs(p.cumulative)),
    0.03,
  );
  const maxAbsDelta = mode === "line" ? maxAbsCumulative : maxAbsBar;
  const yDelta = (value: number) => baseline + (value / maxAbsDelta) * barHalf;

  // Playhead x depends on mode axis (equal sectors for bars, real time otherwise).
  let playheadX: number | null = null;
  if (mode === "bars") {
    if (currentSectorIndex >= 0) {
      const seg = refSegments[currentSectorIndex];
      const frac =
        seg.durationSeconds > 0
          ? Math.min(1, Math.max(0, (comparisonTime - seg.startComparisonTime) / seg.durationSeconds))
          : 0;
      playheadX = MARGIN.left + (currentSectorIndex + frac) * colWidth;
    }
  } else {
    playheadX = xTime(comparisonTime);
  }

  const stripsTop = plotTop + (PLOT_HEIGHT - (STRIP_HEIGHT * 2 + STRIP_GAP)) / 2;
  const strip0Top = stripsTop;
  const strip1Top = stripsTop + STRIP_HEIGHT + STRIP_GAP;

  function handleClick(clientX: number) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * chartWidth;
    if (x < MARGIN.left || x > plotEnd) return;

    if (mode === "bars") {
      const sectorIndex = Math.min(
        nSectors - 1,
        Math.max(0, Math.floor((x - MARGIN.left) / colWidth)),
      );
      const seg = refSegments[sectorIndex];
      if (!seg) return;
      const frac = Math.min(1, Math.max(0, (x - MARGIN.left - sectorIndex * colWidth) / colWidth));
      onSeek(Math.max(0, Math.min(duration, seg.startComparisonTime + frac * seg.durationSeconds)));
      return;
    }
    const time = ((x - MARGIN.left) / plotWidth) * duration;
    onSeek(Math.max(0, Math.min(duration, time)));
  }

  function renderBars() {
    return (
      <g>
        {currentSectorIndex >= 0 && (
          <rect
            x={MARGIN.left + currentSectorIndex * colWidth}
            y={plotTop}
            width={colWidth}
            height={PLOT_HEIGHT + LABEL_HEIGHT}
            fill="#ffffff"
            fillOpacity={0.05}
          />
        )}
        {chart.sectors.map((sector) => {
          const colX = MARGIN.left + sector.index * colWidth;
          const cx = colX + colWidth / 2;
          const barW = Math.min(colWidth * 0.5, 42);
          const tipOffset = (sector.deltaSeconds / maxAbsDelta) * barHalf;
          const faster = sector.deltaSeconds < 0; // lap 2 faster → bar up
          const tipY = baseline + tipOffset;
          const rectY = faster ? tipY : baseline;
          const rectH = Math.max(1, Math.abs(tipOffset));
          const color = winnerColor(sector.winner);
          return (
            <g key={sector.index}>
              {sector.index > 0 && (
                <line
                  x1={colX}
                  y1={plotTop}
                  x2={colX}
                  y2={plotBottom + LABEL_HEIGHT}
                  stroke={COLOR_GRID}
                  strokeOpacity={0.4}
                />
              )}
              <rect
                x={cx - barW / 2}
                y={rectY}
                width={barW}
                height={rectH}
                rx={2}
                fill={color}
                fillOpacity={0.9}
              />
              <text
                x={cx}
                y={faster ? tipY - 4 : tipY + 11}
                textAnchor="middle"
                className="comparison-chart-delta-label"
                fill={color}
              >
                {formatChartDelta(sector.deltaSeconds)}
              </text>
              <text
                x={cx}
                y={labelY}
                textAnchor="middle"
                className="comparison-chart-sector-label"
              >
                {sector.label}
              </text>
            </g>
          );
        })}
      </g>
    );
  }

  function renderLine() {
    return (
      <g>
        {chart.splitGuides.map((guide) => {
          const x = xTime(guide.comparisonTime);
          return (
            <g key={guide.splitIndex ?? guide.comparisonTime}>
              <line
                x1={x}
                y1={plotTop}
                x2={x}
                y2={plotBottom}
                stroke={COLOR_GRID}
                strokeDasharray="3 3"
              />
              <text x={x} y={labelY} textAnchor="middle" className="comparison-chart-sector-label">
                {guide.label}
              </text>
            </g>
          );
        })}
        <text x={plotEnd} y={labelY} textAnchor="end" className="comparison-chart-sector-label">
          Finish
        </text>

        {chart.sectors.map((sector, i) => {
          const p0 = cumulativePoints[i];
          const p1 = cumulativePoints[i + 1];
          return (
            <line
              key={`seg-${i}`}
              x1={xTime(p0.time)}
              y1={yDelta(p0.cumulative)}
              x2={xTime(p1.time)}
              y2={yDelta(p1.cumulative)}
              stroke={winnerColor(sector.winner)}
              strokeWidth={2.5}
              strokeLinecap="round"
            />
          );
        })}
        {cumulativePoints.map((point, i) => (
          <circle
            key={`pt-${i}`}
            cx={xTime(point.time)}
            cy={yDelta(point.cumulative)}
            r={2.5}
            fill={
              Math.abs(point.cumulative) < 0.005
                ? COLOR_TIE
                : point.cumulative < 0
                  ? lap2Color
                  : lap1Color
            }
            stroke="#141b24"
            strokeWidth={1}
          />
        ))}
        {cumulativePoints.map((point, i) => {
          if (i === 0) return null;
          const ahead = point.cumulative < 0;
          const color =
            Math.abs(point.cumulative) < 0.005 ? COLOR_TIE : ahead ? lap2Color : lap1Color;
          return (
            <text
              key={`lbl-${i}`}
              x={xTime(point.time)}
              y={yDelta(point.cumulative) + (point.cumulative <= 0 ? -5 : 11)}
              textAnchor="middle"
              className="comparison-chart-delta-label"
              fill={color}
            >
              {formatChartDelta(point.cumulative)}
            </text>
          );
        })}
      </g>
    );
  }

  function renderTimelineStrip(
    series: ComparisonChartData["panes"][number],
    paneIndex: 0 | 1,
    y: number,
    color: string,
  ) {
    if (!series) return null;
    return (
      <g>
        {series.segments.map((segment, i) => {
          const x = xTime(segment.startComparisonTime);
          const w = Math.max(2, xTime(segment.endComparisonTime) - x);
          const isFaster = chart.sectors[i]?.winner === paneIndex;
          const showLabel = w >= 40;
          return (
            <g key={`${paneIndex}-${segment.startComparisonTime}`}>
              <rect
                x={x}
                y={y}
                width={w}
                height={STRIP_HEIGHT}
                rx={4}
                fill={color}
                fillOpacity={isFaster ? 0.7 : 0.28}
                stroke={color}
                strokeOpacity={isFaster ? 1 : 0.5}
                strokeWidth={isFaster ? 1.5 : 1}
              />
              {showLabel && (
                <text
                  x={x + w / 2}
                  y={y + STRIP_HEIGHT / 2 + 4}
                  textAnchor="middle"
                  className="comparison-chart-segment-label"
                  fontWeight={isFaster ? 600 : 400}
                >
                  {formatSegmentDuration(segment.durationSeconds)}
                </text>
              )}
            </g>
          );
        })}
      </g>
    );
  }

  function renderTimeline() {
    return (
      <g>
        {chart.splitGuides.map((guide) => {
          const x = xTime(guide.comparisonTime);
          return (
            <g key={guide.splitIndex ?? guide.comparisonTime}>
              <line
                x1={x}
                y1={strip0Top - 3}
                x2={x}
                y2={strip1Top + STRIP_HEIGHT + 3}
                stroke={COLOR_GRID}
                strokeDasharray="3 3"
              />
              <text x={x} y={labelY} textAnchor="middle" className="comparison-chart-sector-label">
                {guide.label}
              </text>
            </g>
          );
        })}
        <text
          x={MARGIN.left - 6}
          y={strip0Top + STRIP_HEIGHT / 2 + 4}
          textAnchor="end"
          fill={lap1Color}
          className="comparison-chart-strip-label"
        >
          L1
        </text>
        <text
          x={MARGIN.left - 6}
          y={strip1Top + STRIP_HEIGHT / 2 + 4}
          textAnchor="end"
          fill={lap2Color}
          className="comparison-chart-strip-label"
        >
          L2
        </text>
        {renderTimelineStrip(chart.panes[0], 0, strip0Top, lap1Color)}
        {renderTimelineStrip(chart.panes[1], 1, strip1Top, lap2Color)}
      </g>
    );
  }

  const showTimeAxis = mode !== "bars";

  return (
    <div className="comparison-chart" ref={containerRef}>
      <div className="comparison-chart-header">
        <h3 className="comparison-chart-title">Lap comparison</h3>
        <div className="comparison-chart-header-right">
          <div className="comparison-chart-legend">
            <span className="comparison-chart-legend-item">
              <span className="comparison-chart-swatch" style={{ background: lap1Color }} />
              <span className="comparison-chart-legend-lap">L1</span>
              {chart.panes[0]?.label}
              <span className="comparison-chart-lap-time">
                {chart.panes[0] ? formatLapTime(chart.panes[0].lapTimeMs) : "—"}
              </span>
            </span>
            <span className="comparison-chart-legend-item">
              <span className="comparison-chart-swatch" style={{ background: lap2Color }} />
              <span className="comparison-chart-legend-lap">L2</span>
              {chart.panes[1]?.label}
              <span className="comparison-chart-lap-time">
                {chart.panes[1] ? formatLapTime(chart.panes[1].lapTimeMs) : "—"}
              </span>
            </span>
            <span className="comparison-chart-legend-delta">
              Overall:{" "}
              <strong style={{ color: winnerColor(chart.cumulativeFinishDelta < 0 ? 1 : 0) }}>
                {formatChartDelta(chart.cumulativeFinishDelta)}s
              </strong>
            </span>
          </div>
          <div className="comparison-chart-mode-toggle" role="group" aria-label="Chart mode">
            {(["bars", "line", "timeline"] as const).map((m) => (
              <button
                key={m}
                type="button"
                className={`comparison-chart-mode-btn ${mode === m ? "is-active" : ""}`}
                onClick={() => selectMode(m)}
              >
                {m === "bars" ? "Bars" : m === "line" ? "Line" : "Timeline"}
              </button>
            ))}
          </div>
          <button
            type="button"
            className={`comparison-chart-colors-btn ${colorsOpen ? "is-active" : ""}`}
            onClick={() => setColorsOpen((v) => !v)}
            title="Edit lap colors"
          >
            Colors
          </button>
        </div>
      </div>

      {colorsOpen && (
        <div className="comparison-chart-colors-panel">
          {[0, 1, 2, 3].map((i) => (
            <label key={i} className="comparison-chart-color-field">
              <span>Lap {i + 1}</span>
              <input
                type="color"
                value={lapColors[i]}
                onChange={(e) => updateLapColor(i, e.target.value)}
              />
            </label>
          ))}
          <span className="comparison-chart-colors-hint">Used across all comparison graphs</span>
        </div>
      )}

      <div className="comparison-chart-subtitles">
        <span>{MODE_HINTS[mode]}</span>
      </div>

      <svg
        ref={svgRef}
        className="comparison-chart-svg"
        viewBox={`0 0 ${chartWidth} ${height}`}
        preserveAspectRatio="xMinYMin meet"
        role="img"
        aria-label="Lap comparison chart"
        onClick={(e) => handleClick(e.clientX)}
      >
        {mode !== "timeline" && (
          <>
            <line
              x1={MARGIN.left}
              y1={baseline}
              x2={plotEnd}
              y2={baseline}
              stroke={COLOR_GRID}
            />
            <text
              x={MARGIN.left - 6}
              y={baseline + 4}
              textAnchor="end"
              fill={COLOR_TEXT}
              className="comparison-chart-axis-label"
            >
              0
            </text>
            <text
              x={MARGIN.left - 6}
              y={plotTop + 9}
              textAnchor="end"
              fill={lap2Color}
              className="comparison-chart-axis-label"
            >
              {maxAbsDelta.toFixed(2)}
            </text>
            <text
              x={MARGIN.left - 6}
              y={plotBottom - 1}
              textAnchor="end"
              fill={lap1Color}
              className="comparison-chart-axis-label"
            >
              {maxAbsDelta.toFixed(2)}
            </text>
          </>
        )}

        {mode === "bars" && renderBars()}
        {mode === "line" && renderLine()}
        {mode === "timeline" && renderTimeline()}

        {playheadX != null && (
          <line
            x1={playheadX}
            y1={plotTop - 2}
            x2={playheadX}
            y2={plotBottom + 2}
            stroke={COLOR_PLAYHEAD}
            strokeWidth={2}
            pointerEvents="none"
          />
        )}

        {showTimeAxis && (
          <>
            <line x1={MARGIN.left} y1={axisTop} x2={plotEnd} y2={axisTop} stroke={COLOR_GRID} />
            {[0, 0.5, 1].map((tick) => {
              const t = tick * duration;
              const x = xTime(t);
              return (
                <g key={tick}>
                  <line x1={x} y1={axisTop} x2={x} y2={axisTop + 4} stroke={COLOR_GRID} />
                  <text
                    x={x}
                    y={axisTop + 14}
                    textAnchor="middle"
                    className="comparison-chart-axis-label"
                  >
                    {formatComparisonTime(t)}
                  </text>
                </g>
              );
            })}
          </>
        )}
      </svg>
    </div>
  );
}
