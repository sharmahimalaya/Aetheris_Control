"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import type { SensorReading } from "../../types/fleet";

interface LiveSensorChartProps {
  data: SensorReading[];
  title: string;
}

export default function LiveSensorChart({ data, title }: LiveSensorChartProps) {
  // Only show last 30 readings for a clean view
  const recent = data.slice(-30);
  const chartData = recent.map((d) => ({
    t: d.time,
    Temp: +d.temperature.toFixed(1),
    Vibration: +(d.vibration * 100).toFixed(1),
    Speed: +d.speed.toFixed(1),
  }));

  return (
    <div>
      {title && <h3 className="chart-title">{title}</h3>}
      <ResponsiveContainer width="100%" height={140}>
        <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis
            dataKey="t"
            tick={{ fontSize: 8, fill: "rgba(255,255,255,0.3)" }}
            stroke="rgba(255,255,255,0.06)"
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 8, fill: "rgba(255,255,255,0.3)" }}
            stroke="rgba(255,255,255,0.06)"
            tickLine={false}
            axisLine={false}
            domain={[0, 'auto']}
          />
          <Tooltip
            contentStyle={{
              background: "rgba(10,15,25,0.95)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "8px",
              fontSize: "10px",
              boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            }}
            labelStyle={{ color: "rgba(255,255,255,0.5)", fontSize: "9px" }}
          />
          <Line
            type="monotone"
            dataKey="Temp"
            stroke="#f97316"
            strokeWidth={1.5}
            dot={false}
            animationDuration={200}
          />
          <Line
            type="monotone"
            dataKey="Vibration"
            stroke="#8b5cf6"
            strokeWidth={1.5}
            dot={false}
            animationDuration={200}
          />
          <Line
            type="monotone"
            dataKey="Speed"
            stroke="#06b6d4"
            strokeWidth={1.5}
            dot={false}
            animationDuration={200}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
