"use client";
import Tabs from "./Tabs";
import type { View, Range, Unit, Station } from "@/lib/types";

interface Props {
  view: View;
  onView: (v: View) => void;
  range: Range;
  onRange: (r: Range) => void;
  unit: Unit;
  onUnit: (u: Unit) => void;
  stations: Station[];
  filter: string[];
  onFilter: (id: string) => void;
  showLocations: boolean;
  hideRangeControls: boolean;
}

export default function ControlsBar({ view, onView, range, onRange, unit, onUnit, stations, filter, onFilter, showLocations, hideRangeControls }: Props) {
  return (
    <div className="controls">
      <div className="control-group">
        <Tabs value={view} onChange={onView} />
      </div>
      {!hideRangeControls && (
        <div className="control-group">
          {showLocations && (
            <>
              <span className="control-label">Locations</span>
              <div className="filter-pills">
                {stations.map((s) => (
                  <button key={s.id} className="filter-pill" aria-pressed={filter.includes(s.id)}
                    onClick={() => onFilter(s.id)}>{s.name}</button>
                ))}
              </div>
            </>
          )}
          <span className="control-label">Range</span>
          <div className="segmented">
            {(["24h", "48h", "7d", "30d"] as Range[]).map((r) => (
              <button key={r} aria-pressed={range === r} onClick={() => onRange(r)}>{r}</button>
            ))}
          </div>
          <span className="control-label">Unit</span>
          <div className="segmented">
            <button aria-pressed={unit === "rate"} onClick={() => onUnit("rate")}>mm/h</button>
            <button aria-pressed={unit === "total"} onClick={() => onUnit("total")}>total mm</button>
          </div>
        </div>
      )}
    </div>
  );
}
