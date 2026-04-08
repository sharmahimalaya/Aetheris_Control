"use client";

import {
  Activity,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
} from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import type { Vehicle } from "../../types/fleet";

interface HeaderProps {
  vehicles: Vehicle[];
}

export default function Header({ vehicles }: HeaderProps) {
  const total = vehicles.length;
  const normal = vehicles.filter((v) => v.status === "Normal").length;
  const warning = vehicles.filter((v) => v.status === "Warning").length;
  const critical = vehicles.filter((v) => v.status === "Critical").length;
  const active = vehicles.filter((v) => v.rul !== null).length;

  return (
    <header className="app-header">
      <div className="header-left">
        <div className="header-logo">
          <Activity size={22} />
        </div>
        <div>
          <h1 className="header-title">Smart City Fleet Monitor</h1>
          <p className="header-subtitle">
            Predictive Maintenance Control Center
          </p>
        </div>
      </div>

      <div className="header-stats">
        <div className="stat-chip">
          <span className="stat-dot total" />
          <span className="stat-label">Fleet</span>
          <span className="stat-value">{total}</span>
        </div>
        <div className="stat-chip">
          <CheckCircle2 size={14} className="stat-icon normal" />
          <span className="stat-label">Active</span>
          <span className="stat-value">{active}</span>
        </div>
        <div className="stat-chip">
          <CheckCircle2 size={14} className="stat-icon normal" />
          <span className="stat-label">Normal</span>
          <span className="stat-value">{normal}</span>
        </div>
        <div className="stat-chip">
          <AlertTriangle size={14} className="stat-icon warning" />
          <span className="stat-label">Warning</span>
          <span className="stat-value">{warning}</span>
        </div>
        <div className="stat-chip">
          <AlertOctagon size={14} className="stat-icon critical" />
          <span className="stat-label">Critical</span>
          <span className="stat-value">{critical}</span>
        </div>
      </div>

      <ThemeToggle />
    </header>
  );
}
