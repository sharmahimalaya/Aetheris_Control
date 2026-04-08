"use client";

import { useFleetSimulation } from "../hooks/useFleetSimulation";
import FleetCommandPanel from "../components/Dashboard/FleetCommandPanel";
import OperationsMap from "../components/Dashboard/OperationsMap";
import LiveTelemetry from "../components/Dashboard/LiveTelemetry";
import { useEffect, useState } from "react";
import { format } from "date-fns";

export default function DashboardPage() {
  const { vehicles, alerts, selectedVehicleId, selectVehicle } =
    useFleetSimulation();

  const [timeStr, setTimeStr] = useState("");

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeStr(format(new Date(), "HH:mm:ss"));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const selectedVehicle =
    vehicles.find((v) => v.id === selectedVehicleId) ?? null;

  const activeCount = vehicles.filter((v) => v.status === "Normal").length;
  const warningCount = vehicles.filter((v) => v.status === "Warning").length;
  const criticalCount = vehicles.filter((v) => v.status === "Critical").length;

  return (
    <>
      <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-6 h-16 bg-[#0b0f19]/80 backdrop-blur-xl shadow-[0px_0px_40px_rgba(223,226,241,0.05)] border-b border-white/5">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-fixed flex items-center justify-center rounded-lg shadow-lg">
            <span
              className="material-symbols-outlined text-on-primary text-2xl"
              data-icon="hub"
            >
              hub
            </span>
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-primary uppercase font-headline">
              Aetheris Control
            </h1>
            <p className="text-[10px] text-outline tracking-widest uppercase">
              Predictive Maintenance Control Center
            </p>
          </div>
        </div>
        <div className="hidden lg:flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-full bg-surface-container border border-outline-variant/30 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-on-surface animate-pulse"></span>
            <span className="text-xs font-medium text-on-surface/80 tabular-nums">
              Fleet: {vehicles.length || 12}
            </span>
          </div>
          <div className="px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
            <span className="text-xs font-medium text-primary tabular-nums">
              Active: {activeCount}
            </span>
          </div>
          <div className="px-3 py-1.5 rounded-full bg-secondary/10 border border-secondary/20 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
            <span className="text-xs font-medium text-secondary tabular-nums">
              Warning: {warningCount}
            </span>
          </div>
          <div className="px-3 py-1.5 rounded-full bg-error/10 border border-error/20 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-error"></span>
            <span className="text-xs font-medium text-error tabular-nums">
              Critical: {criticalCount}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-sm font-bold tabular-nums text-primary font-headline">
              {timeStr}
            </p>
            <p className="text-[10px] text-outline uppercase tracking-tighter">
              System Time
            </p>
          </div>
        </div>
      </header>

      <main className="pt-16 h-screen flex flex-row overflow-hidden absolute inset-0 text-white w-full">
        <FleetCommandPanel
          vehicles={vehicles}
          selectedId={selectedVehicleId}
          onSelect={selectVehicle}
        />
        <OperationsMap
          vehicles={vehicles}
          selectedId={selectedVehicleId}
          onSelect={selectVehicle}
        />
        <LiveTelemetry vehicle={selectedVehicle} alerts={alerts} />
      </main>
    </>
  );
}