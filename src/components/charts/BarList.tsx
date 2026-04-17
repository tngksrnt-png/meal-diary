"use client";
import { motion } from "motion/react";

export type BarListItem = {
  label: string;
  value: number;
  href?: string;
  color?: string;
};

export function BarList({
  items,
  max,
  valueFormatter = (n) => n.toLocaleString(),
}: {
  items: BarListItem[];
  max?: number;
  valueFormatter?: (n: number) => string;
}) {
  const top = max ?? Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="flex flex-col gap-2">
      {items.map((it, idx) => {
        const width = Math.max(1, Math.round((it.value / top) * 100));
        const bar = (
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate text-[var(--fg)]">{it.label}</span>
                <span className="text-[var(--fg-muted)] tabular-nums">
                  {valueFormatter(it.value)}
                </span>
              </div>
              <div className="mt-1 h-1.5 w-full rounded-full bg-[var(--muted)] overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${width}%` }}
                  transition={{ duration: 0.4, delay: idx * 0.02, ease: "easeOut" }}
                  style={{ backgroundColor: it.color ?? "var(--brand)" }}
                  className="h-full rounded-full"
                />
              </div>
            </div>
          </div>
        );
        return (
          <li key={`${it.label}-${idx}`}>
            {it.href ? (
              <a href={it.href} className="block hover:opacity-80 transition-opacity">
                {bar}
              </a>
            ) : (
              bar
            )}
          </li>
        );
      })}
    </ul>
  );
}
