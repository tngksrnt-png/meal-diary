"use client";
import Link from "next/link";
import { Fragment, useMemo, useState, useTransition, useEffect, type ReactNode } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { motion } from "motion/react";
import type { Database } from "@/types/database";
import { formatKRW, formatTenureYears } from "@/utils/format";
import { tenureMonths, totalCareerYears } from "@/utils/aggregations";

type Employee = Database["public"]["Tables"]["employees"]["Row"];
type Category = Database["public"]["Tables"]["categories"]["Row"];
type Company = Database["public"]["Tables"]["companies"]["Row"];
type Worksite = Database["public"]["Tables"]["worksites"]["Row"];
type Department = Database["public"]["Tables"]["departments"]["Row"];
type Lookup = Database["public"]["Tables"]["lookups"]["Row"];

const STATUSES: { key: "재직" | "휴직" | "퇴직"; label: string }[] = [
  { key: "재직", label: "재직자" },
  { key: "휴직", label: "휴직자" },
  { key: "퇴직", label: "퇴직자" },
];

type SortDir = "asc" | "desc";

type ColDef = {
  key: string;
  header: string;
  compact?: boolean;
  retiredOnly?: boolean;
  activeOnly?: boolean;
  cell: (e: Employee, ctx: Ctx) => ReactNode;
  numeric?: boolean;
  className?: string;
  /** Provide a comparable value for sort. If omitted, this column is not sortable. */
  sortValue?: (e: Employee, ctx: Ctx) => string | number | null;
};

type Ctx = {
  companyName: Map<string, string>;
  worksiteName: Map<string, string>;
  deptName: Map<string, string>;
  labelFor: (type: string, code: string | null) => string;
};

const COLS: ColDef[] = [
  {
    key: "no",
    header: "사번",
    compact: true,
    numeric: true,
    cell: (e) => e.employee_no ?? "-",
    sortValue: (e) => e.employee_no ?? "",
  },
  {
    key: "name",
    header: "이름",
    compact: true,
    cell: (e) => (
      <Link href={`/employees/${e.id}`} className="font-medium hover:underline">
        {e.name}
      </Link>
    ),
    sortValue: (e) => e.name,
  },
  {
    key: "company",
    header: "법인",
    compact: true,
    cell: (e, c) => c.companyName.get(e.company_id) ?? "-",
    sortValue: (e, c) => c.companyName.get(e.company_id) ?? "",
  },
  {
    key: "worksite",
    header: "사업장",
    cell: (e, c) => (e.worksite_id ? c.worksiteName.get(e.worksite_id) ?? "-" : "-"),
    sortValue: (e, c) => (e.worksite_id ? c.worksiteName.get(e.worksite_id) ?? "" : ""),
  },
  {
    key: "dept",
    header: "부서",
    compact: true,
    cell: (e, c) => (e.department_id ? c.deptName.get(e.department_id) ?? "-" : "-"),
    sortValue: (e, c) => (e.department_id ? c.deptName.get(e.department_id) ?? "" : ""),
  },
  {
    key: "rank",
    header: "직급",
    compact: true,
    cell: (e, c) => c.labelFor("rank", e.rank_code),
    sortValue: (e) => e.rank_code ?? "",
  },
  { key: "birth", header: "생년월일", numeric: true, cell: (e) => e.birth_date ?? "-", sortValue: (e) => e.birth_date ?? "" },
  {
    key: "hire",
    header: "입사일",
    compact: true,
    numeric: true,
    cell: (e) => e.hire_date ?? "-",
    sortValue: (e) => e.hire_date ?? "",
  },
  {
    key: "term",
    header: "퇴사일",
    retiredOnly: true,
    numeric: true,
    cell: (e) => e.termination_date ?? "-",
    sortValue: (e) => e.termination_date ?? "",
  },
  {
    key: "tenureRet",
    header: "재직기간",
    retiredOnly: true,
    compact: true,
    numeric: true,
    cell: (e) => formatTenureYears(tenureMonths(e.hire_date, e.termination_date)),
    sortValue: (e) => tenureMonths(e.hire_date, e.termination_date) ?? -1,
  },
  {
    key: "tenureAct",
    header: "근속(년)",
    activeOnly: true,
    compact: true,
    numeric: true,
    cell: (e) => formatTenureYears(tenureMonths(e.hire_date)),
    sortValue: (e) => tenureMonths(e.hire_date) ?? -1,
  },
  { key: "gender", header: "성별", cell: (e) => e.gender ?? "-", sortValue: (e) => e.gender ?? "" },
  {
    key: "emp",
    header: "고용형태",
    compact: true,
    cell: (e, c) => c.labelFor("employment_type", e.employment_type_code),
    sortValue: (e) => e.employment_type_code ?? "",
  },
  { key: "ntype", header: "내/외국", cell: (e) => e.nationality_type ?? "-", sortValue: (e) => e.nationality_type ?? "" },
  { key: "nation", header: "국적", cell: (e) => e.nationality ?? "-", sortValue: (e) => e.nationality ?? "" },
  { key: "acc", header: "회계", cell: (e, c) => c.labelFor("accounting_type", e.accounting_type_code), sortValue: (e) => e.accounting_type_code ?? "" },
  { key: "fam", header: "직군", cell: (e, c) => c.labelFor("job_family", e.job_family_code), sortValue: (e) => e.job_family_code ?? "" },
  {
    key: "salary",
    header: "연봉",
    compact: true,
    numeric: true,
    cell: (e) => (e.annual_salary ? formatKRW(e.annual_salary) : "-"),
    sortValue: (e) => e.annual_salary ?? -1,
  },
  { key: "ch", header: "채용경로", cell: (e, c) => c.labelFor("hire_channel", e.hire_channel_code) },
  { key: "edu", header: "최종학력", cell: (e, c) => c.labelFor("education", e.education_code) },
  { key: "preCar", header: "입사전(년)", numeric: true, cell: (e) => e.career_before_join_years ?? "-", sortValue: (e) => e.career_before_join_years ?? -1 },
  {
    key: "totCar",
    header: "총경력(년)",
    numeric: true,
    cell: (e) => {
      const y = totalCareerYears(e.career_before_join_years, e.hire_date, e.termination_date);
      return y == null ? "-" : y.toFixed(1);
    },
    sortValue: (e) => totalCareerYears(e.career_before_join_years, e.hire_date, e.termination_date) ?? -1,
  },
  {
    key: "reason",
    header: "퇴직사유",
    retiredOnly: true,
    compact: true,
    cell: (e, c) => c.labelFor("termination_reason", e.termination_reason_code),
    sortValue: (e) => e.termination_reason_code ?? "",
  },
  {
    key: "memo",
    header: "비고",
    compact: true,
    className: "max-w-[160px] truncate",
    cell: (e) => e.memo ?? "",
  },
];

