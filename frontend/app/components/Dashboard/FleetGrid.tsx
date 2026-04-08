"use client";

import VehicleCard from "./VehicleCard";
import type { Vehicle } from "../../types/fleet";

interface FleetGridProps {
  vehicles: Vehicle[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
}

export default function FleetGrid({
  vehicles,
  selectedId,
  onSelect,
}: FleetGridProps) {
  return (
    <div className="fleet-grid-panel">
      <h2 className="panel-title">Fleet Overview</h2>
      <div className="fleet-grid">
        {vehicles.map((v) => (
          <VehicleCard
            key={v.id}
            vehicle={v}
            isSelected={selectedId === v.id}
            onClick={() => onSelect(selectedId === v.id ? null : v.id)}
          />
        ))}
      </div>
    </div>
  );
}
