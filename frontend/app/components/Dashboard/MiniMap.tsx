"use client";

import type { Vehicle } from "../../types/fleet";

interface MiniMapProps {
  vehicles: Vehicle[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
}

export default function MiniMap({
  vehicles,
  selectedId,
  onSelect,
}: MiniMapProps) {
  return (
    <div className="minimap-panel">
      <h2 className="panel-title">Fleet Map</h2>
      <div className="minimap-container">
        {vehicles.map((v) => {
          const statusClass = v.status.toLowerCase();
          const isSelected = selectedId === v.id;
          const xPct = (v.location.x / 200) * 100;
          const yPct = (v.location.y / 200) * 100;
          return (
            <div key={v.id}>
              <div
                className={`minimap-dot ${statusClass} ${isSelected ? "selected" : ""}`}
                style={{ left: `${xPct}%`, top: `${yPct}%` }}
                onClick={() => onSelect(isSelected ? null : v.id)}
                title={`${v.name} — ${v.status}${v.rul !== null ? ` (RUL: ${v.rul.toFixed(0)})` : ""}`}
              />
              <span
                className="minimap-label"
                style={{ left: `${xPct}%`, top: `${yPct}%` }}
              >
                {v.name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
