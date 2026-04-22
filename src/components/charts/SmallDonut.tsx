"use client";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const PALETTE = ["#3b82f6", "#22c55e", "#f59e0b", "#ec4899", "#8b5cf6", "#06b6d4", "#f97316"];

export type SmallDonutDatum = { name: string; value: number };

export function SmallDonut({ data, centerLabel }: { data: SmallDonutDatum[]; centerLabel?: string }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) {
    return <div className="text-xs text-muted-auto py-6 text-center">데이터 없음</div>;
  }
  return (
    <div className="relative">
      <div className="h-36">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={38}
              outerRadius={58}
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
                borderRadius: 6,
                fontSize: 11,
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className="text-[10px] text-muted-auto">{centerLabel ?? "전체"}</div>
          <div className="text-base font-semibold num">{total.toLocaleString()}</div>
        </div>
      </div>
      <ul className="flex flex-wrap gap-x-3 gap-y-1 justify-center mt-2">
        {data.map((d, idx) => (
          <li key={d.name} className="flex items-center gap-1.5 text-[11px] text-muted-auto">
            <span
              className="inline-block h-2 w-2 rounded-sm"
              style={{ background: PALETTE[idx % PALETTE.length] }}
            />
            <span>{d.name}</span>
            <span className="num font-medium text-[var(--fg)]">{d.value}</span>
            <span className="text-subtle-auto">({((d.value / total) * 100).toFixed(1)}%)</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
