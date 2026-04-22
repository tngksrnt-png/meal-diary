"use client";
import { motion } from "motion/react";

export type RangeBarItem = {
  label: string;
  min: number;
  avg: number;
  max: number;
};

export type RangeBarFormat = "krw" | "count" | "plain";

function formatValue(n: number, fmt: RangeBarFormat): string {
  if (fmt === "krw") {
    if (n >= 1e8) return `${(n / 1e8).toFixed(2)}억원`;
    if (n >= 1e4) return `${Math.round(n / 1e4).toLocaleString()}만원`;
    return `${n.toLocaleString()}원`;
  }
  return n.toLocaleString();
}

export function RangeBar({
  items,
  format = "plain",
  scale,
}: {
  items: RangeBarItem[];
  format?: RangeBarFormat;
  /** [globalMin, globalMax] override */
  scale?: [number, number];
}) {
  const fmt = (n: number) => formatValue(n, format);
  const positive = items.filter((i) => i.max > 0);
  if (positive.length === 0) {
    return (
      <div className="text-xs text-[var(--fg-muted)] py-6 text-center">데이터 없음</div>
    );
  }
  const gMin = scale?.[0] ?? Math.min(...positive.map((i) => i.min));
  const gMax = scale?.[1] ?? Math.max(...positive.map((i) => i.max));
  const span = Math.max(1, gMax - gMin);
  const pos = (v: number) => ((v - gMin) / span) * 100;

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-2.5">
        {items.map((it, idx) => {
          if (it.max === 0) {
            return (
              <li key={`${it.label}-${idx}`} className="flex items-center gap-3 text-xs">
                <span className="w-16 text-[var(--fg-muted)] truncate">{it.label}</span>
                <span className="flex-1 text-[var(--fg-subtle)]">-</span>
              </li>
            );
          }
          const left = pos(it.min);
          const right = pos(it.max);
          const width = Math.max(1, right - left);
          const avgPos = pos(it.avg);
          return (
            <li key={`${it.label}-${idx}`} className="flex items-center gap-3">
              <span className="w-16 shrink-0 text-xs text-[var(--fg)] truncate">
                {it.label}
              </span>
              <div className="relative h-5 flex-1 rounded-md bg-[var(--muted)] overflow-visible">
                <motion.div
                  initial={{ width: 0, left: `${left}%` }}
                  animate={{ width: `${width}%`, left: `${left}%` }}
                  transition={{ duration: 0.4, delay: idx * 0.02 }}
                  className="absolute top-0 bottom-0 rounded-md bg-[var(--accent-soft)]"
                />
                <motion.div
                  initial={{ left: `${avgPos}%`, opacity: 0 }}
                  animate={{ left: `${avgPos}%`, opacity: 1 }}
                  transition={{ duration: 0.4, delay: idx * 0.02 + 0.15 }}
                  className="absolute top-0 bottom-0 w-0.5 bg-[var(--accent)]"
                  title={`평균 ${fmt(it.avg)}`}
                />
              </div>
              <span className="text-[11px] text-[var(--fg-muted)] tabular-nums whitespace-nowrap">
                {fmt(it.min)} · <b className="text-[var(--accent)]">{fmt(it.avg)}</b> · {fmt(it.max)}
              </span>
            </li>
          );
        })}
      </ul>
      <div className="flex items-center gap-4 text-[11px] text-[var(--fg-subtle)]">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-5 rounded bg-[var(--accent-soft)]" /> 범위 (최소~최대)
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-0.5 bg-[var(--accent)]" /> 평균
        </span>
      </div>
    </div>
  );
}
