/* ─── Simulation Utilities ─── */
import type { SensorReading, Vehicle, MapNode, MapEdge, PathStep, TerrainType, Mission, MissionType } from "../types/fleet";

/* ══════════════════════════════════════════════════════════════════
   CITY ROAD NETWORK — Clean Manhattan-style layout
   ──────────────────────────────────────────────────────────────────
   Coordinate space: 0 – 200
   Grid: 9×9 nodes (every 25 units) — all hubs placed AT grid points
   Perimeter highway ring connects all corners and edge hubs
   Interior urban grid + offroad industrial shortcuts
   ══════════════════════════════════════════════════════════════════ */

function nodeId(x: number, y: number): string {
  return `N_${x}_${y}`;
}

/* ── Build the city ── */
function generateCity(): { nodes: Record<string, MapNode>; edges: MapEdge[] } {
  const nodes: Record<string, MapNode> = {};
  const edges: MapEdge[] = [];
  const STEP = 25;
  const MAX = 200;

  /* ── Named hubs placed exactly ON grid intersections ── */
  const namedHubs: Record<string, { pos: [number, number]; icon: string }> = {
    // Corners
    Base:     { pos: [0, 0],     icon: "home" },
    Hub_NE:   { pos: [200, 0],   icon: "north_east" },
    Hub_SW:   { pos: [0, 200],   icon: "south_west" },
    Hub_SE:   { pos: [200, 200], icon: "south_east" },
    // Edge centers
    Hub_N:    { pos: [100, 0],   icon: "north" },
    Hub_S:    { pos: [100, 200], icon: "south" },
    Hub_W:    { pos: [0, 100],   icon: "west" },
    Hub_E:    { pos: [200, 100], icon: "east" },
    // Center
    Depot:    { pos: [100, 100], icon: "build" },
    // Special locations (also on grid points)
    Airport:  { pos: [50, 25],   icon: "flight" },
    Factory:  { pos: [150, 50],  icon: "factory" },
    Hospital: { pos: [50, 150],  icon: "local_hospital" },
    Port:     { pos: [150, 175], icon: "sailing" },
  };

  // Track which grid positions have a named hub
  const hubAtGrid = new Map<string, string>();
  for (const [name, data] of Object.entries(namedHubs)) {
    const key = `${data.pos[0]},${data.pos[1]}`;
    hubAtGrid.set(key, name);
    nodes[name] = { id: name, x: data.pos[0], y: data.pos[1], isHub: true };
  }

  // Generate all grid nodes (skip where named hubs already exist)
  for (let x = 0; x <= MAX; x += STEP) {
    for (let y = 0; y <= MAX; y += STEP) {
      const key = `${x},${y}`;
      if (hubAtGrid.has(key)) continue;
      const id = nodeId(x, y);
      nodes[id] = { id, x, y, isHub: false };
    }
  }

  // Helper to find node id at a grid position
  function resolveId(x: number, y: number): string | null {
    const key = `${x},${y}`;
    if (hubAtGrid.has(key)) return hubAtGrid.get(key)!;
    const id = nodeId(x, y);
    return nodes[id] ? id : null;
  }

  /* ── Horizontal edges ── */
  for (let y = 0; y <= MAX; y += STEP) {
    for (let x = 0; x < MAX; x += STEP) {
      const fromId = resolveId(x, y);
      const toId = resolveId(x + STEP, y);
      if (!fromId || !toId) continue;

      // Perimeter + central axis = Highway, interior = Urban
      let terrain: TerrainType = "Urban";
      if (y === 0 || y === MAX || y === 100) terrain = "Highway";
      if (x === 0 || (x + STEP) === 0) terrain = "Highway"; // left edge

      edges.push({ from: fromId, to: toId, terrain });
    }
  }

  /* ── Vertical edges ── */
  for (let x = 0; x <= MAX; x += STEP) {
    for (let y = 0; y < MAX; y += STEP) {
      const fromId = resolveId(x, y);
      const toId = resolveId(x, y + STEP);
      if (!fromId || !toId) continue;

      let terrain: TerrainType = "Urban";
      if (x === 0 || x === MAX || x === 100) terrain = "Highway";

      edges.push({ from: fromId, to: toId, terrain });
    }
  }

  /* ── Diagonal offroad shortcuts (industrial areas) ── */
  const offroadDiagonals: [number, number, number, number][] = [
    // NW diagonal
    [25, 0, 0, 25],
    [50, 0, 25, 25],
    // NE diagonal
    [175, 0, 200, 25],
    [150, 0, 175, 25],
    // SW diagonal
    [0, 175, 25, 200],
    [25, 175, 50, 200],
    // SE diagonal
    [175, 200, 200, 175],
    [150, 200, 175, 175],
    // Inner diagonals near depot
    [75, 75, 100, 100],
    [125, 75, 100, 100],
    [75, 125, 100, 100],
    [125, 125, 100, 100],
    // Cross-city shortcuts
    [50, 50, 75, 75],
    [150, 50, 125, 75],
    [50, 150, 75, 125],
    [150, 150, 125, 125],
  ];

  for (const [x1, y1, x2, y2] of offroadDiagonals) {
    const fromId = resolveId(x1, y1);
    const toId = resolveId(x2, y2);
    if (fromId && toId) {
      edges.push({ from: fromId, to: toId, terrain: "Offroad" });
    }
  }

  /* ── De-duplicate edges ── */
  const edgeSet = new Set<string>();
  const uniqueEdges: MapEdge[] = [];
  for (const e of edges) {
    const key = [e.from, e.to].sort().join("--");
    if (!edgeSet.has(key)) {
      edgeSet.add(key);
      uniqueEdges.push(e);
    }
  }

  return { nodes, edges: uniqueEdges };
}

