import type { ReactNode } from "react";

export function KpiCard({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: "default" | "brand" | "accent" | "warn" | "danger";
}) {
  const toneClass =
    tone === "brand" ? "text-[var(--brand)]"
    : tone === "accent" ? "text-[var(--accent)]"
    : tone === "warn" ? "text-[var(--warn)]"
    : tone === "danger" ? "text-[var(--danger)]"
    : "text-[var(--fg)]";
  return (
    <div className="card p-4 md:p-5 flex flex-col gap-1">
      <div className="text-xs text-[var(--fg-muted)]">{label}</div>
      <div className={`text-2xl md:text-3xl font-semibold tracking-tight ${toneClass}`}>{value}</div>
      {sub ? <div className="text-xs text-[var(--fg-subtle)] mt-0.5">{sub}</div> : null}
    </div>
  );
}

export function KpiGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">{children}</div>;
}
