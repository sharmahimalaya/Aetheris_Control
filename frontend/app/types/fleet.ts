/* ─── Fleet Type Definitions ─── */

export type VehicleStatus = "Normal" | "Warning" | "Critical";

export type MissionType =
  | "Delivery"
  | "Pickup"
  | "Transport"
  | "Emergency"
  | "Patrol"
  | "Resupply";

export type MissionStatus =
  | "Active"          // currently heading to destination
  | "Completed"       // arrived at destination
  | "Aborted"         // detoured due to low RUL
  | "Returning";      // heading back to nearest base/hub

export interface Mission {
  id: string;
  title: string;
  type: MissionType;
  status: MissionStatus;
  destinationNodeId: string;
  originNodeId: string;
  /** Progress 0-1 based on path consumed */
  progress: number;
}

export interface SensorReading {
  time: number;
  temperature: number;
  vibration: number;
  speed: number;
  brakeWear: number;
  /* The full 24-feature vector sent to the model */
  fullFeatures: number[];
}

export interface RULDataPoint {
  time: number;
  rul: number;
}

export interface AlertEvent {
  id: string;
  vehicleId: number;
  vehicleName: string;
  message: string;
  status: VehicleStatus;
  timestamp: Date;
}

export type TerrainType = "Highway" | "Urban" | "Offroad";

export interface MapNode {
  id: string;
  x: number;
  y: number;
  isHub?: boolean;
}

export interface MapEdge {
  from: string;
  to: string;
  terrain: TerrainType;
}

export interface PathStep {
  x: number;
  y: number;
  terrain: TerrainType;
}

export interface Vehicle {
  id: number;
  name: string;
  status: VehicleStatus;
  rul: number | null;
  sensorHistory: SensorReading[];
  rulHistory: RULDataPoint[];
  /** Internal accumulator for degradation */
  degradation: number;
  /** Location on our mini-map grid */
  location: { x: number; y: number };
  /** Destination for vehicle route (for simulation movement) */
  targetLocation: { x: number; y: number };
  /** Whether prediction is currently loading */
  predicting: boolean;
  /** Whether the vehicle is actively moving towards target */
  isMoving: boolean;
  /** Remaining path to target */
  path: PathStep[];
  /** Current terrain causing varying degradation */
  currentTerrain: TerrainType;
  /** Ticks remaining in depot */
  maintenanceWaitRemaining: number;
  /** Reason string displayed if stopped for maintenance */
  maintenanceReason: string | null;
  /** Current target graph node */
  currentTargetNodeId: string;
  /** Heading angle in degrees (0 = right, 90 = down) for icon rotation */
  heading: number;

  /* ── Mission system ── */
  /** Active mission assignment */
  mission: Mission | null;
  /** The original path before a predictive detour — used to resume after maintenance */
  originalPath: PathStep[] | null;
  /** The destination node the vehicle was heading to before detour */
  originalDestinationNodeId: string | null;
}

export interface FleetState {
  vehicles: Vehicle[];
  alerts: AlertEvent[];
  selectedVehicleId: number | null;
  tick: number;
}
