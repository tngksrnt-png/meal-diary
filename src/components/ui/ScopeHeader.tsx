export type Crumb = { label: string; sub?: string };

export function ScopeHeader({
  crumbs,
  counts,
}: {
  crumbs: Crumb[];
  counts?: { label: string; value: string }[];
}) {
  return (
    <div className="flex items-end justify-between gap-4 flex-wrap">
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap text-[var(--fg-muted)] text-[11px] uppercase tracking-widest font-semibold">
          {crumbs.slice(0, -1).map((c, i) => (
            <span key={i} className="flex items-center gap-2">
              <span>{c.label}</span>
              <span className="text-[var(--fg-subtle)]">›</span>
            </span>
          ))}
          <span className="text-[var(--fg)]">{crumbs[crumbs.length - 1]?.label ?? ""}</span>
        </div>
        <h1 className="text-xl md:text-2xl font-semibold tracking-tight leading-tight mt-1">
          {crumbs[crumbs.length - 1]?.label}
          {crumbs[crumbs.length - 1]?.sub ? (
            <span className="text-[var(--fg-muted)] font-normal text-sm md:text-base ml-2">
              · {crumbs[crumbs.length - 1]?.sub}
            </span>
          ) : null}
        </h1>
      </div>
      {counts?.length ? (
        <div className="flex items-center gap-4">
          {counts.map((c) => (
            <div key={c.label} className="text-right">
              <div className="label-eyebrow">{c.label}</div>
              <div className="text-lg font-semibold num">{c.value}</div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
