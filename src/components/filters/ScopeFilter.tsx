"use client";
import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export type Category = { id: string; code: string; name: string };
export type Company = { id: string; category_id: string; name: string };
export type Worksite = { id: string; company_id: string; name: string };

export function ScopeFilter({
  categories,
  companies,
  worksites,
}: {
  categories: Category[];
  companies: Company[];
  worksites: Worksite[];
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const bu = sp.get("bu") ?? "";
  const company = sp.get("company") ?? "";
  const worksite = sp.get("worksite") ?? "";

  const filteredCompanies = useMemo(
    () => (bu ? companies.filter((c) => c.category_id === bu) : companies),
    [bu, companies],
  );
  const filteredWorksites = useMemo(
    () => (company ? worksites.filter((w) => w.company_id === company) : []),
    [company, worksites],
  );

  function push(patch: { bu?: string; company?: string; worksite?: string }) {
    const next = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    router.push(`/?${next.toString()}`, { scroll: false });
  }

  const scopeLabel =
    worksite
      ? worksites.find((w) => w.id === worksite)?.name
      : company
      ? companies.find((c) => c.id === company)?.name
      : bu
      ? categories.find((c) => c.id === bu)?.name
      : "전체 그룹";

  const badgeColor = worksite
    ? "bg-[var(--accent-soft)] text-[var(--accent)]"
    : company
    ? "bg-[var(--brand-soft)] text-[var(--brand)]"
    : "bg-[var(--muted)] text-[var(--fg-muted)]";

  return (
    <div className="card px-3 md:px-4 py-3 flex flex-col md:flex-row md:items-center gap-3">
      <div className="flex items-center gap-2">
        <span className="label-eyebrow">Selected</span>
        <span className={`text-xs font-medium rounded-sm px-2 py-0.5 ${badgeColor}`}>
          {scopeLabel}
        </span>
        {(bu || company || worksite) && (
          <button
            onClick={() => push({ bu: "", company: "", worksite: "" })}
            className="btn !py-0.5 !px-2 !text-[11px]"
            type="button"
          >
            ✕ 초기화
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:ml-auto md:min-w-[520px]">
        <select
          value={bu}
          onChange={(e) => push({ bu: e.target.value, company: "", worksite: "" })}
          className="rounded-sm border border-[var(--border)] px-2 py-1.5 text-sm bg-[var(--surface)]"
        >
          <option value="">전체 BU</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={company}
          onChange={(e) => push({ company: e.target.value, worksite: "" })}
          className="rounded-sm border border-[var(--border)] px-2 py-1.5 text-sm bg-[var(--surface)]"
          disabled={filteredCompanies.length === 0}
        >
          <option value="">전체 법인</option>
          {filteredCompanies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={worksite}
          onChange={(e) => push({ worksite: e.target.value })}
          className="rounded-sm border border-[var(--border)] px-2 py-1.5 text-sm bg-[var(--surface)] disabled:opacity-50"
          disabled={!company || filteredWorksites.length === 0}
        >
          <option value="">전체 사업장</option>
          {filteredWorksites.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
