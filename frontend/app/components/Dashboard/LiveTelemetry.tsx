import React from "react";
import type { Vehicle, AlertEvent } from "../../types/fleet";
import LiveSensorChart from "./LiveSensorChart";
import { format } from "date-fns";
import { hubDisplayName } from "../../utils/simulation";

const MISSION_TYPE_COLORS: Record<string, string> = {
  Delivery: "text-primary",
  Pickup: "text-tertiary-container",
  Transport: "text-secondary",
  Emergency: "text-error",
  Patrol: "text-outline",
  Resupply: "text-primary",
};

interface Props {
  vehicle: Vehicle | null;
  alerts: AlertEvent[];
}

export default function LiveTelemetry({ vehicle, alerts }: Props) {
  if (!vehicle) {
    return (
      <section className="w-96 h-full bg-surface-container-low flex flex-col border-l border-outline-variant/10 items-center justify-center text-outline-variant p-6 shrink-0 z-20">
        <span className="material-symbols-outlined text-4xl mb-4" data-icon="satellite_alt">
          satellite_alt
        </span>
        <p className="font-headline tracking-widest text-xs uppercase text-center">
          No Vehicle Selected
        </p>
        <p className="text-[10px] mt-2 text-center opacity-60">
          Select a unit from Fleet Command to view detailed telemetry constraints
        </p>
      </section>
    );
  }

  const latest = vehicle.sensorHistory[vehicle.sensorHistory.length - 1];
  const mission = vehicle.mission;
  const isDetouring = mission?.status === "Aborted";
  const isReturning = mission?.status === "Returning";
  const inMaint = vehicle.maintenanceWaitRemaining > 0;

  return (
    <section className="w-96 h-full bg-surface-container-low flex flex-col border-l border-outline-variant/10 overflow-y-auto shrink-0 z-20">
      <div className="p-6 pb-2">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-headline font-bold uppercase tracking-widest text-sm text-on-surface flex items-center gap-2">
            Telemetry — <span className="text-primary tabular-nums">{vehicle.name}</span>
          </h2>
          <span className="material-symbols-outlined text-outline text-lg cursor-pointer" data-icon="more_vert">
            more_vert
          </span>
        </div>

        {/* ── Active Mission Panel ── */}
        {mission && (
          <div className={`mb-5 p-3 rounded-xl border transition-all ${
            isDetouring
              ? "border-error/30 bg-error/5"
              : inMaint
                ? "border-secondary/20 bg-secondary/5"
                : "border-outline-variant/10 bg-surface-container-highest/20"
          }`}>
            {/* Detour Warning */}
            {isDetouring && (
              <div className="flex items-center gap-2 mb-2 pb-2 border-b border-error/15">
                <span className="text-error text-sm">⚠</span>
                <span className="text-[10px] font-bold text-error uppercase tracking-wider">
                  Predictive Detour — Rerouting to Depot
                </span>
              </div>
            )}

            {/* Maintenance Banner */}
            {inMaint && (
              <div className="flex items-center gap-2 mb-2 pb-2 border-b border-secondary/15">
                <span className="text-secondary text-sm">⚙</span>
                <span className="text-[10px] font-bold text-secondary uppercase tracking-wider">
                  Maintenance in Progress — {vehicle.maintenanceWaitRemaining} ticks remaining
                </span>
              </div>
            )}

            {/* Mission Header */}
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] text-outline/60 uppercase font-bold tracking-widest">
                {isDetouring ? "Aborted Mission" : isReturning ? "Returning" : inMaint ? "Pending Resume" : "Active Mission"}
              </span>
              <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded ${MISSION_TYPE_COLORS[mission.type] || "text-outline"} bg-surface-container-highest/40`}>
                {mission.type}
              </span>
            </div>

            {/* Mission Title */}
            <p className="text-xs font-bold text-on-surface mb-2 leading-snug">
              {mission.title}
            </p>

            {/* Route Info */}
            <div className="flex items-center gap-2 text-[10px] text-outline/70 mb-2">
              <span>{hubDisplayName(mission.originNodeId)}</span>
              <span className="text-outline/30">→</span>
              <span className={isDetouring ? "line-through opacity-50" : "font-medium text-on-surface/80"}>
                {hubDisplayName(mission.destinationNodeId)}
              </span>
              {isDetouring && (
                <>
                  <span className="text-error font-bold">→</span>
                  <span className="text-error font-bold">Depot</span>
                </>
              )}
            </div>

            {/* Progress Bar */}
            {!inMaint && (
              <div className="h-1 bg-surface-variant/30 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isDetouring ? "bg-error/60" : isReturning ? "bg-secondary/60" : "bg-primary/60"
                  }`}
                  style={{ width: `${Math.round(mission.progress * 100)}%` }}
                />
              </div>
            )}

            {/* Maintenance Progress */}
            {inMaint && vehicle.rul !== null && (
              <div className="mt-1">
                <div className="flex justify-between text-[9px] text-outline/50 mb-1">
                  <span>Repair Progress</span>
                  <span className="tabular-nums">{Math.round(vehicle.rul)}%</span>
                </div>
                <div className="h-1 bg-surface-variant/30 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-secondary/60 transition-all duration-500"
                    style={{ width: `${Math.round(vehicle.rul)}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Telemetry Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="p-4 rounded-xl glass-panel bg-surface-container-highest/30 border-transparent hover:border-secondary/20 transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="material-symbols-outlined text-secondary text-lg" data-icon="device_thermostat" style={{fontVariationSettings: "'FILL' 1"}}>
                device_thermostat
              </span>
              <span className="text-[9px] text-outline/60 uppercase font-bold tracking-widest">
                Temp
              </span>
            </div>
            <p className="text-xl font-bold font-headline text-secondary tabular-nums">
              {latest?.temperature.toFixed(1) || "--"}
              <span className="text-xs ml-0.5">°C</span>
            </p>
          </div>
          <div className="p-4 rounded-xl glass-panel bg-surface-container-highest/30 border-transparent hover:border-tertiary-container/20 transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="material-symbols-outlined text-tertiary-container text-lg" data-icon="waves">
                waves
              </span>
              <span className="text-[9px] text-outline/60 uppercase font-bold tracking-widest">
                Vibration
              </span>
            </div>
            <p className="text-xl font-bold font-headline text-tertiary-container tabular-nums">
              {latest?.vibration.toFixed(2) || "--"}
              <span className="text-xs ml-0.5">g</span>
            </p>
          </div>
          <div className="p-4 rounded-xl glass-panel bg-surface-container-highest/30 border-transparent hover:border-primary/20 transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="material-symbols-outlined text-primary text-lg" data-icon="bolt">
                bolt
              </span>
              <span className="text-[9px] text-outline/60 uppercase font-bold tracking-widest">
                Speed
              </span>
            </div>
            <p className="text-xl font-bold font-headline text-primary tabular-nums">
              {latest?.speed.toFixed(1) || "--"}
              <span className="text-xs ml-0.5">km/h</span>
            </p>
          </div>
          <div className="p-4 rounded-xl glass-panel bg-surface-container-highest/30 border-transparent hover:border-error/20 transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="material-symbols-outlined text-error text-lg" data-icon="disc_full">
                disc_full
              </span>
              <span className="text-[9px] text-outline/60 uppercase font-bold tracking-widest">
                Brake Wear
              </span>
            </div>
            <p className="text-xl font-bold font-headline text-error tabular-nums">
              {latest?.brakeWear.toFixed(1) || "--"}
              <span className="text-xs ml-0.5">%</span>
            </p>
          </div>
        </div>

        {/* Circular RUL Gauge */}
        <div className="px-6 py-4 rounded-2xl glass-panel relative overflow-hidden bg-gradient-to-br from-surface-container-high to-surface-container-low mb-6 flex flex-col items-center">
          <div className="relative w-36 h-36 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                className="text-surface-variant"
                cx="72"
                cy="72"
                fill="transparent"
                r="64"
                stroke="currentColor"
                strokeWidth="8"
              ></circle>
              {vehicle.rul && (
                <circle
                  cx="72"
                  cy="72"
                  fill="transparent"
                  r="64"
                  stroke="url(#rulGradient)"
                  strokeDasharray="402"
                  strokeDashoffset={402 - (402 * (vehicle.rul / 130))} // assuming 130 max RUL
                  strokeLinecap="round"
                  strokeWidth="8"
                  className="transition-all duration-1000"
                ></circle>
              )}
              <defs>
                <linearGradient id="rulGradient" x1="0%" x2="100%" y1="0%" y2="0%">
                  <stop offset="0%" style={{ stopColor: "#ffb4ab" }}></stop>
                  <stop offset="100%" style={{ stopColor: "#c3f5ff" }}></stop>
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[10px] text-outline uppercase font-bold tracking-tighter">
                Predicted RUL
              </span>
              <span className="text-4xl font-black font-headline text-primary tabular-nums">
                {vehicle.rul ? Math.round(vehicle.rul) : "—"}
              </span>
              <span className="text-[10px] text-outline uppercase">Hours</span>
            </div>
          </div>
          <div className="mt-4 flex gap-6 w-full justify-center border-t border-outline-variant/15 pt-4">
            <div className="text-center">
              <p className="text-[9px] text-outline uppercase tracking-widest">
                Confidence
              </p>
              <p className="text-xs font-bold text-on-surface">94.8%</p>
            </div>
            <div className="text-center">
              <p className="text-[9px] text-outline uppercase tracking-widest">
                Last Update
              </p>
              <p className="text-xs font-bold text-on-surface">Live</p>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="mb-6 -mx-2 bg-surface-container-lowest/30 rounded-lg p-2 overflow-hidden">
          <div className="flex items-center justify-between mb-1 px-2">
            <h3 className="text-[10px] font-bold text-outline uppercase tracking-widest">
              Sensor Trends (Live)
            </h3>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <span className="w-2 h-0.5 bg-[#f97316] rounded-full" />
                <span className="text-[7px] text-outline/60">Temp</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-0.5 bg-[#8b5cf6] rounded-full" />
                <span className="text-[7px] text-outline/60">Vib</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-0.5 bg-[#06b6d4] rounded-full" />
                <span className="text-[7px] text-outline/60">Spd</span>
              </div>
            </div>
          </div>
          <div className="h-36 pointer-events-none">
             <LiveSensorChart data={vehicle.sensorHistory} title="" />
          </div>
        </div>

        {/* Alert Feed */}
        <div>
          <h3 className="text-[10px] font-bold text-outline uppercase tracking-widest mb-3">
            System Alerts
          </h3>
          <div className="space-y-1 pb-10">
            {alerts.length === 0 && (
               <p className="text-[11px] text-outline/50 italic font-mono px-1">No alerts recorded.</p>
            )}
            {alerts.slice(0, 10).map((alert) => (
              <div
                key={alert.id}
                className="flex gap-3 text-[11px] font-mono leading-relaxed group hover:bg-surface-variant/30 px-2 py-1.5 rounded transition-colors"
              >
                <span className="text-outline/50 tabular-nums shrink-0 mt-0.5">
                  {format(alert.timestamp, "HH:mm:ss")}
                </span>
                <span
                  className={`shrink-0 font-bold ${
                    alert.status === "Critical"
                      ? "text-error"
                      : alert.status === "Warning"
                      ? "text-secondary"
                      : "text-primary"
                  }`}
                >
                  —
                </span>
                <span className="text-on-surface/80">
                  <span
                    className={`font-bold mr-1 ${
                      alert.status === "Critical"
                        ? "text-error"
                        : alert.status === "Warning"
                        ? "text-secondary"
                        : "text-primary"
                    }`}
                  >
                    {alert.vehicleName}
                  </span>
                  {alert.message.replace(`${alert.vehicleName} `, "")}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
