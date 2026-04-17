"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { motion } from "motion/react";

const TABS = [
  { key: "active", label: "재직자" },
  { key: "retired", label: "퇴직자" },
  { key: "worksites", label: "사업장별" },
  { key: "comp", label: "연봉" },
  { key: "hiring", label: "채용" },
] as const;

export function CompanyTabs({ companyId }: { companyId: string }) {
  const pathname = usePathname();
  const sp = useSearchParams();
  const current = sp.get("tab") ?? "active";
  return (
    <div className="flex overflow-x-auto gap-1 border-b border-[var(--border)] pb-0.5">
      {TABS.map((t) => {
        const active = current === t.key;
        const href = `/companies/${companyId}?tab=${t.key}`;
        return (
          <Link
            key={t.key}
            href={href}
            scroll={false}
            className={`relative px-3 py-2 text-sm whitespace-nowrap ${
              active ? "text-[var(--brand)] font-medium" : "text-[var(--fg-muted)] hover:text-[var(--fg)]"
            }`}
            aria-current={active ? "page" : undefined}
            data-pathname={pathname}
          >
            {t.label}
            {active && (
              <motion.span
                layoutId="company-tab-underline"
                className="absolute left-0 right-0 -bottom-0.5 h-0.5 bg-[var(--brand)]"
              />
            )}
          </Link>
        );
      })}
    </div>
  );
}
