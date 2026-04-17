export function SectionHeader({
  title,
  description,
  right,
}: {
  title: string;
  description?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4 pb-3">
      <div>
        <h2 className="text-base md:text-lg font-semibold tracking-tight">{title}</h2>
        {description ? (
          <p className="text-xs text-[var(--fg-muted)] mt-0.5">{description}</p>
        ) : null}
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}
