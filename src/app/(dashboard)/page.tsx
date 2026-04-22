import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ScopeHeader } from "@/components/ui/ScopeHeader";
import { ScopeFilter } from "@/components/filters/ScopeFilter";
import { ScopeTabs } from "@/components/filters/ScopeTabs";
import { StickyToolbar } from "@/components/filters/StickyToolbar";
import { Panel } from "@/components/ui/Panel";
import { KpiCard, KpiGrid } from "@/components/kpi/KpiCard";
import { StatusTable, type StatusRow } from "@/components/tables/StatusTable";
import { SmallDonut } from "@/components/charts/SmallDonut";
import { TrendLine } from "@/components/charts/TrendLine";
import { BarList } from "@/components/charts/BarList";
import { ActiveTab } from "./companies/[id]/tabs/ActiveTab";
import { RetiredTab } from "./companies/[id]/tabs/RetiredTab";
import { WorksitesTab } from "./companies/[id]/tabs/WorksitesTab";
import { CompTab } from "./companies/[id]/tabs/CompTab";
import { HiringTab } from "./companies/[id]/tabs/HiringTab";
import { formatKRW, formatPercent, formatTenureYears } from "@/utils/format";
import { ageFromBirth, daysAgoIso, mean, tenureMonths, turnoverRate } from "@/utils/aggregations";
import type { Database } from "@/types/database";

export const dynamic = "force-dynamic";

type Employee = Database["public"]["Tables"]["employees"]["Row"];

