"use client";

import { Truck, Gauge } from "lucide-react";
import type { Vehicle } from "../../types/fleet";
import { hubDisplayName } from "../../utils/simulation";

interface VehicleCardProps {
  vehicle: Vehicle;
  isSelected: boolean;
  onClick: () => void;
}

export default function VehicleCard({
  vehicle,
  isSelected,
  onClick,
}: VehicleCardProps) {
  const { name, status, rul, mission } = vehicle;

  const statusClass = status.toLowerCase();
  const displayRUL = rul !== null ? rul.toFixed(0) : "—";
  const inMaint = vehicle.maintenanceWaitRemaining > 0;

  /* Mission subtitle */
  let missionSubtitle = "";
  if (inMaint) {
    missionSubtitle = "⚙ Maintenance";
  } else if (mission?.status === "Aborted") {
    missionSubtitle = "⚠ Detour → Depot";
  } else if (mission?.status === "Returning") {
    missionSubtitle = `↩ Returning`;
  } else if (mission?.status === "Active") {
    missionSubtitle = `→ ${hubDisplayName(mission.destinationNodeId)}`;
  }

  /* Sparkline: miniature inline chart of last 15 RUL data points */
  const sparkData = vehicle.rulHistory.slice(-15);
  const sparkMax = Math.max(...sparkData.map((d) => d.rul), 1);
  const sparkMin = Math.min(...sparkData.map((d) => d.rul), 0);
  const sparkRange = sparkMax - sparkMin || 1;
  const sparkWidth = 80;
  const sparkHeight = 24;

  const sparkPath = sparkData
    .map((d, i) => {
      const x = (i / Math.max(sparkData.length - 1, 1)) * sparkWidth;
      const y = sparkHeight - ((d.rul - sparkMin) / sparkRange) * sparkHeight;
      return `${i === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");

  return (
    <button
      className={`vehicle-card ${statusClass} ${isSelected ? "selected" : ""}`}
      onClick={onClick}
    >
      <div className="vehicle-card-header">
        <div className="vehicle-card-icon">
          <Truck size={16} />
        </div>
        <div className="flex flex-col items-start min-w-0">
          <span className="vehicle-card-name">{name}</span>
          {missionSubtitle && (
            <span className={`text-[9px] leading-none truncate max-w-[110px] ${
              mission?.status === "Aborted" ? "text-error/70" :
              inMaint ? "text-secondary/70" : "text-outline/50"
            }`}>
              {missionSubtitle}
            </span>
          )}
        </div>
        <span className={`status-badge ${statusClass}`}>{status}</span>
      </div>

      <div className="vehicle-card-body">
        <div className="vehicle-card-rul">
          <Gauge size={14} className="rul-icon" />
          <span className="rul-label">RUL</span>
          <span className={`rul-value ${statusClass}`}>{displayRUL}</span>
        </div>

        {sparkData.length > 2 && (
          <svg
            className="sparkline"
            viewBox={`0 0 ${sparkWidth} ${sparkHeight}`}
            width={sparkWidth}
            height={sparkHeight}
          >
            <path d={sparkPath} fill="none" strokeWidth="1.5" />
          </svg>
        )}
      </div>
    </button>
  );
}
