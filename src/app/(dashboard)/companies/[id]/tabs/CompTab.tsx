import type { Database } from "@/types/database";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Collapsible } from "@/components/ui/Collapsible";
import { BarList } from "@/components/charts/BarList";
import { RangeBar } from "@/components/charts/RangeBar";
import { KpiCard, KpiGrid } from "@/components/kpi/KpiCard";
import { formatKRW, formatPercent, formatTenureYears, formatYears } from "@/utils/format";
import { ageFromBirth, mean, tenureMonths, totalCareerYears } from "@/utils/aggregations";

type Employee = Database["public"]["Tables"]["employees"]["Row"];
type Department = Database["public"]["Tables"]["departments"]["Row"];
type Lookup = Database["public"]["Tables"]["lookups"]["Row"];

type SalaryStat = {
  count: number;
  min: number;
  max: number;
  avg: number;
  sum: number;
  avgTenure: number | null;
  avgCareer: number | null;
  avgAge: number | null;
};

function stat(emps: Employee[]): SalaryStat {
  const salaries = emps.map((e) => e.annual_salary ?? 0).filter((n) => n > 0);
  return {
    count: emps.length,
    min: salaries.length ? Math.min(...salaries) : 0,
    max: salaries.length ? Math.max(...salaries) : 0,
    avg: salaries.length ? salaries.reduce((a, b) => a + b, 0) / salaries.length : 0,
    sum: salaries.reduce((a, b) => a + b, 0),
    avgTenure: mean(emps.map((e) => tenureMonths(e.hire_date))),
    avgCareer: mean(emps.map((e) => totalCareerYears(e.career_before_join_years, e.hire_date, e.termination_date))),
    avgAge: mean(emps.map((e) => ageFromBirth(e.birth_date))),
  };
}

function StatTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: (string | number)[][];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="text-[var(--fg-muted)]">
          <tr>
            {headers.map((h) => (
              <th
                key={h}
                className={`py-2 px-3 font-normal ${h === headers[0] ? "text-left" : "text-right"}`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={idx} className="border-t border-[var(--border)]">
              {row.map((cell, i) => (
                <td
                  key={i}
                  className={`py-2 px-3 ${i === 0 ? "text-left" : "text-right tabular-nums"}`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function CompTab({
  employees,
  departments,
  lookups,
}: {
  employees: Employee[];
  departments: Department[];
  lookups: Lookup[];
}) {
  const active = employees.filter((e) => e.status_code === "재직");

  if (active.length === 0) {
    return (
      <div className="card p-8 text-center text-sm text-[var(--fg-muted)]">
        재직자 데이터가 없어 연봉 분석을 표시할 수 없습니다.
      </div>
    );
  }

  // 부서별 연봉
  const deptStats = departments
    .map((d) => ({
      dept: d.name,
      emps: active.filter((e) => e.department_id === d.id),
    }))
    .filter((x) => x.emps.length > 0)
    .map((x) => ({ dept: x.dept, s: stat(x.emps) }))
    .sort((a, b) => b.s.count - a.s.count);

  const deptRows = deptStats.map((x) => [
    x.dept,
    x.s.count,
    formatKRW(x.s.min),
    formatKRW(x.s.avg),
    formatKRW(x.s.max),
    formatKRW(x.s.sum),
    formatTenureYears(x.s.avgTenure),
    formatYears(x.s.avgCareer),
    x.s.avgAge != null ? `${x.s.avgAge.toFixed(1)}세` : "-",
  ]);

  // 성별 연봉 격차 (재직)
  const maleEmps = active.filter((e) => e.gender === "남");
  const femaleEmps = active.filter((e) => e.gender === "여");
  const maleSal = stat(maleEmps).avg;
  const femaleSal = stat(femaleEmps).avg;
  const payGap = maleSal > 0 && femaleSal > 0 ? (maleSal - femaleSal) / maleSal : null;

  // 직급별 연봉 (전체 직급)
  const ranks = lookups.filter((l) => l.type === "rank");
  const rankRows = ranks.map((r) => {
    const emps = active.filter((e) => e.rank_code === r.code);
    const s = stat(emps);
    return [
      r.label,
      s.count,
      s.count ? formatKRW(s.max) : "-",
      s.count ? formatKRW(s.min) : "-",
      s.count ? formatKRW(s.avg) : "-",
      s.count ? formatTenureYears(s.avgTenure) : "-",
      s.count ? formatYears(s.avgCareer) : "-",
    ];
  });

  // 관리 직군별 직급 연봉
  const mgmtRows = ranks.map((r) => {
    const emps = active.filter((e) => e.rank_code === r.code && e.job_family_code === "관리");
    const s = stat(emps);
    return [
      r.label,
      s.count,
      s.count ? formatKRW(s.max) : "-",
      s.count ? formatKRW(s.min) : "-",
      s.count ? formatKRW(s.avg) : "-",
      s.count ? formatTenureYears(s.avgTenure) : "-",
      s.count ? formatYears(s.avgCareer) : "-",
    ];
  });

  // 생산 직군별 직급 연봉
  const prodRows = ranks.map((r) => {
    const emps = active.filter((e) => e.rank_code === r.code && e.job_family_code === "생산");
    const s = stat(emps);
    return [
      r.label,
      s.count,
      s.count ? formatKRW(s.max) : "-",
      s.count ? formatKRW(s.min) : "-",
      s.count ? formatKRW(s.avg) : "-",
      s.count ? formatTenureYears(s.avgTenure) : "-",
      s.count ? formatYears(s.avgCareer) : "-",
    ];
  });

  // 신규 차원 (내외국/회계/직군)
  type Dim = { base: string; bucket: string; get: (e: Employee) => boolean };
  const dims: Dim[] = [
    { base: "내/외국인", bucket: "내국인", get: (e) => e.nationality_type === "내국인" },
    { base: "내/외국인", bucket: "외국인", get: (e) => e.nationality_type === "외국인" },
    { base: "회계구분", bucket: "제조", get: (e) => e.accounting_type_code === "제조" },
    { base: "회계구분", bucket: "판관", get: (e) => e.accounting_type_code === "판관" },
    { base: "직군구분", bucket: "생산", get: (e) => e.job_family_code === "생산" },
    { base: "직군구분", bucket: "관리", get: (e) => e.job_family_code === "관리" },
  ];
  const dimRows = dims.map((d) => {
    const sub = active.filter(d.get);
    const s = stat(sub);
    return [d.base, d.bucket, s.count ? formatYears(s.avgCareer) : "-", s.count ? formatKRW(s.avg) : "-"];
  });

  // Charts: 평균 연봉 series + 범위(min-avg-max) series
  const deptAvgChart = deptStats
    .filter((x) => x.s.avg > 0)
    .map((x) => ({ label: x.dept, value: Math.round(x.s.avg) }));

  const rankStats = ranks.map((r) => {
    const emps = active.filter((e) => e.rank_code === r.code);
    return { label: r.label, s: stat(emps) };
  });
  const rankAvgChart = rankStats
    .filter((x) => x.s.count > 0)
    .map((x) => ({ label: x.label, value: Math.round(x.s.avg) }));
  const rankRangeChart = rankStats
    .filter((x) => x.s.count > 0)
    .map((x) => ({ label: x.label, min: x.s.min, avg: x.s.avg, max: x.s.max }));

  const mgmtStats = ranks.map((r) => {
    const emps = active.filter((e) => e.rank_code === r.code && e.job_family_code === "관리");
    return { label: r.label, s: stat(emps) };
  });
  const mgmtAvgChart = mgmtStats
    .filter((x) => x.s.count > 0)
    .map((x) => ({ label: x.label, value: Math.round(x.s.avg) }));
  const mgmtRangeChart = mgmtStats
    .filter((x) => x.s.count > 0)
    .map((x) => ({ label: x.label, min: x.s.min, avg: x.s.avg, max: x.s.max }));

  const prodStats = ranks.map((r) => {
    const emps = active.filter((e) => e.rank_code === r.code && e.job_family_code === "생산");
    return { label: r.label, s: stat(emps) };
  });
  const prodAvgChart = prodStats
    .filter((x) => x.s.count > 0)
    .map((x) => ({ label: x.label, value: Math.round(x.s.avg) }));
  const prodRangeChart = prodStats
    .filter((x) => x.s.count > 0)
    .map((x) => ({ label: x.label, min: x.s.min, avg: x.s.avg, max: x.s.max }));

  return (
    <div className="flex flex-col gap-5">
      {/* 성별 연봉 격차 KPI */}
      {(maleEmps.length > 0 || femaleEmps.length > 0) && (
        <KpiGrid cols={3}>
          <KpiCard
            label="남성 평균 연봉"
            value={maleSal > 0 ? formatKRW(maleSal) : "-"}
            sub={`${maleEmps.length}명`}
          />
          <KpiCard
            label="여성 평균 연봉"
            value={femaleSal > 0 ? formatKRW(femaleSal) : "-"}
            sub={`${femaleEmps.length}명`}
          />
          <KpiCard
            label="성별 임금 격차"
            value={payGap != null ? formatPercent(Math.abs(payGap)) : "-"}
            tone={payGap != null && Math.abs(payGap) > 0.2 ? "warn" : "default"}
            sub={
              payGap == null
                ? "비교 불가"
                : payGap > 0
                ? `남성이 여성보다 높음`
                : payGap < 0
                ? `여성이 남성보다 높음`
                : "동일"
            }
          />
        </KpiGrid>
      )}

      <div className="card p-4 md:p-5">
        <SectionHeader title="부서별 연봉 현황 (재직)" description="평균 연봉 기준" />
        {deptAvgChart.length ? (
          <BarList items={deptAvgChart} valueSuffix="원" />
        ) : (
          <div className="text-xs text-[var(--fg-muted)] py-6 text-center">데이터 없음</div>
        )}
      </div>

      <Collapsible title="부서별 연봉 상세" description="최소/평균/최대/합계/근속/경력">
        <StatTable
          headers={["부서", "인원", "최소연봉", "평균연봉", "최대연봉", "연봉합계", "평균근속(년)", "평균경력(년)", "평균연령"]}
          rows={deptRows}
        />
      </Collapsible>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-4 md:p-5">
          <SectionHeader title="직급별 평균 연봉 (재직)" />
          {rankAvgChart.length ? (
            <BarList items={rankAvgChart} valueSuffix="원" />
          ) : (
            <div className="text-xs text-[var(--fg-muted)] py-6 text-center">데이터 없음</div>
          )}
        </div>
        <div className="card p-4 md:p-5">
          <SectionHeader
            title="직급별 연봉 분포"
            description="최소 ~ 최대 범위 + 평균 마커"
          />
          <RangeBar items={rankRangeChart} format="krw" />
        </div>
      </div>

      <Collapsible title="직급별 연봉 상세 테이블" description="전체 수치 보기">
        <StatTable
          headers={["직급", "인원", "최대연봉", "최소연봉", "평균연봉", "평균근속(년)", "평균경력(년)"]}
          rows={rankRows}
        />
      </Collapsible>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-4 md:p-5">
          <SectionHeader title="🔷 관리 직군 평균 연봉" />
          {mgmtAvgChart.length ? (
            <BarList items={mgmtAvgChart} valueSuffix="원" />
          ) : (
            <div className="text-xs text-[var(--fg-muted)] py-6 text-center">데이터 없음</div>
          )}
          <div className="mt-4 pt-4 border-t border-[var(--border)]">
            <SectionHeader title="연봉 범위 (관리)" description="최소 / 평균 / 최대" />
            <RangeBar items={mgmtRangeChart} format="krw" />
          </div>
        </div>
        <div className="card p-4 md:p-5">
          <SectionHeader title="🔶 생산 직군 평균 연봉" />
          {prodAvgChart.length ? (
            <BarList items={prodAvgChart} valueSuffix="원" />
          ) : (
            <div className="text-xs text-[var(--fg-muted)] py-6 text-center">데이터 없음</div>
          )}
          <div className="mt-4 pt-4 border-t border-[var(--border)]">
            <SectionHeader title="연봉 범위 (생산)" description="최소 / 평균 / 최대" />
            <RangeBar items={prodRangeChart} format="krw" />
          </div>
        </div>
      </div>

      <Collapsible title="관리 직군 직급별 상세" description="직급 × 연봉 지표">
        <StatTable
          headers={["직급", "인원", "최대연봉", "최소연봉", "평균연봉", "평균근속(년)", "평균경력(년)"]}
          rows={mgmtRows}
        />
      </Collapsible>

      <Collapsible title="생산 직군 직급별 상세" description="직급 × 연봉 지표">
        <StatTable
          headers={["직급", "인원", "최대연봉", "최소연봉", "평균연봉", "평균근속(년)", "평균경력(년)"]}
          rows={prodRows}
        />
      </Collapsible>

      <Collapsible title="신규 차원별 연봉 분석" description="내외국인 / 회계 / 직군 평균">
        <StatTable
          headers={["분석 기준", "상세 항목", "평균 총경력", "평균 연봉"]}
          rows={dimRows}
        />
      </Collapsible>
    </div>
  );
}
