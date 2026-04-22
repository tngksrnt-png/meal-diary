"use client";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

export type TrendPoint = { x: string; y: number };

export type SeriesPoint = { x: string } & Record<string, number | string>;
export type SeriesDef = { key: string; label: string; color: string };

export function TrendLine({
  data,
  color = "#3b82f6",
  series,
  multiData,
  height = 208,
  yLabel = "명",
}: {
  /** Single-series shorthand */
  data?: TrendPoint[];
  color?: string;
  /** Multi-series mode — pass `series` definitions and `multiData` rows */
  series?: SeriesDef[];
  multiData?: SeriesPoint[];
  height?: number;
  yLabel?: string;
}) {
  const isMulti = !!(series && multiData);
  const chartData: SeriesPoint[] = isMulti
    ? (multiData ?? [])
    : (data ?? []).map((p) => ({ x: p.x, y: p.y }));

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="x"
            stroke="var(--fg-subtle)"
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "var(--border)" }}
          />
          <YAxis
            stroke="var(--fg-subtle)"
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
            }}
            labelStyle={{ color: "var(--fg-muted)" }}
            formatter={(val, name) => [`${Number(val).toLocaleString()}${yLabel}`, String(name)]}
          />
          {isMulti && <Legend wrapperStyle={{ fontSize: 11 }} />}
          {isMulti
            ? series!.map((s) => (
                <Line
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  name={s.label}
                  stroke={s.color}
                  strokeWidth={2}
                  dot={{ r: 2.5, fill: s.color }}
                  activeDot={{ r: 4 }}
                />
              ))
            : (
              <Line
                type="monotone"
                dataKey="y"
                name="값"
                stroke={color}
                strokeWidth={2}
                dot={{ r: 3, fill: color }}
                activeDot={{ r: 5 }}
              />
            )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
