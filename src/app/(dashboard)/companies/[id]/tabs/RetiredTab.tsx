import type { Database } from "@/types/database";
import { KpiCard, KpiGrid } from "@/components/kpi/KpiCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { BarList } from "@/components/charts/BarList";
import { DonutChart } from "@/components/charts/DonutChart";
import { TrendLine } from "@/components/charts/TrendLine";
import { MatrixTable } from "@/components/tables/MatrixTable";
import { Collapsible } from "@/components/ui/Collapsible";
import { formatPercent, formatTenureYears, formatYears } from "@/utils/format";
import { CAREER_BUCKETS, ageFromBirth, countBy, mean, tenureMonths, totalCareerYears } from "@/utils/aggregations";

type Employee = Database["public"]["Tables"]["employees"]["Row"];
type Department = Database["public"]["Tables"]["departments"]["Row"];
type Lookup = Database["public"]["Tables"]["lookups"]["Row"];

function lastNMonths(n: number): string[] {
  const now = new Date();
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}

export function RetiredTab({
  employees,
  departments,
  lookups,
  primaryGroup,
}: {
  employees: Employee[];
  departments: Department[];
  lookups: Lookup[];
  primaryGroup?: { title: string; items: { label: string; value: number }[] };
}) {
  const retired = employees.filter((e) => e.status_code === "퇴직");

  const tenureMonthsList = retired.map((e) => tenureMonths(e.hire_date, e.termination_date));
  const avgTenureM = mean(tenureMonthsList);
  const execRetired = retired.filter((e) => e.employment_type_code === "임원").length;
  const regRetired = retired.filter((e) => e.employment_type_code === "정규직").length;
  const contractRetired = retired.filter((e) => e.employment_type_code === "계약직").length;
  const male = retired.filter((e) => e.gender === "남").length;
  const female = retired.filter((e) => e.gender === "여").length;

  // 단기 퇴직률 (1년 미만 퇴사)
  const validTenures = tenureMonthsList.filter((t): t is number => t != null);
  const shortTermCount = validTenures.filter((t) => t < 12).length;
  const shortTermRatio = validTenures.length ? shortTermCount / validTenures.length : 0;

  // 평균 연령 (퇴직 시점)
  const retiredAges = retired
    .map((e) => {
      if (!e.termination_date) return null;
      return ageFromBirth(e.birth_date, new Date(e.termination_date));
    })
    .filter((a): a is number => a != null);
  const avgRetiredAge = mean(retiredAges);

  if (retired.length === 0) {
    return (
      <div className="card p-8 text-center text-sm text-[var(--fg-muted)]">
        아직 이 법인의 퇴직자 데이터가 없습니다.
      </div>
    );
  }

  // 부서별 퇴직
  const deptCount = countBy(retired.map((e) => e.department_id).filter(Boolean) as string[]);
  const deptItems = departments
    .map((d) => ({ label: d.name, value: deptCount.get(d.id) ?? 0 }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value);

  // 직급 이탈률 (전체/퇴직/이탈률)
  const rankLookups = lookups.filter((l) => l.type === "rank");
  const rankStats = rankLookups.map((r) => {
    const total = employees.filter((e) => e.rank_code === r.code).length;
    const ret = retired.filter((e) => e.rank_code === r.code).length;
    return { code: r.code, label: r.label, total, retired: ret };
  });
  const rankMatrixRows = rankStats.map((r) => ({
    key: r.code,
    label: r.label,
    values: {
      total: r.total,
      retired: r.retired,
      rate: r.total ? `${((r.retired / r.total) * 100).toFixed(1)}%` : "-",
    },
  }));
  const rankAttritionItems = rankStats
    .filter((r) => r.total > 0)
    .map((r) => ({ label: r.label, value: Math.round((r.retired / r.total) * 1000) / 10 }));

  // 월별 퇴직 추이 (최근 12개월)
  const months = lastNMonths(12);
  const byMonth = new Map<string, number>();
  for (const e of retired) {
    if (!e.termination_date) continue;
    const key = e.termination_date.slice(0, 7);
    byMonth.set(key, (byMonth.get(key) ?? 0) + 1);
  }
  const monthlyTrend = months.map((m) => ({ x: m.slice(2), y: byMonth.get(m) ?? 0 }));

  // 퇴직사유 분포
  const termReasonLookups = lookups.filter((l) => l.type === "termination_reason");
  const reasonCount = countBy(
    retired.map((e) => e.termination_reason_code ?? "미지정"),
  );
  const reasonItems = termReasonLookups
    .map((r) => ({ name: r.label, value: reasonCount.get(r.code) ?? 0 }))
    .filter((r) => r.value > 0);

  // 경력 분포 (퇴직자) — 자동: 입사전경력 + 재직기간
  const totalCareers = retired.map((e) => totalCareerYears(e.career_before_join_years, e.hire_date, e.termination_date));
  const careerDistCount = CAREER_BUCKETS.map((b) => ({
    label: b.key,
    value: totalCareers.filter((y): y is number => typeof y === "number" && b.test(y)).length,
  }));
  const careerTotal = careerDistCount.reduce((s, x) => s + x.value, 0);
  const careerDist = careerDistCount.map((d) => ({
    ...d,
    pct: careerTotal ? d.value / careerTotal : 0,
  }));
  const avgCareerYears = mean(totalCareers);

  // 퇴직사유 × 회계구분 매트릭스
  const reasonAccMatrix = termReasonLookups.map((r) => {
    const mfg = retired.filter((e) => e.termination_reason_code === r.code && e.accounting_type_code === "제조").length;
    const sga = retired.filter((e) => e.termination_reason_code === r.code && e.accounting_type_code === "판관").length;
    return { key: r.code, label: r.label, values: { mfg, sga } };
  });

  // 글로벌 퇴직 현황
  const innerForeign = [
    { name: "내국인", value: retired.filter((e) => e.nationality_type === "내국인").length },
    { name: "외국인", value: retired.filter((e) => e.nationality_type === "외국인").length },
  ];
  const accDist = [
    { name: "제조", value: retired.filter((e) => e.accounting_type_code === "제조").length },
    { name: "판관", value: retired.filter((e) => e.accounting_type_code === "판관").length },
  ];
  const jfDist = [
    { name: "생산", value: retired.filter((e) => e.job_family_code === "생산").length },
    { name: "관리", value: retired.filter((e) => e.job_family_code === "관리").length },
  ];

  return (
    <div className="flex flex-col gap-5">
      <KpiGrid cols={5}>
        <KpiCard label="평균 재직기간" value={formatTenureYears(avgTenureM)} />
        <KpiCard
          label="단기 퇴직률"
          value={formatPercent(shortTermRatio)}
          tone={shortTermRatio > 0.3 ? "danger" : "default"}
          sub={`1년 미만 ${shortTermCount} / ${validTenures.length}명`}
        />
        <KpiCard
          label="평균 퇴직 연령"
          value={avgRetiredAge != null ? `${avgRetiredAge.toFixed(1)}세` : "-"}
        />
        <KpiCard label="남 / 여 (퇴직)" value={`${male} / ${female}`} />
        <KpiCard
          label="고용형태별 퇴직"
          value={
            <span className="text-base md:text-lg leading-tight">
              임원 {execRetired} · 정규 {regRetired} · 계약 {contractRetired}
            </span>
          }
        />
      </KpiGrid>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card p-4 md:p-5">
          <SectionHeader title={primaryGroup?.title ?? "부서별 퇴직 인원"} />
          {(primaryGroup?.items ?? deptItems).length ? (
            <BarList items={primaryGroup?.items ?? deptItems} valueSuffix="명" />
          ) : (
            <div className="text-xs text-[var(--fg-muted)] py-6 text-center">데이터 없음</div>
          )}
        </div>

        <div className="card p-4 md:p-5">
          <SectionHeader title="직급별 이탈률 (%)" description="전체 재직 + 퇴직 대비 퇴직 비율" />
          {rankAttritionItems.length ? (
            <BarList items={rankAttritionItems} valueSuffix="%" />
          ) : (
            <div className="text-xs text-[var(--fg-muted)] py-6 text-center">데이터 없음</div>
          )}
        </div>
      </div>

      <Collapsible title="직급별 이탈률 상세 테이블" description="전체/퇴직/이탈률">
        <MatrixTable
          corner="직급"
          cols={[
            { key: "total", label: "전체" },
            { key: "retired", label: "퇴직" },
            { key: "rate", label: "이탈률" },
          ]}
          rows={rankMatrixRows}
          showColTotal={false}
          showRowTotal={false}
          numeric
        />
      </Collapsible>

      <div className="card p-4 md:p-5">
        <SectionHeader title="월별 퇴직 추이" description="최근 12개월" />
        <TrendLine data={monthlyTrend} color="var(--warn)" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card p-4 md:p-5">
          <SectionHeader title="퇴직사유 분포" />
          {reasonItems.length ? (
            <DonutChart data={reasonItems} totalLabel="퇴직" />
          ) : (
            <div className="text-xs text-[var(--fg-muted)] py-6 text-center">데이터 없음</div>
          )}
        </div>
        <div className="card p-4 md:p-5">
          <SectionHeader
            title="경력 분포 (퇴직)"
            right={
              <span className="text-xs text-[var(--fg-muted)]">
                평균 총경력 {formatYears(avgCareerYears)}
              </span>
            }
          />
          <BarList items={careerDist} valueSuffix="명" showPercent />
        </div>
      </div>

      <div className="card p-4 md:p-5">
        <SectionHeader title="퇴직사유 × 회계구분" />
        <MatrixTable
          corner="퇴직사유"
          cols={[
            { key: "mfg", label: "제조" },
            { key: "sga", label: "판관" },
          ]}
          rows={reasonAccMatrix}
        />
      </div>

      {(() => {
        const cards = [
          { title: "내/외국인 (퇴직)", data: innerForeign },
          { title: "회계구분 (퇴직)", data: accDist },
          { title: "직군구분 (퇴직)", data: jfDist },
        ].filter((c) => c.data.some((d) => d.value > 0));
        if (cards.length === 0) return null;
        return (
          <div className={`grid gap-4 ${cards.length === 1 ? "md:grid-cols-1" : cards.length === 2 ? "md:grid-cols-2" : "md:grid-cols-3"}`}>
            {cards.map((c) => (
              <div key={c.title} className="card p-4 md:p-5">
                <SectionHeader title={c.title} />
                <DonutChart data={c.data} />
              </div>
            ))}
          </div>
        );
      })()}
    </div>
  );
}
