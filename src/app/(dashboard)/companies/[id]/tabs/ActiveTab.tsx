import type { Database } from "@/types/database";
import { KpiCard, KpiGrid } from "@/components/kpi/KpiCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { BarList } from "@/components/charts/BarList";
import { DonutChart } from "@/components/charts/DonutChart";
import { formatKRW, formatMonths, formatPercent } from "@/utils/format";
import { CAREER_BUCKETS, countBy, mean, tenureMonths, turnoverRate } from "@/utils/aggregations";

type Employee = Database["public"]["Tables"]["employees"]["Row"];
type Worksite = Database["public"]["Tables"]["worksites"]["Row"];
type Department = Database["public"]["Tables"]["departments"]["Row"];
type Lookup = Database["public"]["Tables"]["lookups"]["Row"];

export function ActiveTab({
  employees,
  departments,
  lookups,
}: {
  employees: Employee[];
  departments: Department[];
  worksites: Worksite[];
  lookups: Lookup[];
}) {
  const active = employees.filter((e) => e.status_code === "재직");
  const onLeave = employees.filter((e) => e.status_code === "휴직");
  const retired = employees.filter((e) => e.status_code === "퇴직");

  const male = active.filter((e) => e.gender === "남").length;
  const female = active.filter((e) => e.gender === "여").length;

  const salaries = active.map((e) => e.annual_salary ?? 0).filter((n) => n > 0);
  const avgSalary = salaries.length ? salaries.reduce((a, b) => a + b, 0) / salaries.length : 0;
  const avgTenureM = mean(active.map((e) => tenureMonths(e.hire_date)));
  const turnover = turnoverRate(active.length, retired.length);

  // 부서별 인원 (재직)
  const deptCount = countBy(active.map((e) => e.department_id).filter(Boolean) as string[]);
  const deptItems = departments
    .map((d) => ({ label: d.name, value: deptCount.get(d.id) ?? 0 }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value);

  // 직급 분포 (재직)
  const rankLookups = lookups.filter((l) => l.type === "rank");
  const rankCount = countBy(active.map((e) => e.rank_code ?? "미지정"));
  const rankItems = rankLookups
    .map((r) => ({ label: r.label, value: rankCount.get(r.code) ?? 0 }))
    .filter((r) => r.value > 0);

  // 고용형태 분포
  const empTypes = lookups.filter((l) => l.type === "employment_type");
  const empCount = countBy(active.map((e) => e.employment_type_code ?? "미지정"));
  const empItems = empTypes.map((t) => ({ name: t.label, value: empCount.get(t.code) ?? 0 })).filter((i) => i.value > 0);

  // 경력 분포
  const careerDist = CAREER_BUCKETS.map((b) => ({
    label: b.key,
    value: active.filter((e) => typeof e.total_career_years === "number" && b.test(e.total_career_years!)).length,
  }));

  // 직군 × 회계 (생산/관리 × 제조/판관)
  const jobFams = ["생산", "관리"];
  const accTypes = ["제조", "판관"];
  const matrix = jobFams.map((jf) => ({
    jf,
    cells: accTypes.map((at) => active.filter((e) => e.job_family_code === jf && e.accounting_type_code === at).length),
  }));

  // 글로벌(내외국인/회계/직군)
  const innerForeign = ["내국인", "외국인"].map((nt) => ({
    name: nt,
    value: active.filter((e) => e.nationality_type === nt).length,
  }));
  const accDist = accTypes.map((at) => ({
    name: at,
    value: active.filter((e) => e.accounting_type_code === at).length,
  }));
  const jfDist = jobFams.map((jf) => ({
    name: jf,
    value: active.filter((e) => e.job_family_code === jf).length,
  }));

  if (employees.length === 0) {
    return (
      <div className="card p-8 text-center text-sm text-[var(--fg-muted)]">
        아직 이 법인의 직원 데이터가 없습니다. <a href="/admin/import" className="text-[var(--accent)] underline">Excel 업로드</a>로 시작하세요.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <KpiGrid>
        <KpiCard label="재직 인원" value={active.length.toLocaleString()} tone="brand" />
        <KpiCard label="휴직자" value={onLeave.length.toLocaleString()} />
        <KpiCard label="평균 연봉" value={formatKRW(avgSalary)} />
        <KpiCard label="평균 근속" value={formatMonths(avgTenureM)} />
        <KpiCard
          label="남 / 여"
          value={`${male} / ${female}`}
          sub={`이직률 ${formatPercent(turnover)}`}
          tone={turnover > 0.3 ? "danger" : "default"}
        />
      </KpiGrid>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card p-4 md:p-5">
          <SectionHeader title="부서별 인원 (재직)" />
          <BarList
            items={deptItems}
            valueFormatter={(n) => `${n}명`}
          />
        </div>
        <div className="card p-4 md:p-5">
          <SectionHeader title="직급 분포 (재직)" />
          <BarList
            items={rankItems}
            valueFormatter={(n) => `${n}명`}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card p-4 md:p-5">
          <SectionHeader title="고용형태 (재직)" />
          {empItems.length ? (
            <DonutChart data={empItems} />
          ) : (
            <div className="text-xs text-[var(--fg-muted)] py-6 text-center">데이터 없음</div>
          )}
        </div>
        <div className="card p-4 md:p-5">
          <SectionHeader title="경력 분포 (재직)" />
          <BarList
            items={careerDist}
            valueFormatter={(n) => `${n}명`}
          />
        </div>
      </div>

      <div className="card p-4 md:p-5">
        <SectionHeader
          title="부서 기능/직군별 현황"
          description="직군(생산/관리) × 회계(제조/판관)"
        />
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-[var(--fg-muted)]">
                <th className="text-left py-2 pr-4 font-normal">직군 \ 회계</th>
                {accTypes.map((at) => (
                  <th key={at} className="text-right py-2 px-4 font-normal">{at}</th>
                ))}
                <th className="text-right py-2 pl-4 font-normal">합계</th>
              </tr>
            </thead>
            <tbody>
              {matrix.map((r) => {
                const rowSum = r.cells.reduce((s, n) => s + n, 0);
                return (
                  <tr key={r.jf} className="border-t border-[var(--border)]">
                    <td className="py-2 pr-4">{r.jf}</td>
                    {r.cells.map((n, i) => (
                      <td key={i} className="py-2 px-4 text-right tabular-nums">{n}</td>
                    ))}
                    <td className="py-2 pl-4 text-right font-medium tabular-nums">{rowSum}</td>
                  </tr>
                );
              })}
              <tr className="border-t border-[var(--border)] text-[var(--fg-muted)]">
                <td className="py-2 pr-4">합계</td>
                {accTypes.map((at, i) => {
                  const colSum = matrix.reduce((s, r) => s + (r.cells[i] ?? 0), 0);
                  return <td key={at} className="py-2 px-4 text-right tabular-nums">{colSum}</td>;
                })}
                <td className="py-2 pl-4 text-right font-medium tabular-nums">{active.length}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="card p-4 md:p-5">
          <SectionHeader title="내/외국인" />
          {innerForeign.some((d) => d.value > 0) ? (
            <DonutChart data={innerForeign} />
          ) : (
            <div className="text-xs text-[var(--fg-muted)] py-6 text-center">데이터 없음</div>
          )}
        </div>
        <div className="card p-4 md:p-5">
          <SectionHeader title="회계구분" />
          {accDist.some((d) => d.value > 0) ? (
            <DonutChart data={accDist} />
          ) : (
            <div className="text-xs text-[var(--fg-muted)] py-6 text-center">데이터 없음</div>
          )}
        </div>
        <div className="card p-4 md:p-5">
          <SectionHeader title="직군구분" />
          {jfDist.some((d) => d.value > 0) ? (
            <DonutChart data={jfDist} />
          ) : (
            <div className="text-xs text-[var(--fg-muted)] py-6 text-center">데이터 없음</div>
          )}
        </div>
      </div>
    </div>
  );
}
