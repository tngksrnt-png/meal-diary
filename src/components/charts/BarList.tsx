"use client";
import { motion } from "motion/react";

export type BarListItem = {
  label: string;
  value: number;
  href?: string;
  color?: string;
  pct?: number; // optional pre-computed ratio (0..1)
};

export function BarList({
  items,
  max,
  valueSuffix = "",
  showPercent = false,
}: {
  items: BarListItem[];
  max?: number;
  valueSuffix?: string;
  showPercent?: boolean;
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
                <span className="text-[var(--fg)] break-keep">{it.label}</span>
                <span className="text-[var(--fg-muted)] tabular-nums">
                  {it.value.toLocaleString()}{valueSuffix}
                  {showPercent && typeof it.pct === "number" && (
                    <span className="ml-1 text-[var(--fg-subtle)]">
                      ({(it.pct * 100).toFixed(1)}%)
                    </span>
                  )}
                </span>
              </div>
              <div className="mt-1 h-2 w-full rounded-sm bg-[var(--muted)] overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${width}%` }}
                  transition={{ duration: 0.4, delay: idx * 0.02, ease: "easeOut" }}
                  style={{ backgroundColor: it.color ?? "var(--color-c1)" }}
                  className="h-full rounded-sm"
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
