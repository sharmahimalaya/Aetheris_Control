"use client";

import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import type { Vehicle } from "../../types/fleet";
import { ROAD_EDGES, ROAD_NODES, laneOffset } from "../../utils/simulation";

const MAP_SIZE = 200;
const MARGIN = 15;
const MIN_ZOOM = 0.4;
const MAX_ZOOM = 3.0;
const ZOOM_STEP = 0.15;
const LANE_OFFSET_PX = 1.2;
const TICK_MS = 600; // must match useFleetSimulation TICK_INTERVAL_MS

/* ── Hub icon paths (viewbox 0 0 20 20) ── */
const HUB_ICONS: Record<string, { path: string; color: string; label: string }> = {
  Base:     { path: "M10 2 L18 9 L18 18 L2 18 L2 9 Z M8 18 L8 12 L12 12 L12 18", color: "#00daf3", label: "BASE" },
  Depot:    { path: "M4 6 L10 2 L16 6 L16 14 L14 14 L14 10 L12 10 L12 14 L8 14 L8 10 L6 10 L6 14 L4 14 Z M3 16 L17 16 L17 18 L3 18 Z", color: "#ffb74d", label: "DEPOT" },
  Airport:  { path: "M10 2 L11 8 L18 10 L11 12 L10 18 L9 12 L2 10 L9 8 Z", color: "#80cbc4", label: "AIRPORT" },
  Factory:  { path: "M2 18 L2 10 L6 8 L6 10 L10 8 L10 10 L14 8 L14 10 L18 8 L18 18 Z M4 14 L6 14 L6 16 L4 16 Z M8 14 L10 14 L10 16 L8 16 Z M12 14 L14 14 L14 16 L12 16 Z", color: "#ef9a9a", label: "FACTORY" },
  Hospital: { path: "M6 2 L14 2 L14 6 L18 6 L18 14 L14 14 L14 18 L6 18 L6 14 L2 14 L2 6 L6 6 Z", color: "#f48fb1", label: "HOSPITAL" },
  Port:     { path: "M10 2 L10 8 M7 8 L13 8 M4 10 L16 10 M3 12 L17 12 Q17 18 10 18 Q3 18 3 12", color: "#90caf9", label: "PORT" },
  Hub_N:    { path: "M10 3 L15 17 L10 13 L5 17 Z", color: "#00daf3", label: "HUB N" },
  Hub_S:    { path: "M10 17 L5 3 L10 7 L15 3 Z", color: "#00daf3", label: "HUB S" },
  Hub_E:    { path: "M17 10 L3 5 L7 10 L3 15 Z", color: "#00daf3", label: "HUB E" },
  Hub_W:    { path: "M3 10 L17 5 L13 10 L17 15 Z", color: "#00daf3", label: "HUB W" },
  Hub_NE:   { path: "M14 4 L16 4 L16 6 L8 14 L6 12 Z", color: "#00daf3", label: "HUB NE" },
  Hub_SE:   { path: "M14 16 L16 16 L16 14 L8 6 L6 8 Z", color: "#00daf3", label: "HUB SE" },
  Hub_SW:   { path: "M6 16 L4 16 L4 14 L12 6 L14 8 Z", color: "#00daf3", label: "HUB SW" },
};

const STATUS_COLORS: Record<string, string> = {
  Normal: "#00daf3",
  Warning: "#ffd799",
  Critical: "#ffb4ab",
};

/* ═══════════════════════════════════════════════════════════
   MEMOISED STATIC LAYER — roads, intersections, hubs
   Never re-renders when vehicles move
   ═══════════════════════════════════════════════════════════ */
