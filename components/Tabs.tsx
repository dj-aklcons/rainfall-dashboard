"use client";
import { Icons } from "./Icons";
import type { View } from "@/lib/types";

const TAB_ITEMS: { id: View; label: string; icon: keyof typeof Icons }[] = [
  { id: "dashboard", label: "Dashboard", icon: "grid" },
  { id: "map",       label: "Map",       icon: "map" },
  { id: "heatmap",   label: "Heatmap",   icon: "heatmap" },
  { id: "alerts",    label: "Alerts",    icon: "bell" },
];

interface Props {
  value: View;
  onChange: (v: View) => void;
}

export default function Tabs({ value, onChange }: Props) {
  return (
    <div className="tabs" role="tablist">
      {TAB_ITEMS.map(({ id, label, icon }) => {
        const I = Icons[icon] as (p: React.SVGProps<SVGSVGElement>) => React.ReactElement;
        return (
          <button key={id} className="tab" aria-selected={value === id} onClick={() => onChange(id)} role="tab">
            <I /> {label}
          </button>
        );
      })}
    </div>
  );
}
