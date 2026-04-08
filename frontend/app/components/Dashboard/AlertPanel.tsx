"use client";

import { AlertTriangle, AlertOctagon, CheckCircle2, Bell } from "lucide-react";
import type { AlertEvent } from "../../types/fleet";

interface AlertPanelProps {
  alerts: AlertEvent[];
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export default function AlertPanel({ alerts }: AlertPanelProps) {
  const icon = (status: string) => {
    switch (status) {
      case "Critical":
        return <AlertOctagon size={14} className="alert-icon critical" />;
      case "Warning":
        return <AlertTriangle size={14} className="alert-icon warning" />;
      default:
        return <CheckCircle2 size={14} className="alert-icon normal" />;
    }
  };

  return (
    <div className="alert-panel">
      <div className="alert-panel-header">
        <Bell size={16} />
        <h3 className="panel-title">Live Alerts</h3>
        {alerts.length > 0 && (
          <span className="alert-count">{alerts.length}</span>
        )}
      </div>

      <div className="alert-list">
        {alerts.length === 0 && (
          <p className="alert-empty">No alerts yet — monitoring fleet…</p>
        )}
        {alerts.map((a) => (
          <div key={a.id} className={`alert-item ${a.status.toLowerCase()}`}>
            {icon(a.status)}
            <div className="alert-content">
              <span className="alert-msg">{a.message}</span>
              <span className="alert-time">{formatTime(a.timestamp)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
