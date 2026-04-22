"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "motion/react";

const TABS = [
  { key: "active", label: "재직자" },
  { key: "retired", label: "퇴직자" },
  { key: "worksites", label: "사업장별" },
  { key: "comp", label: "연봉" },
  { key: "hiring", label: "채용" },
] as const;

export function ScopeTabs() {
  const sp = useSearchParams();
  const current = sp.get("tab") ?? "active";

  const hrefFor = (key: string) => {
    const next = new URLSearchParams(sp.toString());
    next.set("tab", key);
    return `/?${next.toString()}`;
  };

  return (
    <div className="flex overflow-x-auto gap-0.5 border-b border-[var(--border)]">
      {TABS.map((t) => {
        const active = current === t.key;
        return (
          <Link
            key={t.key}
            href={hrefFor(t.key)}
            scroll={false}
            className={`relative px-3.5 py-2.5 text-[11px] uppercase tracking-widest font-semibold whitespace-nowrap ${
              active
                ? "text-[var(--fg)]"
                : "text-[var(--fg-subtle)] hover:text-[var(--fg-muted)]"
            }`}
            aria-current={active ? "page" : undefined}
          >
            {t.label}
            {active && (
              <motion.span
                layoutId="scope-tab-underline"
                className="absolute left-0 right-0 -bottom-px h-0.5 bg-[var(--fg)]"
              />
            )}
          </Link>
        );
      })}
    </div>
  );
}
