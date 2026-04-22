import type { ReactNode } from "react";

export function Collapsible({
  title,
  description,
  defaultOpen = false,
  children,
}: {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details className="card" open={defaultOpen}>
      <summary className="flex items-center justify-between px-4 md:px-5 py-3 cursor-pointer list-none select-none group">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-widest font-semibold text-[var(--fg-subtle)]">
            상세 보기
          </div>
          <div className="text-sm md:text-base font-semibold tracking-tight">
            {title}
          </div>
          {description ? (
            <div className="text-[11px] text-[var(--fg-subtle)] mt-0.5">{description}</div>
          ) : null}
        </div>
        <div className="text-xs text-[var(--fg-subtle)] group-open:rotate-180 transition-transform">
          ▾
        </div>
      </summary>
      <div className="px-4 md:px-5 pb-4 md:pb-5 pt-1 border-t border-[var(--border)]">
        {children}
      </div>
    </details>
  );
}
