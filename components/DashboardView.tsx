"use client";
import StationCard from "./StationCard";
import type { Station, Range, Unit } from "@/lib/types";

interface Props {
  stations: Station[];
  range: Range;
  unit: Unit;
  accent: string;
  filter: string[];
  onOpen: (id: string) => void;
}

export default function DashboardView({ stations, range, unit, accent, filter, onOpen }: Props) {
  const filtered = stations.filter((s) => filter.includes(s.id));
  return (
    <section>
      <div className="grid-4">
        {filtered.map((s) => (
          <StationCard key={s.id} station={s} range={range} unit={unit} accent={accent} onOpen={onOpen} />
        ))}
        {filtered.length === 0 && (
          <div className="empty" style={{ gridColumn: "1 / -1" }}>No stations selected — toggle locations above.</div>
        )}
      </div>
    </section>
  );
}
