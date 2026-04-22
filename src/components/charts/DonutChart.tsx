"use client";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const PALETTE = [
  "#3b82f6", "#22c55e", "#f59e0b", "#ec4899",
  "#8b5cf6", "#06b6d4", "#f97316",
];

export type DonutDatum = { name: string; value: number };

export function DonutChart({
  data,
  totalLabel,
}: {
  data: DonutDatum[];
  totalLabel?: string;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="relative h-56">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={55}
            outerRadius={85}
            paddingAngle={1}
            stroke="none"
          >
            {data.map((_, idx) => (
              <Cell key={idx} fill={PALETTE[idx % PALETTE.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(val, name) => [`${Number(val).toLocaleString()}명`, String(name)]}
            contentStyle={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <div className="text-xs text-muted-auto">{totalLabel ?? "합계"}</div>
        <div className="text-xl font-semibold tabular-nums">{total.toLocaleString()}</div>
      </div>
    </div>
  );
}
