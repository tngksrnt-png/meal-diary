"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export type WorksiteOption = { id: string; name: string };

export function WorksiteFilter({
  companyId,
  worksites,
}: {
  companyId: string;
  worksites: WorksiteOption[];
}) {
  const sp = useSearchParams();
  const tab = sp.get("tab") ?? "active";
  const current = sp.get("worksite") ?? "";

  const build = (ws: string) => {
    const p = new URLSearchParams();
    p.set("tab", tab);
    if (ws) p.set("worksite", ws);
    return `/companies/${companyId}?${p.toString()}`;
  };

  return (
    <div className="flex items-center gap-2 overflow-x-auto">
      <Link
        href={build("")}
        scroll={false}
        className={`text-xs rounded-full px-3 py-1 border whitespace-nowrap transition-colors ${
          current === ""
            ? "bg-[var(--brand)] text-white border-[var(--brand)]"
            : "border-[var(--border)] text-[var(--fg-muted)] hover:text-[var(--fg)]"
        }`}
      >
        전체
      </Link>
      {worksites.map((w) => (
        <Link
          key={w.id}
          href={build(w.id)}
          scroll={false}
          className={`text-xs rounded-full px-3 py-1 border whitespace-nowrap transition-colors ${
            current === w.id
              ? "bg-[var(--brand)] text-white border-[var(--brand)]"
              : "border-[var(--border)] text-[var(--fg-muted)] hover:text-[var(--fg)]"
          }`}
        >
          {w.name}
        </Link>
      ))}
    </div>
  );
}