function lastNMonths(n: number): string[] {
  const now = new Date();
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ bu?: string; company?: string; worksite?: string; tab?: string }>;
}) {
  const { bu = "", company = "", worksite = "", tab = "active" } = await searchParams;

  const supabase = await createClient();
  const [
    { data: categories },
    { data: companies },
    { data: worksitesAll },
    { data: departments },
    { data: lookups },
    { data: employeesAll },
  ] = await Promise.all([
    supabase.from("categories").select("*").order("order_idx"),
    supabase.from("companies").select("*").order("order_idx"),
    supabase.from("worksites").select("*").order("order_idx"),
    supabase.from("departments").select("*").order("order_idx"),
    supabase.from("lookups").select("*").order("order_idx"),
    supabase.from("employees").select("*"),
  ]);

  const cats = categories ?? [];
  const cos = companies ?? [];
  const wss = worksitesAll ?? [];
  const deps = departments ?? [];
  const lks = lookups ?? [];
  const empsAll = employeesAll ?? [];

  const scopedEmps: Employee[] = empsAll.filter((e) => {
    if (worksite) return e.worksite_id === worksite;
    if (company) return e.company_id === company;
    if (bu) {
      const buCompanyIds = new Set(cos.filter((c) => c.category_id === bu).map((c) => c.id));
      return buCompanyIds.has(e.company_id);
    }
    return true;
  });

  const scopeLevel: "group" | "bu" | "company" | "worksite" = worksite
    ? "worksite" : company ? "company" : bu ? "bu" : "group";

  const categoryObj = cats.find((c) => c.id === bu);
  const companyObj = cos.find((c) => c.id === company);
  const worksiteObj = wss.find((w) => w.id === worksite);

  const crumbs = [{ label: "ReNA 그룹" }];
  if (categoryObj || companyObj || worksiteObj) {
    if (categoryObj) crumbs.push({ label: categoryObj.name });
    else if (companyObj) {
      const c = cats.find((cat) => cat.id === companyObj.category_id);
      if (c) crumbs.push({ label: c.name });
    }
    if (companyObj) crumbs.push({ label: companyObj.name });
    if (worksiteObj) crumbs.push({ label: worksiteObj.name });
  }

  const active = scopedEmps.filter((e) => e.status_code === "재직");
  const onLeave = scopedEmps.filter((e) => e.status_code === "휴직");
  const retired = scopedEmps.filter((e) => e.status_code === "퇴직");

  // Top KPI strip
  const turnover = turnoverRate(active.length, retired.length);
  const avgTenure = mean(active.map((e) => tenureMonths(e.hire_date)));
  const avgSalary = mean(active.map((e) => e.annual_salary ?? null));

  // Diversity / dynamics KPIs
  const avgAge = mean(active.map((e) => ageFromBirth(e.birth_date)));
  const maleCount = active.filter((e) => e.gender === "남").length;
  const femaleCount = active.filter((e) => e.gender === "여").length;
  const maleRatio = active.length ? maleCount / active.length : 0;
  const femaleRatio = active.length ? femaleCount / active.length : 0;
  const foreignCount = active.filter((e) => e.nationality_type === "외국인").length;
  const foreignRatio = active.length ? foreignCount / active.length : 0;

  const cutoff90 = daysAgoIso(90);
  const yearStart = `${new Date().getFullYear()}-01-01`;
  const newHires90 = scopedEmps.filter((e) => e.hire_date && e.hire_date >= cutoff90).length;
  const newHiresYTD = scopedEmps.filter((e) => e.hire_date && e.hire_date >= yearStart).length;
  const termsYTD = scopedEmps.filter(
    (e) => e.termination_date && e.termination_date >= yearStart,
  ).length;
  const netYTD = newHiresYTD - termsYTD;

  // Scope query for drill-down links
  const scopeQuery = (() => {
    const q = new URLSearchParams();
    if (bu) q.set("bu", bu);
    if (company) q.set("company", company);
    if (worksite) q.set("worksite", worksite);
    return q.toString();
  })();
  const empHref = (status: "재직" | "휴직" | "퇴직") =>
    `/employees?${scopeQuery ? `${scopeQuery}&` : ""}status=${encodeURIComponent(status)}`;

  // Panel 1: BU(또는 법인)별 × 재직/휴직/퇴직/합계 테이블
  let statusRows: StatusRow[] = [];
  let statusFirstColHeader = "구분";
  if (scopeLevel === "group") {
    statusFirstColHeader = "BU (카테고리)";
    statusRows = cats.map((cat) => {
      const compIds = new Set(cos.filter((c) => c.category_id === cat.id).map((c) => c.id));
      const sub = scopedEmps.filter((e) => compIds.has(e.company_id));
      return {
        key: cat.id,
        label: cat.name,
        filter: { bu: cat.id },
        active: sub.filter((e) => e.status_code === "재직").length,
        onLeave: sub.filter((e) => e.status_code === "휴직").length,
        retired: sub.filter((e) => e.status_code === "퇴직").length,
      };
    });
  } else if (scopeLevel === "bu") {
    statusFirstColHeader = "법인";
    const companiesInBu = cos.filter((c) => c.category_id === bu);
    statusRows = companiesInBu.map((co) => {
      const sub = scopedEmps.filter((e) => e.company_id === co.id);
      return {
        key: co.id,
        label: co.name,
        filter: { company: co.id },
        active: sub.filter((e) => e.status_code === "재직").length,
        onLeave: sub.filter((e) => e.status_code === "휴직").length,
        retired: sub.filter((e) => e.status_code === "퇴직").length,
      };
    });
  } else if (scopeLevel === "company") {
    statusFirstColHeader = "사업장";
    const wsInCo = wss.filter((w) => w.company_id === company);
    statusRows = wsInCo.length
      ? wsInCo.map((w) => {
          const sub = scopedEmps.filter((e) => e.worksite_id === w.id);
          return {
            key: w.id,
            label: w.name,
            filter: { company: company, worksite: w.id },
            active: sub.filter((e) => e.status_code === "재직").length,
            onLeave: sub.filter((e) => e.status_code === "휴직").length,
            retired: sub.filter((e) => e.status_code === "퇴직").length,
          };
        })
      : [
          {
            key: company,
            label: companyObj?.name ?? "법인",
            filter: { company },
            active: active.length,
            onLeave: onLeave.length,
            retired: retired.length,
          },
        ];
  } else {
    statusFirstColHeader = "사업장";
    statusRows = [
      {
        key: worksite,
        label: worksiteObj?.name ?? "사업장",
        filter: { company: company || worksiteObj?.company_id || "", worksite },
        active: active.length,
        onLeave: onLeave.length,
        retired: retired.length,
      },
    ];
  }

  // 월별 입사 vs 퇴사 (최근 12개월) — 순증감 트렌드
  const months = lastNMonths(12);
  const termMonthMap = new Map<string, number>();
  const hireMonthMap = new Map<string, number>();
  for (const e of retired) {
    if (e.termination_date) {
      const key = e.termination_date.slice(0, 7);
      termMonthMap.set(key, (termMonthMap.get(key) ?? 0) + 1);
    }
  }
  for (const e of scopedEmps) {
    if (e.hire_date) {
      const key = e.hire_date.slice(0, 7);
      if (months.includes(key)) hireMonthMap.set(key, (hireMonthMap.get(key) ?? 0) + 1);
    }
  }
  const netTrend = months.map((m) => ({
    x: m.slice(2),
    입사: hireMonthMap.get(m) ?? 0,
    퇴사: termMonthMap.get(m) ?? 0,
  }));

  // 법인별 재직 Top 10 (drill-down to /employees)
  const companyActiveItems = cos
    .map((co) => {
      const count = scopedEmps.filter((e) => e.company_id === co.id && e.status_code === "재직").length;
      return {
        label: co.name,
        value: count,
        href: `/employees?company=${co.id}&status=재직`,
      };
    })
    .filter((x) => x.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  // 성별 (재직)
  const genderPie = [
    { name: "남", value: active.filter((e) => e.gender === "남").length },
    { name: "여", value: active.filter((e) => e.gender === "여").length },
  ].filter((d) => d.value > 0);

  // 내/외국인 (재직)
  const nationalityPie = [
    { name: "내국인", value: active.filter((e) => e.nationality_type === "내국인").length },
    { name: "외국인", value: active.filter((e) => e.nationality_type === "외국인").length },
  ].filter((d) => d.value > 0);

  // Scope-specific deps/worksites for tabs
  const scopedDepartments =
    scopeLevel === "company" || scopeLevel === "worksite"
      ? deps.filter((d) => d.company_id === (company || wss.find((w) => w.id === worksite)?.company_id))
      : deps;
  const scopedWorksites =
    scopeLevel === "company" ? wss.filter((w) => w.company_id === company)
    : scopeLevel === "worksite" ? wss.filter((w) => w.id === worksite)
    : wss;

  type WSGroup = { id: string; name: string; filter: (e: Employee) => boolean };
  let wsGroups: WSGroup[];
  let wsTitle: string;
  if (scopeLevel === "group") {
    wsGroups = cos.map((co) => ({ id: co.id, name: co.name, filter: (e) => e.company_id === co.id }));
    wsTitle = "법인별 현황 비교";
  } else if (scopeLevel === "bu") {
    wsGroups = cos.filter((c) => c.category_id === bu).map((co) => ({
      id: co.id, name: co.name, filter: (e) => e.company_id === co.id,
    }));
    wsTitle = `${categoryObj?.name ?? ""} 내 법인별 비교`;
  } else if (scopeLevel === "company") {
    wsGroups = wss.filter((w) => w.company_id === company).map((w) => ({
      id: w.id, name: w.name, filter: (e) => e.worksite_id === w.id,
    }));
    wsTitle = `${companyObj?.name ?? ""} 사업장별 비교`;
  } else {
    wsGroups = [];
    wsTitle = "단일 사업장";
  }

  const companiesInScope =
    scopeLevel === "group" ? cos
    : scopeLevel === "bu" ? cos.filter((c) => c.category_id === bu)
    : [];

  const primaryGroupActive =
    scopeLevel === "group" || scopeLevel === "bu"
      ? {
          title: scopeLevel === "bu" ? "BU 내 법인별 재직" : "법인별 재직 인원",
          items: companiesInScope
            .map((co) => ({
              label: co.name,
              value: active.filter((e) => e.company_id === co.id).length,
              href: `/employees?company=${co.id}&status=재직`,
            }))
            .filter((x) => x.value > 0)
            .sort((a, b) => b.value - a.value),
        }
      : undefined;

  const primaryGroupRetired =
    scopeLevel === "group" || scopeLevel === "bu"
      ? {
          title: scopeLevel === "bu" ? "BU 내 법인별 퇴직" : "법인별 퇴직 인원",
          items: companiesInScope
            .map((co) => ({
              label: co.name,
              value: retired.filter((e) => e.company_id === co.id).length,
              href: `/employees?company=${co.id}&status=퇴직`,
            }))
            .filter((x) => x.value > 0)
            .sort((a, b) => b.value - a.value),
        }
      : undefined;

  return (
    <div className="flex flex-col gap-3">
      <ScopeHeader crumbs={crumbs} />

      {scopedEmps.length === 0 ? (
        <div className="card p-8 text-center text-sm text-[var(--fg-muted)]">
          선택한 범위에 직원 데이터가 없습니다. <Link className="underline" href="/admin/import">Excel 업로드</Link>로 시작하세요.
        </div>
      ) : (
        <>
          {/* ============ KPI 헤드라인 — 가장 먼저 보이는 핵심 6개 ============ */}
          <KpiGrid cols={6}>
            <KpiCard
              label="재직"
              value={
                <Link href={empHref("재직")} className="hover:underline">
                  {active.length.toLocaleString()}
                </Link>
              }
              tone="brand"
            />
            <KpiCard
              label="휴직"
              value={
                <Link href={empHref("휴직")} className="hover:underline">
                  {onLeave.length.toLocaleString()}
                </Link>
              }
            />
            <KpiCard
              label="퇴직 (누적)"
              value={
                <Link href={empHref("퇴직")} className="hover:underline">
                  {retired.length.toLocaleString()}
                </Link>
              }
              tone="warn"
            />
            <KpiCard
              label="이직률"
              value={formatPercent(turnover)}
              tone={turnover > 0.3 ? "danger" : "default"}
              sub={`재직+퇴직 ${active.length + retired.length}명 기준`}
            />
            <KpiCard label="평균 근속" value={formatTenureYears(avgTenure)} />
            <KpiCard label="평균 연봉" value={formatKRW(avgSalary)} />
          </KpiGrid>

          {/* ============ 다양성·동력 KPI 행 ============ */}
          <KpiGrid cols={6}>
            <KpiCard
              label="평균 연령"
              value={avgAge != null ? `${avgAge.toFixed(1)}세` : "-"}
            />
            <KpiCard
              label="남성 비율"
              value={formatPercent(maleRatio)}
              sub={`${maleCount} / ${active.length}명`}
            />
            <KpiCard
              label="여성 비율"
              value={formatPercent(femaleRatio)}
              sub={`${femaleCount} / ${active.length}명`}
            />
            <KpiCard
              label="외국인 비율"
              value={formatPercent(foreignRatio)}
              sub={`${foreignCount} / ${active.length}명`}
            />
            <KpiCard
              label="신규 입사"
              value={newHires90.toLocaleString()}
              sub={`최근 90일 · 올해 누적 ${newHiresYTD}명`}
            />
            <KpiCard
              label="순증감 (연내)"
              value={
                <span className={netYTD < 0 ? "text-[var(--danger)]" : netYTD > 0 ? "text-[var(--brand)]" : ""}>
                  {netYTD > 0 ? "+" : ""}{netYTD.toLocaleString()}
                </span>
              }
              sub={`입사 ${newHiresYTD} − 퇴사 ${termsYTD}`}
            />
          </KpiGrid>

          {/* ============ 스코프 + 탭 (sticky) ============ */}
          <StickyToolbar>
            <ScopeFilter categories={cats} companies={cos} worksites={wss} />
            <ScopeTabs />
          </StickyToolbar>

          {/* ============ 보조 패널: 핵심 시각화 3개 ============ */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 auto-rows-min">
            <div className="md:col-span-12 lg:col-span-7">
              <Panel
                title={`${statusFirstColHeader}별 인원 현황`}
                right={<span className="text-[11px] text-[var(--fg-subtle)]">숫자 클릭 → 직원 명단</span>}
                padBody={false}
              >
                <StatusTable
                  rows={statusRows}
                  firstColumnHeader={statusFirstColHeader}
                  firstColumnClickable
                />
              </Panel>
            </div>

            <div className="md:col-span-12 lg:col-span-5">
              <Panel
                title="월별 입사 vs 퇴사"
                right={<span className="text-[11px] text-[var(--fg-subtle)]">최근 12개월</span>}
              >
                <TrendLine
                  multiData={netTrend}
                  series={[
                    { key: "입사", label: "입사", color: "var(--color-c2)" },
                    { key: "퇴사", label: "퇴사", color: "var(--color-c4)" },
                  ]}
                />
              </Panel>
            </div>

            <div className="md:col-span-12 lg:col-span-7">
              <Panel
                title="법인별 재직 Top 10"
                right={
                  <Link href="/?tab=worksites" className="text-[11px] text-[var(--accent)] hover:underline">
                    전체 비교 →
                  </Link>
                }
              >
                {companyActiveItems.length ? (
                  <BarList items={companyActiveItems} valueSuffix="명" />
                ) : (
                  <div className="text-xs text-muted-auto text-center py-6">데이터 없음</div>
                )}
              </Panel>
            </div>

            <div className="md:col-span-6 lg:col-span-3">
              <Panel title="성별 (재직)">
                {genderPie.length ? (
                  <SmallDonut data={genderPie} />
                ) : (
                  <div className="text-xs text-muted-auto text-center py-6">-</div>
                )}
              </Panel>
            </div>
            <div className="md:col-span-6 lg:col-span-2">
              <Panel title="내/외국인 (재직)">
                {nationalityPie.length ? (
                  <SmallDonut data={nationalityPie} />
                ) : (
                  <div className="text-xs text-muted-auto text-center py-6">-</div>
                )}
              </Panel>
            </div>

          </div>

          {/* ============ 상세 탭 본문 ============ */}
          <div className="mt-2">
            {tab === "active" ? (
              <ActiveTab
                employees={scopedEmps}
                departments={scopedDepartments}
                worksites={scopedWorksites}
                lookups={lks}
                primaryGroup={primaryGroupActive}
              />
            ) : tab === "retired" ? (
              <RetiredTab
                employees={scopedEmps}
                departments={scopedDepartments}
                lookups={lks}
                primaryGroup={primaryGroupRetired}
              />
            ) : tab === "worksites" ? (
              <WorksitesTab employees={scopedEmps} groups={wsGroups} title={wsTitle} />
            ) : tab === "comp" ? (
              <CompTab employees={scopedEmps} departments={scopedDepartments} lookups={lks} />
            ) : tab === "hiring" ? (
              <HiringTab employees={scopedEmps} lookups={lks} />
            ) : (
              <ActiveTab
                employees={scopedEmps}
                departments={scopedDepartments}
                worksites={scopedWorksites}
                lookups={lks}
                primaryGroup={primaryGroupActive}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}