const StaticMapLayer = React.memo(function StaticMapLayer() {
  return (
    <>
      {/* Roads */}
      {ROAD_EDGES.map((edge, i) => {
        const n1 = ROAD_NODES[edge.from];
        const n2 = ROAD_NODES[edge.to];
        if (!n1 || !n2) return null;

        let color = "#3b494c", dash = "none", w = 0.35, op = 0.4;
        if (edge.terrain === "Highway") { color = "#4db8c7"; w = 0.6; op = 0.5; }
        else if (edge.terrain === "Offroad") { color = "#a08060"; dash = "1 2.5"; w = 0.3; op = 0.3; }
        else { color = "#4a5a6a"; w = 0.35; op = 0.32; }

        const off = laneOffset(n1.x, n1.y, n2.x, n2.y, LANE_OFFSET_PX);
        return (
          <g key={i}>
            <line x1={n1.x + off.ox} y1={n1.y + off.oy} x2={n2.x + off.ox} y2={n2.y + off.oy}
              stroke={color} strokeWidth={w} strokeDasharray={dash} opacity={op} strokeLinecap="round" />
            <line x1={n1.x - off.ox} y1={n1.y - off.oy} x2={n2.x - off.ox} y2={n2.y - off.oy}
              stroke={color} strokeWidth={w * 0.7} strokeDasharray={dash} opacity={op * 0.5} strokeLinecap="round" />
          </g>
        );
      })}

      {/* Intersection dots */}
      {Object.values(ROAD_NODES).map((node) =>
        !node.isHub ? (
          <circle key={`d-${node.id}`} cx={node.x} cy={node.y} r="0.4" fill="#4a5a6a" opacity="0.18" />
        ) : null
      )}

      {/* Hub icons */}
      {Object.values(ROAD_NODES)
        .filter((n) => n.isHub)
        .map((node) => {
          const hub = HUB_ICONS[node.id];
          if (!hub) return null;
          const isDepot = node.id === "Depot";
          const isSpecial = ["Port", "Airport", "Factory", "Hospital"].includes(node.id);
          const s = isDepot ? 5 : isSpecial ? 4.5 : 3.5;

          return (
            <g key={`hub-${node.id}`}>
              {/* Soft glow — simple circle, no filter */}
              <circle cx={node.x} cy={node.y} r={s + 2} fill={hub.color} opacity="0.06" />
              {/* Background */}
              <circle cx={node.x} cy={node.y} r={s + 0.5}
                fill="rgba(10,15,25,0.75)" stroke={hub.color} strokeWidth="0.2" opacity="0.9" />
              {/* Icon */}
              <g transform={`translate(${node.x - s}, ${node.y - s}) scale(${(s * 2) / 20})`}>
                <path d={hub.path} fill={hub.color} opacity="0.85" stroke={hub.color} strokeWidth="0.2" strokeLinejoin="round" />
              </g>
              {/* Label */}
              <text x={node.x} y={node.y + s + 2.8}
                textAnchor="middle" fill={hub.color} fontSize="2" fontWeight="bold"
                fontFamily="system-ui, sans-serif" opacity="0.6" letterSpacing="0.12">
                {hub.label}
              </text>
            </g>
          );
        })}
    </>
  );
});

/* ═══════════════════════════════════════════════════════════
   SINGLE VEHICLE — uses CSS transform for smooth animation
   ═══════════════════════════════════════════════════════════ */
