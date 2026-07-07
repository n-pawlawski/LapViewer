import type { SelectedLap } from "../context/CompareContext";
import {
  buildSplitDeltaRows,
  formatDeltaCell,
  formatSectorCell,
} from "../utils/compareSplitDeltas";

interface CompareSplitDeltaTableProps {
  paneA: SelectedLap;
  paneB: SelectedLap;
  /** When nested inside the comparison chart tab, omit the section title. */
  embedded?: boolean;
}

export function CompareSplitDeltaTable({ paneA, paneB, embedded }: CompareSplitDeltaTableProps) {
  const rows = buildSplitDeltaRows(paneA, paneB);
  if (rows.length === 0) {
    return (
      <p className="compare-delta-hint">
        Configure track splits and mark them on both laps to see sector deltas.
      </p>
    );
  }

  const labelA = `Lap ${paneA.lap.lapNumber} (${paneA.session.title || paneA.session.sourcePath.split(/[/\\]/).pop()})`;
  const labelB = `Lap ${paneB.lap.lapNumber} (${paneB.session.title || paneB.session.sourcePath.split(/[/\\]/).pop()})`;

  return (
    <div className={`compare-split-delta-table-wrap${embedded ? " compare-split-delta-table-wrap--embedded" : ""}`}>
      {!embedded && <h2 className="compare-split-delta-title">Sector deltas (from lap start)</h2>}
      <table className="compare-split-delta-table">
        <thead>
          <tr>
            <th>Sector</th>
            <th>{labelA}</th>
            <th>{labelB}</th>
            <th>Δ</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className={row.isTotal ? "compare-split-delta-total" : undefined}>
              <td>{row.label}</td>
              <td>{formatSectorCell(row.lapAMs)}</td>
              <td>{formatSectorCell(row.lapBMs)}</td>
              <td>{formatDeltaCell(row.deltaMs)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
