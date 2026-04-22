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
    <div className="flex items-center justify-between gap-4 pb-3">
      <div className="flex flex-col gap-0.5 min-w-0">
        <div className="label-eyebrow opacity-70">
          {description ?? "\u00a0"}
        </div>
        <h2 className="text-sm md:text-base font-semibold tracking-tight leading-tight truncate">
          {title}
        </h2>
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}
