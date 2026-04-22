import type { ReactNode } from "react";

export function Panel({
  title,
  right,
  children,
  className = "",
  bodyClass = "",
  padBody = true,
}: {
  title: string;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClass?: string;
  padBody?: boolean;
}) {
  return (
    <section className={`card min-w-0 flex flex-col overflow-hidden ${className}`}>
      <header className="flex items-start justify-between gap-2 px-3.5 py-2.5 border-b border-[var(--border)] bg-[var(--muted)]/50">
        <h3 className="text-[13px] font-semibold tracking-tight leading-tight">
          {title}
        </h3>
        {right ? <div className="shrink-0">{right}</div> : null}
      </header>
      <div className={`${padBody ? "p-3.5" : ""} ${bodyClass} flex-1 min-w-0 min-h-0`}>
        {children}
      </div>
    </section>
  );
}