function VehicleMarker({ v, isSelected, onSelect }: {
  v: Vehicle; isSelected: boolean; onSelect: () => void;
}) {
  const inMaint = v.maintenanceWaitRemaining > 0;
  const off = v.isMoving && v.path.length > 0
    ? laneOffset(v.location.x, v.location.y, v.path[0].x, v.path[0].y, LANE_OFFSET_PX)
    : { ox: 0, oy: 0 };

  const rx = v.location.x + off.ox;
  const ry = v.location.y + off.oy;
  const fill = STATUS_COLORS[v.status] || "#00daf3";
  const arrowScale = isSelected ? 0.32 : 0.22;

  return (
    <g
      style={{
        cursor: "pointer",
        /* ── THE KEY: CSS transition makes the browser smoothly
           interpolate position & rotation at 60fps between ticks ── */
        transform: `translate(${rx}px, ${ry}px)`,
        transition: `transform ${TICK_MS}ms linear`,
        opacity: inMaint ? 0.4 : 1,
      }}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
    >
      {/* Soft glow — simple radial, no filter */}
      <circle cx={0} cy={0} r={isSelected ? 6 : 4} fill={fill} opacity={isSelected ? 0.12 : 0.07} />

      {/* Selection pulse */}
      {isSelected && (
        <circle cx={0} cy={0} r="5" stroke={fill} strokeWidth="0.2" fill="none" opacity="0.25">
          <animate attributeName="r" values="4;7;4" dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.25;0.05;0.25" dur="2s" repeatCount="indefinite" />
        </circle>
      )}

      {/* Arrow — rotation also smoothly transitions */}
      <g style={{
        transform: `rotate(${v.heading + 90}deg) scale(${arrowScale})`,
        transition: `transform ${TICK_MS * 0.8}ms ease-out`,
        transformOrigin: "0 0",
      }}>
        <path d="M0 -10 L7 8 L0 4 L-7 8 Z"
          fill={fill} stroke="rgba(0,0,0,0.35)" strokeWidth="0.5" strokeLinejoin="round" />
        <path d="M0 -7 L4 5 L0 2.5 L-4 5 Z"
          fill="rgba(255,255,255,0.12)" />
      </g>

      {/* Label */}
      <rect x={-5.5} y={isSelected ? 4 : 3.2}
        width="11" height={isSelected ? "4.5" : "3.5"} rx="0.7"
        fill="rgba(10,15,25,0.82)" stroke="rgba(255,255,255,0.05)" strokeWidth="0.1" />
      <text x={0} y={isSelected ? 6 : 5}
        textAnchor="middle" fill={fill} fontSize="1.8" fontWeight="bold" fontFamily="system-ui">
        {inMaint ? "⚙ MAINT" : v.name}
      </text>
      {v.rul !== null && !inMaint && isSelected && (
        <text x={0} y={8} textAnchor="middle" fill={fill} fontSize="1.3" opacity="0.55" fontFamily="system-ui">
          RUL {v.rul.toFixed(0)}
        </text>
      )}

      {/* Critical ring */}
      {v.status === "Critical" && !inMaint && (
        <circle cx={0} cy={0} r="5" stroke="#ffb4ab" strokeWidth="0.15" fill="none" strokeDasharray="0.8 1.6">
          <animate attributeName="opacity" values="0.5;0.1;0.5" dur="1s" repeatCount="indefinite" />
        </circle>
      )}
    </g>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN MAP COMPONENT
   ═══════════════════════════════════════════════════════════ */
export default function OperationsMap({
  vehicles,
  selectedId,
  onSelect,
}: {
  vehicles: Vehicle[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    isPanning.current = true;
    lastMouse.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning.current) return;
    const dx = e.clientX - lastMouse.current.x;
    const dy = e.clientY - lastMouse.current.y;
    lastMouse.current = { x: e.clientX, y: e.clientY };
    setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
  }, []);

  const handleMouseUp = useCallback(() => { isPanning.current = false; }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((prev) => {
      const next = e.deltaY < 0 ? prev + ZOOM_STEP : prev - ZOOM_STEP;
      return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next));
    });
  }, []);

  const zoomIn = useCallback(() => setZoom((prev) => Math.min(MAX_ZOOM, prev + ZOOM_STEP)), []);
  const zoomOut = useCallback(() => setZoom((prev) => Math.max(MIN_ZOOM, prev - ZOOM_STEP)), []);
  const resetView = useCallback(() => { setZoom(1); setPan({ x: 0, y: 0 }); }, []);

  useEffect(() => {
    if (selectedId === null || !containerRef.current) return;
    const sv = vehicles.find((v) => v.id === selectedId);
    if (!sv) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mapScale = (Math.min(rect.width, rect.height) * 0.85) / (MAP_SIZE + MARGIN * 2);
    const offsetX = (rect.width - (MAP_SIZE + MARGIN * 2) * mapScale) / 2;
    const offsetY = (rect.height - (MAP_SIZE + MARGIN * 2) * mapScale) / 2;
    const vx = offsetX + (sv.location.x + MARGIN) * mapScale;
    const vy = offsetY + (sv.location.y + MARGIN) * mapScale;
    setPan({ x: rect.width / 2 - vx * zoom, y: rect.height / 2 - vy * zoom });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const VB_MIN = -MARGIN;
  const VB_SIZE = MAP_SIZE + MARGIN * 2;

  /* Route paths + detour visualization */
  const routePaths = useMemo(() => {
    const elements: React.ReactElement[] = [];

    vehicles.forEach((v) => {
      const isSel = selectedId === v.id;

      /* ── Abandoned original path (faint red dotted) ── */
      if (v.originalPath && v.originalPath.length > 0 && v.mission?.status === "Aborted" && isSel) {
        // Draw from current location to original destination via originalPath
        const origD = v.originalPath.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(" ");
        elements.push(
          <path
            key={`orig-${v.id}`} d={origD}
            stroke="#ff6b6b" strokeWidth="0.6" strokeDasharray="1.5 3"
            opacity={0.35} fill="none"
          />
        );
      }

      /* ── Active/detour route ── */
      if (v.path && v.path.length > 0 && v.isMoving) {
        const points = [{ x: v.location.x, y: v.location.y }, ...v.path];
        const pathD = points.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(" ");
        const isDetour = v.mission?.status === "Aborted";

        elements.push(
          <path
            key={`route-${v.id}`} d={pathD}
            stroke={isDetour ? "#ffb74d" : (STATUS_COLORS[v.status] || "#00daf3")}
            strokeWidth={isSel ? (isDetour ? "1.0" : "0.8") : "0.5"}
            strokeDasharray={isDetour ? "3 2" : "2 3"}
            opacity={isSel ? (isDetour ? 0.8 : 0.6) : 0.15}
            fill="none"
          >
            {/* Pulsing animation for detour routes */}
            {isDetour && isSel && (
              <animate attributeName="opacity" values="0.8;0.3;0.8" dur="1.5s" repeatCount="indefinite" />
            )}
          </path>
        );
      }
    });

    return elements;
  }, [vehicles, selectedId]);

  return (
    <section
      ref={containerRef}
      className="flex-1 relative bg-surface-container-lowest grid-overlay overflow-hidden select-none"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    >
      <div
        className="absolute inset-0"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: "0 0",
          transition: isPanning.current ? "none" : "transform 0.15s ease-out",
        }}
      >
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox={`${VB_MIN} ${VB_MIN} ${VB_SIZE} ${VB_SIZE}`}
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Static map — memoised, never re-renders */}
          <StaticMapLayer />

          {/* Route lines */}
          {routePaths}

          {/* Vehicles — each uses CSS transitions for smooth 60fps movement */}
          {vehicles.map((v) => (
            <VehicleMarker
              key={v.id}
              v={v}
              isSelected={selectedId === v.id}
              onSelect={() => onSelect(v.id)}
            />
          ))}
        </svg>
      </div>

      {/* HUD: Title */}
      <div className="absolute top-6 left-6 z-10 glass-panel px-4 py-2 rounded-lg border-primary/20">
        <h3 className="font-headline font-bold uppercase tracking-[0.2em] text-xs text-primary flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
          Operations Map — Live
        </h3>
      </div>

      {/* HUD: Zoom */}
      <div className="absolute top-6 right-6 z-10 glass-panel px-3 py-1.5 rounded-lg border-outline-variant/15">
        <span className="text-[10px] text-outline tabular-nums">Zoom: {(zoom * 100).toFixed(0)}%</span>
      </div>

      {/* HUD: Legend */}
      <div className="absolute bottom-6 right-6 glass-panel p-3 rounded-xl space-y-1.5 border-outline-variant/15 text-[10px] uppercase font-medium tracking-wider z-10">
        <div className="flex gap-3 mb-1.5 pb-1.5 border-b border-white/5">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-[#4db8c7]" />
            <span className="text-[7px] text-outline">HWY</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-[#4a5a6a]" />
            <span className="text-[7px] text-outline">Urban</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 border-t border-dashed border-[#a08060]" />
            <span className="text-[7px] text-outline">Offroad</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <svg width="10" height="10" viewBox="-8 -10 16 20"><path d="M0 -10 L7 8 L0 4 L-7 8 Z" fill="#00daf3" /></svg>
          <span className="text-on-surface/70 text-[8px]">Optimal</span>
        </div>
        <div className="flex items-center gap-2">
          <svg width="10" height="10" viewBox="-8 -10 16 20"><path d="M0 -10 L7 8 L0 4 L-7 8 Z" fill="#ffd799" /></svg>
          <span className="text-on-surface/70 text-[8px]">Warning</span>
        </div>
        <div className="flex items-center gap-2">
          <svg width="10" height="10" viewBox="-8 -10 16 20"><path d="M0 -10 L7 8 L0 4 L-7 8 Z" fill="#ffb4ab" /></svg>
          <span className="text-on-surface/70 text-[8px]">Critical</span>
        </div>
      </div>

      {/* HUD: Zoom controls */}
      <div className="absolute bottom-6 left-6 flex flex-col gap-2 z-10">
        <button onClick={zoomIn}
          className="w-9 h-9 glass-panel rounded-lg flex items-center justify-center hover:bg-primary/10 transition-colors text-primary">
          <span className="material-symbols-outlined text-[18px]" data-icon="add">add</span>
        </button>
        <button onClick={zoomOut}
          className="w-9 h-9 glass-panel rounded-lg flex items-center justify-center hover:bg-primary/10 transition-colors text-primary">
          <span className="material-symbols-outlined text-[18px]" data-icon="remove">remove</span>
        </button>
        <button onClick={resetView}
          className="w-9 h-9 glass-panel rounded-lg flex items-center justify-center hover:bg-primary/10 transition-colors text-primary">
          <span className="material-symbols-outlined text-[18px]" data-icon="my_location">my_location</span>
        </button>
      </div>
    </section>
  );
}