/* ── Build runtime data structures ── */
const city = generateCity();
export const ROAD_NODES = city.nodes;
export const ROAD_EDGES = city.edges;

/* ── Terrain-weighted cost multipliers ── */
const TERRAIN_COST: Record<TerrainType, number> = {
  Highway: 1.0,
  Urban: 2.2,
  Offroad: 5.0,
};

/* ── Adjacency graph with weighted costs ── */
export const GRAPH: Record<string, { to: string; terrain: TerrainType; dist: number; cost: number }[]> = {};
Object.keys(ROAD_NODES).forEach((k) => (GRAPH[k] = []));

ROAD_EDGES.forEach((e) => {
  const n1 = ROAD_NODES[e.from];
  const n2 = ROAD_NODES[e.to];
  if (!n1 || !n2) return;
  const dist = Math.sqrt(Math.pow(n1.x - n2.x, 2) + Math.pow(n1.y - n2.y, 2));
  const cost = dist * TERRAIN_COST[e.terrain];
  GRAPH[e.from].push({ to: e.to, terrain: e.terrain, dist, cost });
  GRAPH[e.to].push({ to: e.from, terrain: e.terrain, dist, cost });
});


/* ══════════════════════════════════════════════════════════════════
   WEIGHTED SHORTEST PATH (Dijkstra on cost)
   ══════════════════════════════════════════════════════════════════ */
export function findShortestPath(startId: string, endId: string): PathStep[] {
  if (!ROAD_NODES[startId] || !ROAD_NODES[endId]) return [];

  const costs: Record<string, number> = {};
  const prev: Record<string, { id: string; terrain: TerrainType } | null> = {};
  const visited = new Set<string>();
  const queue: { id: string; cost: number }[] = [];

  Object.keys(ROAD_NODES).forEach((k) => {
    costs[k] = Infinity;
    prev[k] = null;
  });
  costs[startId] = 0;
  queue.push({ id: startId, cost: 0 });

  while (queue.length > 0) {
    queue.sort((a, b) => a.cost - b.cost);
    const current = queue.shift()!;
    if (visited.has(current.id)) continue;
    visited.add(current.id);
    if (current.id === endId) break;

    for (const neighbor of (GRAPH[current.id] || [])) {
      if (visited.has(neighbor.to)) continue;
      const alt = costs[current.id] + neighbor.cost;
      if (alt < costs[neighbor.to]) {
        costs[neighbor.to] = alt;
        prev[neighbor.to] = { id: current.id, terrain: neighbor.terrain };
        queue.push({ id: neighbor.to, cost: alt });
      }
    }
  }

  const path: PathStep[] = [];
  let curr = endId;
  while (curr !== startId) {
    if (!prev[curr]) break;
    const node = ROAD_NODES[curr];
    path.unshift({ x: node.x, y: node.y, terrain: prev[curr]!.terrain });
    curr = prev[curr]!.id;
  }
  return path;
}


