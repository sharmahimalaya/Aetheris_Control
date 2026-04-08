"use client";
/* ─── Fleet Simulation Hook ─── */

import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import type {
  Vehicle,
  VehicleStatus,
  AlertEvent,
  FleetState,
  RULDataPoint,
} from "../types/fleet";
import { createFleet, nextSensorReading, updateVehicleState } from "../utils/simulation";

const FLEET_SIZE = 12;
const TICK_INTERVAL_MS = 600; // faster ticks = smoother movement
const HISTORY_BUFFER = 50; // keep last N sensor readings for charts
const SEQUENCE_LENGTH = 30; // model expects 30 timesteps
const RAW_API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8001/predict";
const API_URL = RAW_API_URL.endsWith("/predict") ? RAW_API_URL : `${RAW_API_URL.replace(/\/$/, '')}/predict`;
const BATCH_SIZE = 12; // predict this many vehicles per tick

/* ── Monotonic EMA: RUL can only go down (or stay) unless in maintenance ── */
const RUL_EMA_ALPHA = 0.3; // how fast to apply new predictions (lower = smoother)

function statusFromRUL(rul: number): VehicleStatus {
  if (rul > 60) return "Normal";
  if (rul > 20) return "Warning";
  return "Critical";
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function useFleetSimulation(): FleetState & {
  selectVehicle: (id: number | null) => void;
} {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [alerts, setAlerts] = useState<AlertEvent[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);
  const [tick, setTick] = useState(0);
  const batchCursor = useRef(0);
  const initialised = useRef(false);

  /* ── Initialise fleet once ── */
  useEffect(() => {
    if (initialised.current) return;
    initialised.current = true;
    setVehicles(createFleet(FLEET_SIZE));
  }, []);

  /* ── Prediction helper ── */
  const predictForVehicle = useCallback(
    async (v: Vehicle): Promise<{ rul: number; status: VehicleStatus } | null> => {
      if (v.sensorHistory.length < SEQUENCE_LENGTH) return null;
      const seq = v.sensorHistory
        .slice(-SEQUENCE_LENGTH)
        .map((s) => s.fullFeatures);
      try {
        const res = await axios.post(API_URL, seq);
        const rul: number = res.data.RUL;
        const status = statusFromRUL(rul);
        return { rul, status };
      } catch {
        return null;
      }
    },
    []
  );

  /* ── Main simulation loop ── */
  useEffect(() => {
    if (vehicles.length === 0) return;

    const interval = setInterval(() => {
      setTick((prev) => {
        const nextTick = prev + 1;

        setVehicles((fleet) => {
          const updated = fleet.map((v) => {
            // Don't generate degraded sensors during maintenance
            const inMaint = v.maintenanceWaitRemaining > 0;

            const reading = nextSensorReading(v, nextTick);
            
            const vBase = {
              ...v,
              // Only push new sensor data if NOT in maintenance
              sensorHistory: inMaint ? v.sensorHistory : [...v.sensorHistory, reading].slice(-HISTORY_BUFFER),
              // Don't degrade during maintenance
              degradation: inMaint ? v.degradation : v.degradation + 0.003 + Math.random() * 0.002,
            };
            
            return updateVehicleState(vBase);
          });

          /* Stagger predictions: pick BATCH_SIZE vehicles per tick */
          const start = batchCursor.current;
          const batch = Array.from({ length: BATCH_SIZE }, (_, i) => {
            const idx = (start + i) % FLEET_SIZE;
            return updated[idx];
          }).filter((v) => v.maintenanceWaitRemaining === 0); // Skip vehicles in maintenance
          batchCursor.current =
            (batchCursor.current + BATCH_SIZE) % FLEET_SIZE;

          /* Fire predictions in the background */
          batch.forEach(async (v) => {
            const result = await predictForVehicle(v);
            if (!result) return;

            setVehicles((prev) =>
              prev.map((pv) => {
                if (pv.id !== v.id) return pv;
                // GUARD: don't override RUL during maintenance
                if (pv.maintenanceWaitRemaining > 0) return pv;

                /* ── Monotonic smoothing: RUL drops continuously ── */
                let smoothedRUL = result.rul;
                if (pv.rul !== null) {
                  if (result.rul >= pv.rul) {
                    // ML Model bounced up or flatlined, but wear and tear continues!
                    // Apply a steady, slight decay while moving.
                    const decay = pv.isMoving ? (0.04 + Math.random() * 0.04) : 0.01;
                    smoothedRUL = Math.max(0, pv.rul - decay);
                  } else {
                    // Model predicted a drop, apply smooth EMA
                    const ema = pv.rul * (1 - RUL_EMA_ALPHA) + result.rul * RUL_EMA_ALPHA;
                    smoothedRUL = Math.max(0, Math.min(pv.rul, ema));
                  }
                }
                const smoothedStatus = statusFromRUL(smoothedRUL);

                const rulPoint: RULDataPoint = {
                  time: nextTick,
                  rul: smoothedRUL,
                };
                const rulHistory = [...pv.rulHistory, rulPoint].slice(-60);

                /* Generate alert if status changed */
                if (smoothedStatus !== pv.status) {
                  const alert: AlertEvent = {
                    id: uid(),
                    vehicleId: pv.id,
                    vehicleName: pv.name,
                    message:
                      smoothedStatus === "Critical"
                        ? `${pv.name} entered CRITICAL state (RUL: ${smoothedRUL.toFixed(1)})`
                        : smoothedStatus === "Warning"
                          ? `${pv.name} degraded to WARNING (RUL: ${smoothedRUL.toFixed(1)})`
                          : `${pv.name} recovered to NORMAL (RUL: ${smoothedRUL.toFixed(1)})`,
                    status: smoothedStatus,
                    timestamp: new Date(),
                  };
                  setAlerts((a) => [alert, ...a].slice(0, 50));
                }

                return {
                  ...pv,
                  rul: smoothedRUL,
                  status: smoothedStatus,
                  rulHistory,
                  predicting: false,
                };
              })
            );
          });

          return updated;
        });

        return nextTick;
      });
    }, TICK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [vehicles.length, predictForVehicle]);

  return {
    vehicles,
    alerts,
    selectedVehicleId,
    tick,
    selectVehicle: setSelectedVehicleId,
  };
}
