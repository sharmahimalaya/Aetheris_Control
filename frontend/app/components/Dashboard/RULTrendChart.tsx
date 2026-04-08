"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { RULDataPoint } from "../../types/fleet";

interface RULTrendChartProps {
  data: RULDataPoint[];
  title: string;
}

export default function RULTrendChart({ data, title }: RULTrendChartProps) {
  const chartData = data.map((d) => ({
    t: d.time,
    RUL: +d.rul.toFixed(1),
  }));

  return (
    <div className="chart-card">
      <h3 className="chart-title">{title}</h3>
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="rulGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--grid-color)" />
          <XAxis
            dataKey="t"
            tick={{ fontSize: 11, fill: "var(--text-secondary)" }}
            stroke="var(--grid-color)"
          />
          <YAxis
            tick={{ fontSize: 11, fill: "var(--text-secondary)" }}
            stroke="var(--grid-color)"
            domain={[0, 130]}
          />
          <Tooltip
            contentStyle={{
              background: "var(--card-bg)",
              border: "1px solid var(--border-color)",
              borderRadius: "8px",
              fontSize: "12px",
            }}
            labelStyle={{ color: "var(--text-primary)" }}
          />
          {/* Danger zone lines */}
          <ReferenceLine
            y={20}
            stroke="#ef4444"
            strokeDasharray="4 4"
            label={{
              value: "Critical",
              position: "insideTopRight",
              fill: "#ef4444",
              fontSize: 10,
            }}
          />
          <ReferenceLine
            y={60}
            stroke="#eab308"
            strokeDasharray="4 4"
            label={{
              value: "Warning",
              position: "insideTopRight",
              fill: "#eab308",
              fontSize: 10,
            }}
          />
          <Area
            type="monotone"
            dataKey="RUL"
            stroke="#10b981"
            strokeWidth={2}
            fill="url(#rulGradient)"
            dot={false}
            animationDuration={300}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