function compareValues(a: string | number | null, b: string | number | null, dir: SortDir): number {
  // null/-1/empty always go to the bottom regardless of direction
  const aEmpty = a == null || a === "" || (typeof a === "number" && a === -1);
  const bEmpty = b == null || b === "" || (typeof b === "number" && b === -1);
  if (aEmpty && bEmpty) return 0;
  if (aEmpty) return 1;
  if (bEmpty) return -1;
  let cmp: number;
  if (typeof a === "number" && typeof b === "number") cmp = a - b;
  else cmp = String(a).localeCompare(String(b), "ko");
  return dir === "asc" ? cmp : -cmp;
}

export function EmployeeListClient({
  rows,
  status,
  q,
  categories,
  companies,
  worksites,
  departments,
  lookups,
}: {
  rows: Employee[];
  status: "재직" | "휴직" | "퇴직";
  q: string;
  categories: Category[];
  companies: Company[];
  worksites: Worksite[];
  departments: Department[];
  lookups: Lookup[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [query, setQuery] = useState(q);
  const [pending, start] = useTransition();
  const [compact, setCompact] = useState(true);

  useEffect(() => {
    setQuery(q);
  }, [q]);

  const sortKey = sp.get("sort") ?? "";
  const sortDir = (sp.get("dir") ?? "asc") as SortDir;

  const ctx: Ctx = useMemo(
    () => ({
      companyName: new Map(companies.map((c) => [c.id, c.name])),
      worksiteName: new Map(worksites.map((w) => [w.id, w.name])),
      deptName: new Map(departments.map((d) => [d.id, d.name])),
      labelFor: (type: string, code: string | null) =>
        code ? lookups.find((l) => l.type === type && l.code === code)?.label ?? code : "-",
    }),
    [companies, worksites, departments, lookups],
  );

  // Order index lookups for hierarchical default sort
  const orderMaps = useMemo(() => {
    const company = new Map<string, Company>(companies.map((c) => [c.id, c]));
    const worksite = new Map<string, Worksite>(worksites.map((w) => [w.id, w]));
    const department = new Map<string, Department>(departments.map((d) => [d.id, d]));
    const category = new Map<string, Category>(categories.map((c) => [c.id, c]));
    const rankOrder = new Map<string, number>();
    lookups
      .filter((l) => l.type === "rank")
      .forEach((l, i) => rankOrder.set(l.code, l.order_idx ?? i));
    return { company, worksite, department, category, rankOrder };
  }, [categories, companies, worksites, departments, lookups]);

  const isRetired = status === "퇴직";
  const isCustomSort = !!sortKey;

  const visibleCols = useMemo(
    () =>
      COLS.filter((c) => {
        if (c.retiredOnly && !isRetired) return false;
        if (c.activeOnly && isRetired) return false;
        if (compact && !c.compact) return false;
        return true;
      }),
    [compact, isRetired],
  );

  const sortedRows = useMemo(() => {
    const list = [...rows];
    if (isCustomSort) {
      const col = COLS.find((c) => c.key === sortKey);
      if (col?.sortValue) {
        list.sort((a, b) => compareValues(col.sortValue!(a, ctx), col.sortValue!(b, ctx), sortDir));
        return list;
      }
    }
    // Default hierarchical sort
    const rankOf = (e: Employee): number[] => {
      const co = orderMaps.company.get(e.company_id);
      const cat = co ? orderMaps.category.get(co.category_id) : null;
      const ws = e.worksite_id ? orderMaps.worksite.get(e.worksite_id) : null;
      const dep = e.department_id ? orderMaps.department.get(e.department_id) : null;
      const rk = e.rank_code ? orderMaps.rankOrder.get(e.rank_code) ?? 999 : 999;
      return [
        cat?.order_idx ?? 9999,
        co?.order_idx ?? 9999,
        ws?.order_idx ?? 9999,
        dep?.order_idx ?? 9999,
        rk,
      ];
    };
    list.sort((a, b) => {
      const ar = rankOf(a);
      const br = rankOf(b);
      for (let i = 0; i < ar.length; i += 1) {
        if (ar[i]! !== br[i]!) return ar[i]! - br[i]!;
      }
      // Tie-break: 입사일 desc (recent first)
      return (b.hire_date ?? "").localeCompare(a.hire_date ?? "");
    });
    return list;
  }, [rows, isCustomSort, sortKey, sortDir, ctx, orderMaps]);

  function push(patch: Record<string, string>) {
    const next = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    start(() => router.push(`${pathname}?${next.toString()}`, { scroll: false }));
  }

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    push({ q: query.trim() });
  }

  function onHeaderClick(col: ColDef) {
    if (!col.sortValue) return;
    if (sortKey !== col.key) {
      push({ sort: col.key, dir: "asc" });
      return;
    }
    if (sortDir === "asc") {
      push({ dir: "desc" });
      return;
    }
    // Already desc → reset to default
    push({ sort: "", dir: "" });
  }

  function resetSort() {
    push({ sort: "", dir: "" });
  }

  const statusCounts: Record<string, number> = { 재직: 0, 휴직: 0, 퇴직: 0 };
  // Server pre-filters by status, so only current count is known here
  statusCounts[status] = rows.length;

  // Group header logic — only when default sort is active and not searching
  const showGroups = !isCustomSort && !q.trim();
  const groupedKeys = new Map<string, string>();
  if (showGroups) {
    for (const e of sortedRows) {
      const co = orderMaps.company.get(e.company_id);
      const cat = co ? orderMaps.category.get(co.category_id) : null;
      groupedKeys.set(e.id, `${cat?.id ?? "?"}:${co?.id ?? "?"}`);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex gap-0.5 border-b border-[var(--border)]">
          {STATUSES.map((s) => {
            const isActiveTab = s.key === status;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => push({ status: s.key })}
                className={`relative px-3.5 py-2 text-[11px] uppercase tracking-widest font-semibold ${
                  isActiveTab ? "text-[var(--fg)]" : "text-[var(--fg-subtle)] hover:text-[var(--fg-muted)]"
                }`}
              >
                {s.label}
                {isActiveTab && (
                  <>
                    <span className="ml-1.5 text-[10px] text-[var(--fg-muted)] num">
                      {statusCounts[s.key]?.toLocaleString()}
                    </span>
                    <motion.span
                      layoutId="emp-tab-underline"
                      className="absolute left-0 right-0 -bottom-px h-0.5 bg-[var(--fg)]"
                    />
                  </>
                )}
              </button>
            );
          })}
        </div>

        <form onSubmit={submitSearch} className="ml-auto flex gap-2 items-center">
          <a
            href={`/api/export/employees?${sp.toString()}`}
            className="btn !text-xs"
            title="현재 필터·검색 조건이 적용된 직원 명단을 엑셀로 다운로드"
          >
            📥 엑셀 다운로드
          </a>
          <button
            type="button"
            onClick={() => setCompact((v) => !v)}
            className="btn !text-xs"
            title={compact ? "전체 컬럼 보기" : "핵심 컬럼만 보기"}
          >
            {compact ? "전체 정보 표시" : "핵심만 보기"}
          </button>
          {isCustomSort && (
            <button type="button" onClick={resetSort} className="btn !text-xs" title="조직도 순서로 복귀">
              ↺ 기본순
            </button>
          )}
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="이름 · 사번 검색"
            className="rounded-sm border border-[var(--border)] px-2 py-1.5 text-sm bg-[var(--surface)] w-40 md:w-64"
          />
          <button type="submit" className="btn !text-xs" disabled={pending}>
            검색
          </button>
          {q && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                push({ q: "" });
              }}
              className="btn !text-xs"
            >
              ✕
            </button>
          )}
        </form>
      </div>

      <div className="text-xs text-[var(--fg-muted)] flex items-center gap-3 flex-wrap">
        <span>
          총 <b className="text-[var(--fg)] num">{rows.length.toLocaleString()}</b>명
          {q ? <> · &ldquo;{q}&rdquo; 검색</> : null}
        </span>
        <span className="text-[var(--fg-subtle)]">{compact ? `핵심 ${visibleCols.length}개 컬럼` : `전체 ${visibleCols.length}개 컬럼`}</span>
        <span className="text-[var(--fg-subtle)]">
          {isCustomSort
            ? `정렬: ${COLS.find((c) => c.key === sortKey)?.header} ${sortDir === "asc" ? "↑" : "↓"}`
            : "정렬: BU › 법인 › 사업장 › 부서 › 직급 (기본)"}
        </span>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-[13px]">
            <thead className="text-[var(--fg-muted)] bg-[var(--muted)]">
              <tr>
                {visibleCols.map((c) => {
                  const sortable = !!c.sortValue;
                  const active = sortable && sortKey === c.key;
                  return (
                    <th
                      key={c.key}
                      className={`py-2 px-3 font-medium whitespace-nowrap ${c.numeric ? "text-right" : "text-left"} ${
                        sortable ? "cursor-pointer select-none hover:text-[var(--fg)]" : ""
                      } ${active ? "text-[var(--fg)]" : ""}`}
                      onClick={() => onHeaderClick(c)}
                      title={sortable ? "정렬: 클릭(오름) → 다시(내림) → 다시(기본)" : undefined}
                    >
                      <span className="inline-flex items-center gap-1">
                        {c.header}
                        {sortable && (
                          <span className={`text-[10px] ${active ? "" : "opacity-30"}`}>
                            {active ? (sortDir === "asc" ? "▲" : "▼") : "↕"}
                          </span>
                        )}
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {(() => {
                const elements: ReactNode[] = [];
                let lastGroupKey: string | null = null;
                for (const e of sortedRows) {
                  if (showGroups) {
                    const gk = groupedKeys.get(e.id) ?? "";
                    if (gk !== lastGroupKey) {
                      lastGroupKey = gk;
                      const co = orderMaps.company.get(e.company_id);
                      const cat = co ? orderMaps.category.get(co.category_id) : null;
                      elements.push(
                        <tr key={`group-${gk}`} className="bg-[var(--muted)]/70">
                          <td
                            colSpan={visibleCols.length}
                            className="py-2 px-3 text-[12px] font-semibold text-[var(--fg-muted)] sticky left-0"
                          >
                            <span className="text-[var(--fg-subtle)]">
                              {cat?.name ?? "-"} <span className="px-1">›</span>
                            </span>
                            <span className="text-[var(--fg)]">{co?.name ?? "-"}</span>
                            {co?.ceo_name ? (
                              <span className="ml-2 text-[var(--fg-subtle)] font-normal">· {co.ceo_name}</span>
                            ) : null}
                          </td>
                        </tr>,
                      );
                    }
                  }
                  elements.push(
                    <tr
                      key={e.id}
                      className="border-t border-[var(--border)] hover:bg-[var(--muted)]/60 cursor-pointer"
                      onClick={() => router.push(`/employees/${e.id}`)}
                    >
                      {visibleCols.map((c) => (
                        <td
                          key={c.key}
                          className={`py-2 px-3 whitespace-nowrap ${c.numeric ? "text-right num" : ""} ${c.className ?? ""}`}
                        >
                          {c.cell(e, ctx)}
                        </td>
                      ))}
                    </tr>,
                  );
                }
                if (sortedRows.length === 0) {
                  elements.push(
                    <tr key="empty">
                      <td colSpan={visibleCols.length} className="py-10 text-center text-[var(--fg-muted)] text-sm">
                        조건에 맞는 {STATUSES.find((s) => s.key === status)?.label}가 없습니다.
                      </td>
                    </tr>,
                  );
                }
                return <Fragment>{elements}</Fragment>;
              })()}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
