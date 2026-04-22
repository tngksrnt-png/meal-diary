import type { ReactNode } from "react";

type Tone = "default" | "primary" | "brand" | "accent" | "warn" | "danger";

export function KpiCard({
  label,
  value,
  sub,
  tone = "default",
  accent,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: Tone;
  /** Small inline accent (e.g. secondary number block in first card) */
  accent?: { label: string; value: ReactNode };
}) {
  const isDark = tone === "primary";

  const cls = isDark
    ? "card-dark border border-[var(--dark-2)]"
    : "card";

  const numCls =
    isDark ? ""
    : tone === "brand" ? "text-[var(--brand)]"
    : tone === "accent" ? "text-[var(--accent)]"
    : tone === "warn" ? "text-[var(--warn)]"
    : tone === "danger" ? "text-[var(--danger)]"
    : "";

  return (
    <div className={`${cls} p-4 md:p-4 flex flex-col gap-1 relative`}>
      <div className="label-eyebrow">{label}</div>
      <div className="flex items-end justify-between gap-3">
        <div className={`text-2xl md:text-[28px] leading-none font-semibold tracking-tight num ${numCls}`}>
          {value}
        </div>
        {accent ? (
          <div className="text-right text-muted-auto">
            <div className="label-eyebrow">{accent.label}</div>
            <div className="text-sm font-semibold num leading-tight">{accent.value}</div>
          </div>
        ) : null}
      </div>
      {sub ? <div className="text-[11px] mt-1 text-subtle-auto">{sub}</div> : null}
    </div>
  );
}

export function KpiGrid({
  children,
  cols,
}: {
  children: ReactNode;
  /** Override md+ column count. Default = auto-fit (min 180px) so 4–7 cards balance well. */
  cols?: 3 | 4 | 5 | 6 | 7;
}) {
  if (cols) {
    const map: Record<number, string> = {
      3: "grid-cols-2 md:grid-cols-3",
      4: "grid-cols-2 md:grid-cols-4",
      5: "grid-cols-2 md:grid-cols-5",
      6: "grid-cols-2 md:grid-cols-3 lg:grid-cols-6",
      7: "grid-cols-2 md:grid-cols-4 lg:grid-cols-7",
    };
    return <div className={`grid ${map[cols]} gap-3`}>{children}</div>;
  }
  return (
    <div
      className="grid gap-3 grid-cols-2"
      style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}
    >
      {children}
    </div>
  );
}
