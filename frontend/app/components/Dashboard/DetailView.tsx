"use client";

import { Truck, Thermometer, Waves, Zap, Disc } from "lucide-react";
import LiveSensorChart from "./LiveSensorChart";
import RULTrendChart from "./RULTrendChart";
import type { Vehicle } from "../../types/fleet";

interface DetailViewProps {
  vehicle: Vehicle;
}

export default function DetailView({ vehicle }: DetailViewProps) {
  const latest = vehicle.sensorHistory[vehicle.sensorHistory.length - 1];

  const statusClass = vehicle.status.toLowerCase();

  return (
    <div className="detail-view">
      {/* ── Top Info Bar ── */}
      <div className="detail-header">
        <div className="detail-vehicle-info">
          <div className={`detail-icon-ring ${statusClass}`}>
            <Truck size={20} />
          </div>
          <div>
            <h2 className="detail-name">{vehicle.name}</h2>
            <span className={`status-badge large ${statusClass}`}>
              {vehicle.status}
            </span>
          </div>
        </div>

        {latest && (
          <div className="detail-metrics">
            <div className="metric-tile">
              <Thermometer size={16} className="metric-icon temp" />
              <div>
                <span className="metric-label">Temperature</span>
                <span className="metric-value">
                  {latest.temperature.toFixed(1)}°C
                </span>
              </div>
            </div>
            <div className="metric-tile">
              <Waves size={16} className="metric-icon vibe" />
              <div>
                <span className="metric-label">Vibration</span>
                <span className="metric-value">
                  {latest.vibration.toFixed(2)} g
                </span>
              </div>
            </div>
            <div className="metric-tile">
              <Zap size={16} className="metric-icon speed" />
              <div>
                <span className="metric-label">Speed</span>
                <span className="metric-value">
                  {latest.speed.toFixed(1)} km/h
                </span>
              </div>
            </div>
            <div className="metric-tile">
              <Disc size={16} className="metric-icon brake" />
              <div>
                <span className="metric-label">Brake Wear</span>
                <span className="metric-value">
                  {latest.brakeWear.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── RUL Gauge ── */}
      <div className="detail-rul-row">
        <div className={`rul-gauge ${statusClass}`}>
          <span className="rul-gauge-label">Predicted RUL</span>
          <span className="rul-gauge-value">
            {vehicle.rul !== null ? vehicle.rul.toFixed(1) : "—"}
          </span>
          <span className="rul-gauge-unit">cycles</span>
        </div>
      </div>

      {/* ── Charts ── */}
      <div className="detail-charts">
        <LiveSensorChart
          data={vehicle.sensorHistory}
          title="Sensor Readings (Live)"
        />
        <RULTrendChart
          data={vehicle.rulHistory}
          title="RUL Prediction History"
        />
      </div>
    </div>
  );
}
