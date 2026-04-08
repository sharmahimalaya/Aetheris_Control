import React from "react";
import type { Vehicle } from "../../types/fleet";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Props {
  vehicles: Vehicle[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}

export default function FleetCommandPanel({
  vehicles,
  selectedId,
  onSelect,
}: Props) {
  return (
    <section className="w-80 h-full bg-surface-container-low/50 flex flex-col border-r border-outline-variant/10 overflow-hidden shrink-0">
      <div className="p-6 pb-4">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <span
              className="material-symbols-outlined text-primary text-lg"
              data-icon="satellite_alt"
            >
              satellite_alt
            </span>
            <h2 className="font-headline font-bold uppercase tracking-widest text-sm text-on-surface">
              Fleet Command
            </h2>
          </div>
        </div>
        <div className="relative group">
          <span
            className="material-symbols-outlined absolute left-3 top-2.5 text-outline text-lg"
            data-icon="search"
          >
            search
          </span>
          <input
            className="w-full bg-surface-container-lowest/50 border border-outline-variant/20 rounded-lg pl-10 pr-4 py-2 text-xs text-on-surface focus:ring-1 focus:ring-primary focus:border-primary placeholder:text-outline/50 outline-none transition-all"
            placeholder="Filter vehicles..."
            type="text"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 space-y-2 pb-10">
        {vehicles.map((v) => {
          const isSelected = selectedId === v.id;
          const statusColors = {
            Normal: "text-primary bg-primary/20",
            Warning: "text-secondary bg-secondary/20",
            Critical: "text-error bg-error/20",
          };
          const borderColors = {
            Normal: "border-primary/40",
            Warning: "border-secondary/40",
            Critical: "border-error/40",
          };
          const glowClasses = {
            Normal: "neon-glow-primary",
            Warning: "neon-glow-secondary",
            Critical: "neon-glow-error",
          };
          const iconColors = {
            Normal: "text-primary",
            Warning: "text-secondary",
            Critical: "text-error",
          };

          return (
            <div
              key={v.id}
              onClick={() => onSelect(v.id)}
              className={cn(
                "p-3 rounded-xl glass-panel transition-all cursor-pointer relative overflow-hidden group",
                isSelected
                  ? [borderColors[v.status], glowClasses[v.status]]
                  : "border-transparent hover:border-outline-variant/30",
                !isSelected && v.status === "Critical" && "border-error/40 neon-glow-error"
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "material-symbols-outlined",
                      isSelected ? iconColors[v.status] : "text-outline"
                    )}
                    data-icon="local_shipping"
                  >
                    local_shipping
                  </span>
                  <div>
                    <p
                      className={cn(
                        "text-xs font-bold font-headline tabular-nums",
                        isSelected ? "text-on-surface" : "text-on-surface/80"
                      )}
                    >
                      {v.name}
                    </p>
                    <p
                      className={cn(
                        "text-[10px] uppercase",
                        isSelected
                          ? `text-${v.status === "Normal" ? "primary" : v.status === "Warning" ? "secondary" : "error"}/70`
                          : "text-outline"
                      )}
                    >
                      {v.status === "Normal" ? "En Route" : v.status === "Warning" ? "Warning" : "Critical"}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span
                    className={cn(
                      "text-[9px] px-2 py-0.5 rounded-full uppercase font-bold tracking-tighter",
                      statusColors[v.status]
                    )}
                  >
                    {v.status}
                  </span>
                  <p
                    className={cn(
                      "text-[10px] mt-1 tabular-nums font-bold",
                      v.status === "Critical" ? "text-error" : "text-outline"
                    )}
                  >
                    RUL: {v.rul ? Math.round(v.rul) : "--"}h
                  </p>
                </div>
              </div>

              {isSelected && (
                <button
                  className={cn(
                    "w-full mt-2 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg",
                    v.status === "Normal"
                      ? "bg-gradient-to-r from-primary to-on-primary-container text-on-primary shadow-primary/20"
                      : v.status === "Warning"
                      ? "bg-gradient-to-r from-secondary to-on-secondary-container text-on-secondary shadow-secondary/20"
                      : "bg-gradient-to-r from-error to-error-container text-on-error shadow-error/20 text-white"
                  )}
                >
                  <span
                    className="material-symbols-outlined text-sm"
                    data-icon="bolt"
                  >
                    bolt
                  </span>
                  Track Vehicle
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