/* ══════════════════════════════════════════════════════════════════
   HELPER UTILITIES
   ══════════════════════════════════════════════════════════════════ */
function gaussianNoise(mean = 0, stddev = 1): number {
  const u1 = Math.random();
  const u2 = Math.random();
  return mean + stddev * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/** Smooth lerp for heading */
function lerpAngle(from: number, to: number, t: number): number {
  let diff = to - from;
  while (diff > 180) diff -= 360;
  while (diff < -180) diff += 360;
  return from + diff * t;
}

/** Compute perpendicular lane offset for right-hand traffic */
export function laneOffset(
  fromX: number, fromY: number, toX: number, toY: number, offsetAmount: number
): { ox: number; oy: number } {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return { ox: 0, oy: 0 };
  return {
    ox: (dy / len) * offsetAmount,
    oy: (-dx / len) * offsetAmount,
  };
}


/* ══════════════════════════════════════════════════════════════════
   MISSION SYSTEM
   ══════════════════════════════════════════════════════════════════ */

/** All hub node IDs (for mission destinations) */
const HUB_IDS = Object.keys(ROAD_NODES).filter(
  (id) => ROAD_NODES[id].isHub && (GRAPH[id]?.length ?? 0) > 0
);

/** Contextual mission templates keyed by destination hub */
const MISSION_TEMPLATES: Record<string, { types: MissionType[]; titles: string[] }> = {
  Airport:  { types: ["Transport", "Delivery"], titles: ["Cargo Transfer to Airport", "Air Freight Pickup", "Airfield Resupply Run"] },
  Factory:  { types: ["Pickup", "Resupply"],    titles: ["Factory Parts Pickup", "Industrial Resupply", "Raw Materials Transport"] },
  Hospital: { types: ["Emergency", "Delivery"],  titles: ["Medical Supply Delivery", "Emergency Equipment Transport", "Vaccine Shipment"] },
  Port:     { types: ["Transport", "Pickup"],    titles: ["Port Container Pickup", "Maritime Cargo Haul", "Dock Resupply Run"] },
  Depot:    { types: ["Resupply", "Delivery"],   titles: ["Depot Stock Transfer", "Central Warehouse Reload", "Maintenance Parts Delivery"] },
  Base:     { types: ["Patrol", "Delivery"],     titles: ["Base Perimeter Patrol", "HQ Supply Drop", "Base Security Sweep"] },
  Hub_N:    { types: ["Patrol", "Transport"],    titles: ["North Sector Patrol", "North Gate Delivery", "Northern Logistics Run"] },
  Hub_S:    { types: ["Patrol", "Transport"],    titles: ["South Sector Patrol", "South Gate Delivery", "Southern Logistics Run"] },
  Hub_E:    { types: ["Patrol", "Transport"],    titles: ["East Sector Patrol", "East Gate Delivery", "Eastern Perimeter Sweep"] },
  Hub_W:    { types: ["Patrol", "Transport"],    titles: ["West Sector Patrol", "West Gate Delivery", "Western Route Recon"] },
  Hub_NE:   { types: ["Patrol", "Delivery"],     titles: ["NE Outpost Supply Run", "NE Checkpoint Patrol"] },
  Hub_SE:   { types: ["Patrol", "Delivery"],     titles: ["SE Outpost Supply Run", "SE Checkpoint Patrol"] },
  Hub_SW:   { types: ["Patrol", "Delivery"],     titles: ["SW Outpost Supply Run", "SW Checkpoint Patrol"] },
};

/** Generate a random mission for a vehicle at a given node */
export function generateMission(currentNodeId: string): Mission {
  // Pick a random destination that isn't the current node and isn't Depot
  const candidates = HUB_IDS.filter((id) => id !== currentNodeId && id !== "Depot");
  const dest = candidates[Math.floor(Math.random() * candidates.length)] || "Factory";

  const template = MISSION_TEMPLATES[dest] || { types: ["Transport"], titles: ["Logistics Run"] };
  const mType = template.types[Math.floor(Math.random() * template.types.length)];
  const title = template.titles[Math.floor(Math.random() * template.titles.length)];

  return {
    id: Math.random().toString(36).slice(2, 10),
    title,
    type: mType,
    status: "Active",
    destinationNodeId: dest,
    originNodeId: currentNodeId,
    progress: 0,
  };
}

/** Find the nearest base/hub to return to after completing a mission */
export function findNearestHub(currentNodeId: string): string {
  let best = "Base";
  let bestCost = Infinity;

  for (const hubId of HUB_IDS) {
    if (hubId === currentNodeId || hubId === "Depot") continue;
    const path = findShortestPath(currentNodeId, hubId);
    if (path.length === 0) continue;
    let totalCost = 0;
    let prev = ROAD_NODES[currentNodeId];
    for (const step of path) {
      totalCost += Math.sqrt(Math.pow(step.x - prev.x, 2) + Math.pow(step.y - prev.y, 2));
      prev = step as unknown as MapNode;
    }
    if (totalCost < bestCost) {
      bestCost = totalCost;
      best = hubId;
    }
  }
  return best;
}

/** Human-readable hub name */
export function hubDisplayName(nodeId: string): string {
  const map: Record<string, string> = {
    Base: "Base HQ", Depot: "Depot", Airport: "Airport", Factory: "Factory",
    Hospital: "Hospital", Port: "Port", Hub_N: "Hub North", Hub_S: "Hub South",
    Hub_E: "Hub East", Hub_W: "Hub West", Hub_NE: "Hub NE", Hub_SE: "Hub SE",
    Hub_SW: "Hub SW",
  };
  return map[nodeId] || nodeId;
}


/* ══════════════════════════════════════════════════════════════════
   SENSOR READING GENERATOR
   ══════════════════════════════════════════════════════════════════ */
export function nextSensorReading(vehicle: Vehicle, tick: number): SensorReading {
  const prev = vehicle.sensorHistory[vehicle.sensorHistory.length - 1];
  const deg = vehicle.degradation;

  let terrainVibeMod = 0;
  let terrainDegMod = 0;
  if (vehicle.currentTerrain === "Offroad") {
    terrainVibeMod = 0.6;
    terrainDegMod = 0.05;
  } else if (vehicle.currentTerrain === "Urban") {
    terrainVibeMod = 0.1;
  }

  const baseTempDrift = 0.8 * deg + terrainDegMod;
  const tempCycle = 5 * Math.sin(tick * 0.08 + vehicle.id);
  const temperature = prev
    ? clamp(prev.temperature + baseTempDrift + tempCycle * 0.1 + gaussianNoise(0, 1.2), 20, 150)
    : 60 + gaussianNoise(0, 4);

  const vibeBase = 0.3 + deg * 0.12;
  const vibeSpike = Math.random() < 0.08 ? gaussianNoise(0.6, 0.3) : 0;
  const vibration = prev
    ? clamp(prev.vibration * 0.7 + vibeBase * 0.3 + gaussianNoise(0, 0.08) + vibeSpike + terrainVibeMod, 0, 3)
    : 0.35 + gaussianNoise(0, 0.05) + terrainVibeMod;

  let targetSpeed = 40;
  if (vehicle.currentTerrain === "Highway") targetSpeed = 80;
  if (!vehicle.isMoving) targetSpeed = 0;

  const speedPattern =
    targetSpeed + 5 * Math.sin(tick * 0.03 + vehicle.id * 2) + 2 * Math.cos(tick * 0.07);
  const speed = prev
    ? clamp(prev.speed * 0.6 + speedPattern * 0.4 + gaussianNoise(0, 2), 0, 120)
    : targetSpeed + gaussianNoise(0, 5);

  const brakeSpike = vehicle.currentTerrain === "Urban" ? Math.random() * 0.2 : 0;
  const brakeWear = prev
    ? clamp(prev.brakeWear + 0.1 + deg * 0.3 + brakeSpike, 0, 100)
    : 10 + Math.random() * 15;

  const coreFeatures = [temperature / 150, vibration / 3, speed / 120];
  const paddingFeatures = Array.from({ length: 21 }, (_, i) =>
    0.3 + 0.4 * Math.sin(tick * 0.05 + i + vehicle.id) + gaussianNoise(0, 0.08)
  );
  const fullFeatures = [...coreFeatures, ...paddingFeatures].map((v) => clamp(v, 0, 1));

  return { time: tick, temperature, vibration, speed, brakeWear, fullFeatures };
}


/* ══════════════════════════════════════════════════════════════════
   FLEET CREATION
   ══════════════════════════════════════════════════════════════════ */
export function createFleet(count: number): Vehicle[] {
  const hubIds = Object.keys(ROAD_NODES).filter(
    (id) => ROAD_NODES[id].isHub && (GRAPH[id]?.length ?? 0) > 0
  );

  return Array.from({ length: count }, (_, i) => {
    const startHub = hubIds[i % hubIds.length];
    const startNode = ROAD_NODES[startHub];

    // Generate initial mission
    const mission = generateMission(startHub);

    const vehicle: Vehicle = {
      id: i + 1,
      name: `V-${String(i + 1).padStart(3, "0")}`,
      status: "Normal" as const,
      rul: null,
      sensorHistory: [],
      rulHistory: [],
      degradation: Math.random() * 0.2,
      location: { x: startNode.x, y: startNode.y },
      targetLocation: { x: startNode.x, y: startNode.y },
      predicting: false,
      isMoving: false,
      path: [],
      currentTerrain: "Highway",
      maintenanceWaitRemaining: 0,
      maintenanceReason: null,
      currentTargetNodeId: startHub,
      heading: 0,
      // Mission
      mission,
      originalPath: null,
      originalDestinationNodeId: null,
    };

    for (let t = -30; t <= 0; t++) {
      vehicle.sensorHistory.push(nextSensorReading(vehicle, t));
    }

    return vehicle;
  });
}


/* ══════════════════════════════════════════════════════════════════
   VEHICLE STATE UPDATE — with mission + detour logic
   ══════════════════════════════════════════════════════════════════ */
export function updateVehicleState(v: Vehicle): Vehicle {
  const updated = { ...v };

  // 1. Maintenance: vehicle stays parked, RUL gradually increases
  if (updated.maintenanceWaitRemaining > 0) {
    updated.maintenanceWaitRemaining--;
    updated.isMoving = false;

    // Gradually restore RUL during maintenance (repair ~6-7 per tick)
    const repairPerTick = 100 / 15; // 15 ticks total, gain ~6.7 RUL each
    updated.rul = Math.min(100, (updated.rul ?? 0) + repairPerTick);
    updated.degradation = Math.max(0, updated.degradation - 0.02); // sensors improve

    // Update status as RUL increases
    if (updated.rul > 60) updated.status = "Normal";
    else if (updated.rul > 20) updated.status = "Warning";

    // Maintenance complete — fully repaired
    if (updated.maintenanceWaitRemaining === 0) {
      updated.degradation = 0;
      updated.status = "Normal";
      updated.maintenanceReason = null;
      updated.rul = 100;
      
      // Pre-fill with a fresh batch of clean sensor readings so the ML model 
      // doesn't predict off a broken/short sequence when leaving the depot
      updated.sensorHistory = [];
      for (let t = -30; t <= 0; t++) {
        updated.sensorHistory.push(nextSensorReading(updated, t));
      }
      updated.rulHistory = [];

      // Resume original mission if we detoured
      if (updated.originalDestinationNodeId) {
        // Re-route from Depot to the original destination
        const resumePath = findShortestPath("Depot", updated.originalDestinationNodeId);
        if (resumePath.length > 0) {
          updated.path = resumePath;
          updated.targetLocation = { x: resumePath[0].x, y: resumePath[0].y };
          updated.currentTerrain = resumePath[0].terrain;
          updated.isMoving = true;
          if (updated.mission) {
            const isReturning = updated.mission.title.startsWith("Returning");
            updated.mission = { ...updated.mission, status: isReturning ? "Returning" : "Active" };
          }
        }
        updated.originalPath = null;
        updated.originalDestinationNodeId = null;
      }
    }
    return updated;
  }

  // 2. Destination selection
  if (updated.path.length === 0) {

    /* ── Critical: DETOUR to Depot ── */
    if (updated.status === "Critical" && updated.currentTargetNodeId !== "Depot") {
      // Save original mission destination for resumption
      if (updated.mission && (updated.mission.status === "Active" || updated.mission.status === "Returning")) {
        updated.originalDestinationNodeId = updated.mission.destinationNodeId;
        updated.mission = { ...updated.mission, status: "Aborted" };
        updated.maintenanceReason = `⚠ PREDICTIVE DETOUR — Low RUL, rerouting to Depot`;
      }
      updated.path = findShortestPath(updated.currentTargetNodeId, "Depot");
      if (updated.path.length > 0) {
        updated.targetLocation = { x: updated.path[0].x, y: updated.path[0].y };
        updated.currentTerrain = updated.path[0].terrain;
        updated.isMoving = true;
      }

    /* ── Arrived at Depot while degraded → start maintenance ── */
    } else if (
      updated.currentTargetNodeId === "Depot" &&
      (updated.status === "Critical" || updated.status === "Warning" || (updated.rul !== null && updated.rul < 30))
    ) {
      updated.maintenanceWaitRemaining = 15;
      updated.maintenanceReason = "Depot: Scheduled Maintenance";
      updated.isMoving = false;
      return updated;

    /* ── Mission completed (arrived at destination) ── */
    } else if (
      updated.mission &&
      updated.mission.status === "Active" &&
      updated.currentTargetNodeId === updated.mission.destinationNodeId
    ) {
      // Mark mission completed
      updated.mission = { ...updated.mission, status: "Completed", progress: 1 };

      // Return to nearest hub/base for new assignment
      const returnHub = findNearestHub(updated.currentTargetNodeId);
      updated.mission = {
        ...updated.mission,
        status: "Returning",
        destinationNodeId: returnHub,
        title: `Returning to ${hubDisplayName(returnHub)}`,
      };
      updated.path = findShortestPath(updated.currentTargetNodeId, returnHub);
      if (updated.path.length > 0) {
        updated.targetLocation = { x: updated.path[0].x, y: updated.path[0].y };
        updated.currentTerrain = updated.path[0].terrain;
        updated.isMoving = true;
      }

    /* ── Returned to base → assign new mission ── */
    } else if (
      updated.mission &&
      updated.mission.status === "Returning" &&
      HUB_IDS.includes(updated.currentTargetNodeId)
    ) {
      // Assign a brand new mission
      updated.mission = generateMission(updated.currentTargetNodeId);
      updated.originalPath = null;
      updated.originalDestinationNodeId = null;

      // Plot path to mission destination
      updated.path = findShortestPath(updated.currentTargetNodeId, updated.mission.destinationNodeId);
      if (updated.path.length > 0) {
        updated.targetLocation = { x: updated.path[0].x, y: updated.path[0].y };
        updated.currentTerrain = updated.path[0].terrain;
        updated.isMoving = true;
      }

    /* ── No mission yet (initial boot) → assign one ── */
    } else if (!updated.mission || updated.mission.status === "Completed") {
      updated.mission = generateMission(updated.currentTargetNodeId);
      updated.originalPath = null;
      updated.originalDestinationNodeId = null;

      updated.path = findShortestPath(updated.currentTargetNodeId, updated.mission.destinationNodeId);
      updated.maintenanceReason = null;

      if (updated.path.length > 0) {
        updated.targetLocation = { x: updated.path[0].x, y: updated.path[0].y };
        updated.currentTerrain = updated.path[0].terrain;
        updated.isMoving = true;
      }

    /* ── Low RUL safety reroute ── */
    } else {
      // If the mission has us going somewhere, try to get there
      const dest = updated.mission?.destinationNodeId || "Base";
      const possiblePath = findShortestPath(updated.currentTargetNodeId, dest);

      // RUL safety check
      let totalDist = 0;
      let pPrev = ROAD_NODES[updated.currentTargetNodeId];
      possiblePath.forEach((pt) => {
        totalDist += Math.sqrt(Math.pow(pt.x - pPrev.x, 2) + Math.pow(pt.y - pPrev.y, 2));
        pPrev = pt as unknown as MapNode;
      });

      if (
        updated.rul !== null &&
        updated.rul < totalDist / 4 + 30 &&
        dest !== "Depot" &&
        updated.currentTargetNodeId !== "Depot"
      ) {
        // Save and detour
        updated.originalDestinationNodeId = dest;
        if (updated.mission) {
          updated.mission = { ...updated.mission, status: "Aborted" };
        }
        updated.path = findShortestPath(updated.currentTargetNodeId, "Depot");
        updated.maintenanceReason = `Low RUL (${updated.rul.toFixed(0)}) — rerouting to Depot`;
      } else {
        updated.path = possiblePath;
        updated.maintenanceReason = null;
      }

      if (updated.path.length > 0) {
        updated.targetLocation = { x: updated.path[0].x, y: updated.path[0].y };
        updated.currentTerrain = updated.path[0].terrain;
        updated.isMoving = true;
      } else {
        updated.isMoving = false;
      }
    }
  }

  // 3. Update mission progress
  if (updated.mission && updated.mission.status === "Active" && updated.isMoving) {
    const dest = ROAD_NODES[updated.mission.destinationNodeId];
    if (dest) {
      const origin = ROAD_NODES[updated.mission.originNodeId];
      if (origin) {
        const totalDist = Math.sqrt(
          Math.pow(dest.x - origin.x, 2) + Math.pow(dest.y - origin.y, 2)
        );
        const remainDist = Math.sqrt(
          Math.pow(dest.x - updated.location.x, 2) + Math.pow(dest.y - updated.location.y, 2)
        );
        updated.mission = {
          ...updated.mission,
          progress: totalDist > 0 ? clamp(1 - remainDist / totalDist, 0, 1) : 1,
        };
      }
    }
  }

  // 4. Movement with smooth heading
  if (updated.isMoving && updated.path.length > 0) {
    const target = updated.path[0];
    const dx = target.x - updated.location.x;
    const dy = target.y - updated.location.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Smooth heading — lerp faster for responsiveness
    if (dist > 0.5) {
      const targetHeading = Math.atan2(dy, dx) * (180 / Math.PI);
      updated.heading = lerpAngle(updated.heading, targetHeading, 0.35);
    }

    // Speed (tuned for 600ms tick — smaller steps = smoother)
    let maxSpeed = 2.8;
    if (updated.currentTerrain === "Urban") maxSpeed = 1.8;
    if (updated.currentTerrain === "Offroad") maxSpeed = 1.2;
    if (updated.status === "Warning") maxSpeed *= 0.75;
    if (updated.status === "Critical") maxSpeed *= 1.3;

    // Decelerate for sharp turns
    if (updated.path.length >= 2 && dist < 6) {
      const next = updated.path[1];
      const ndx = next.x - target.x;
      const ndy = next.y - target.y;
      const turnAngle = Math.abs(Math.atan2(ndy, ndx) - Math.atan2(dy, dx));
      if (turnAngle > Math.PI / 4) maxSpeed *= 0.45;
    }

    const speed = Math.min(maxSpeed, dist);

    if (dist <= Math.max(speed, 1.5)) {
      updated.location = { x: target.x, y: target.y };
      const reachedNodeId = Object.keys(ROAD_NODES).find(
        (k) => ROAD_NODES[k].x === target.x && ROAD_NODES[k].y === target.y
      );
      if (reachedNodeId) updated.currentTargetNodeId = reachedNodeId;

      updated.path = updated.path.slice(1);
      if (updated.path.length > 0) {
        updated.targetLocation = { x: updated.path[0].x, y: updated.path[0].y };
        updated.currentTerrain = updated.path[0].terrain;
      } else {
        updated.targetLocation = { ...updated.location };
        updated.isMoving = false;
      }
    } else {
      updated.location = {
        x: updated.location.x + (dx / dist) * speed,
        y: updated.location.y + (dy / dist) * speed,
      };
    }
  }

  return updated;
}
