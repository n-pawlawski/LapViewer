import type { SessionFilterState, SessionSort, SessionStatusFilter } from "../../hooks/useSessionFilters";

interface DataToolbarProps {
  filters: SessionFilterState;
  trackOptions: string[];
  sessionCount: number;
  filteredCount: number;
  hasActiveFilters: boolean;
  onSearchChange: (search: string) => void;
  onTrackChange: (track: string) => void;
  onStatusChange: (status: SessionStatusFilter) => void;
  onSortChange: (sort: SessionSort) => void;
  onClearFilters: () => void;
}

export function DataToolbar({
  filters,
  trackOptions,
  sessionCount,
  filteredCount,
  hasActiveFilters,
  onSearchChange,
  onTrackChange,
  onStatusChange,
  onSortChange,
  onClearFilters,
}: DataToolbarProps) {
  return (
    <div className="data-toolbar">
      <div className="data-toolbar-row">
        <input
          type="search"
          className="data-toolbar-search"
          placeholder="Search sessions…"
          value={filters.search}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label="Search sessions"
        />
        <select
          className="data-toolbar-select"
          value={filters.track}
          onChange={(e) => onTrackChange(e.target.value)}
          aria-label="Filter by track"
        >
          <option value="all">All tracks</option>
          {trackOptions.map((track) => (
            <option key={track} value={track}>
              {track}
            </option>
          ))}
        </select>
        <select
          className="data-toolbar-select"
          value={filters.status}
          onChange={(e) => onStatusChange(e.target.value as SessionStatusFilter)}
          aria-label="Filter by status"
        >
          <option value="all">All statuses</option>
          <option value="ready">Ready</option>
          <option value="processing">Processing</option>
          <option value="missing">Missing file</option>
          <option value="error">Error</option>
        </select>
        <select
          className="data-toolbar-select"
          value={filters.sort}
          onChange={(e) => onSortChange(e.target.value as SessionSort)}
          aria-label="Sort sessions"
        >
          <option value="newest">Newest</option>
          <option value="title">Title A–Z</option>
          <option value="bestLap">Best lap</option>
        </select>
        {hasActiveFilters && (
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClearFilters}>
            Clear filters
          </button>
        )}
        <span className="data-toolbar-count">
          {filteredCount === sessionCount
            ? `${sessionCount} session${sessionCount === 1 ? "" : "s"}`
            : `${filteredCount} of ${sessionCount}`}
        </span>
      </div>
    </div>
  );
}
