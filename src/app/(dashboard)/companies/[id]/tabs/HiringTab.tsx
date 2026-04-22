import type { Database } from "@/types/database";
import { KpiCard, KpiGrid } from "@/components/kpi/KpiCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Collapsible } from "@/components/ui/Collapsible";
import { BarList } from "@/components/charts/BarList";
import { MatrixTable } from "@/components/tables/MatrixTable";
import { formatKRW, formatPercent, formatYears } from "@/utils/format";
import { mean, totalCareerYears } from "@/utils/aggregations";

type Employee = Database["public"]["Tables"]["employees"]["Row"];
type Lookup = Database["public"]["Tables"]["lookups"]["Row"];

type RowStats = {
  activeIncl: number; // 재직(합) = 재직중 + 휴직
  active: number;
  onLeave: number;
  retired: number;
  total: number;
  pct: number;
  avgPreCareer: number | null;
  avgTotalCareer: number | null;
  avgSalary: number | null;
};

function computeRow(emps: Employee[], grandTotal: number): RowStats {
  const active = emps.filter((e) => e.status_code === "재직");
  const onLeave = emps.filter((e) => e.status_code === "휴직");
  const retired = emps.filter((e) => e.status_code === "퇴직");
  const total = emps.length;
  return {
    activeIncl: active.length + onLeave.length,
    active: active.length,
    onLeave: onLeave.length,
    retired: retired.length,
    total,
    pct: grandTotal ? total / grandTotal : 0,
    avgPreCareer: mean(emps.map((e) => e.career_before_join_years ?? null)),
    avgTotalCareer: mean(emps.map((e) => totalCareerYears(e.career_before_join_years, e.hire_date, e.termination_date))),
    avgSalary: mean(emps.map((e) => e.annual_salary ?? null)),
  };
}

const CAREER_ENTRY_BUCKETS: { key: string; test: (y: number) => boolean }[] = [
  { key: "신입 (0년)", test: (y) => y === 0 },
  { key: "1년 미만", test: (y) => y > 0 && y < 1 },
  { key: "1 ~ 3년", test: (y) => y >= 1 && y < 3 },
  { key: "3 ~ 5년", test: (y) => y >= 3 && y < 5 },
  { key: "5 ~ 10년", test: (y) => y >= 5 && y < 10 },
  { key: "10년 이상", test: (y) => y >= 10 },
];

export function HiringTab({
  employees,
  lookups,
}: {
  employees: Employee[];
  lookups: Lookup[];
}) {
  const active = employees.filter((e) => e.status_code === "재직");
  const onLeave = employees.filter((e) => e.status_code === "휴직");
  const retired = employees.filter((e) => e.status_code === "퇴직");
  const total = employees.length;

  if (total === 0) {
    return (
      <div className="card p-8 text-center text-sm text-[var(--fg-muted)]">
        아직 이 법인의 채용 데이터가 없습니다.
      </div>
    );
  }

  // KPI
  const ratioActive = total ? active.length / total : 0;
  const ratioLeave = total ? onLeave.length / total : 0;
  const ratioRetired = total ? retired.length / total : 0;

  // 채용 경로별
  const channels = lookups.filter((l) => l.type === "hire_channel");
  const channelRows = channels.map((c) => {
    const emps = employees.filter((e) => e.hire_channel_code === c.code);
    return { label: c.label, ...computeRow(emps, total) };
  });
  const channelTotal = channelRows.reduce(
    (a, r) => ({
      activeIncl: a.activeIncl + r.activeIncl,
      active: a.active + r.active,
      onLeave: a.onLeave + r.onLeave,
      retired: a.retired + r.retired,
      total: a.total + r.total,
    }),
    { activeIncl: 0, active: 0, onLeave: 0, retired: 0, total: 0 },
  );

  // 채용 시점 경력 분포
  const entryBucketsRows = CAREER_ENTRY_BUCKETS.map((b) => {
    const subset = employees.filter(
      (e) => typeof e.career_before_join_years === "number" && b.test(e.career_before_join_years!),
    );
    return { label: b.key, ...computeRow(subset, total) };
  });

  // 연도별 채용 추이
  const yearCount = new Map<number, number>();
  for (const e of employees) {
    if (!e.hire_date) continue;
    const y = new Date(e.hire_date).getFullYear();
    if (!Number.isNaN(y)) yearCount.set(y, (yearCount.get(y) ?? 0) + 1);
  }
  const years = Array.from(yearCount.keys()).sort();
  const yearItems = years.map((y) => ({ label: `${y}년`, value: yearCount.get(y) ?? 0 }));

  // 고용형태별
  const empTypes = lookups.filter((l) => l.type === "employment_type");
  const empTypeRows = empTypes.map((t) => {
    const emps = employees.filter((e) => e.employment_type_code === t.code);
    return { label: t.label, ...computeRow(emps, total) };
  });

  // 재직자 채용 경로 비율
  const activeChannelItems = channels.map((c) => {
    const cnt = active.filter((e) => e.hire_channel_code === c.code).length;
    return {
      label: c.label,
      value: cnt,
      pct: active.length ? cnt / active.length : 0,
    };
  });

  // 직급별 채용 경로 매트릭스 (재직 기준)
  const ranks = lookups.filter((l) => l.type === "rank");
  const rankChannelRows = ranks.map((r) => {
    const row: Record<string, number> = {};
    for (const ch of channels) {
      row[ch.code] = active.filter(
        (e) => e.rank_code === r.code && e.hire_channel_code === ch.code,
      ).length;
    }
    return { key: r.code, label: r.label, values: row };
  });

  // 직군별 고용형태 (재직)
  const jobFamilies = lookups.filter((l) => l.type === "job_family");
  const jfEmpRows = jobFamilies.map((jf) => {
    const row: Record<string, number> = {};
    for (const t of empTypes) {
      row[t.code] = active.filter(
        (e) => e.job_family_code === jf.code && e.employment_type_code === t.code,
      ).length;
    }
    return { key: jf.code, label: jf.label, values: row };
  });

  // 신규 차원 × 채용경로 (내외국/회계/직군)
  const dimGroups: { label: string; filter: (e: Employee) => boolean }[] = [
    { label: "내국인", filter: (e) => e.nationality_type === "내국인" },
    { label: "외국인", filter: (e) => e.nationality_type === "외국인" },
    { label: "제조", filter: (e) => e.accounting_type_code === "제조" },
    { label: "판관", filter: (e) => e.accounting_type_code === "판관" },
    { label: "생산", filter: (e) => e.job_family_code === "생산" },
    { label: "관리", filter: (e) => e.job_family_code === "관리" },
  ];
  const dimMatrix = dimGroups.map((d) => {
    const row: Record<string, number> = {};
    for (const c of channels) {
      row[c.code] = active.filter((e) => d.filter(e) && e.hire_channel_code === c.code).length;
    }
    return { key: d.label, label: d.label, values: row };
  });

  // 입사 코호트별 잔존율 (입사연도 그룹 × 재직중 / 전체)
  const cohortRows = years.map((y) => {
    const inYear = employees.filter(
      (e) => e.hire_date && new Date(e.hire_date).getFullYear() === y,
    );
    const stillActive = inYear.filter((e) => e.status_code === "재직" || e.status_code === "휴직").length;
    return {
      key: String(y),
      label: `${y}년 입사`,
      values: {
        hired: inYear.length,
        active: stillActive,
        retired: inYear.length - stillActive,
        retention: inYear.length ? `${((stillActive / inYear.length) * 100).toFixed(1)}%` : "-",
      },
    };
  });

  // 채용 경로별 정착률 (전체 채용 中 재직중 비율)
  const channelRetentionItems = channels
    .map((c) => {
      const all = employees.filter((e) => e.hire_channel_code === c.code);
      const stillActive = all.filter(
        (e) => e.status_code === "재직" || e.status_code === "휴직",
      ).length;
      return {
        label: c.label,
        value: all.length ? Math.round((stillActive / all.length) * 1000) / 10 : 0,
        sub: `${stillActive} / ${all.length}`,
        all: all.length,
      };
    })
    .filter((x) => x.all > 0)
    .map((x) => ({ label: `${x.label} (${x.sub})`, value: x.value }));

  return (
    <div className="flex flex-col gap-5">
      <KpiGrid>
        <KpiCard
          label="재직中 인원"
          value={active.length.toLocaleString()}
          sub={formatPercent(ratioActive)}
          tone="brand"
        />
        <KpiCard
          label="휴직 인원"
          value={onLeave.length.toLocaleString()}
          sub={formatPercent(ratioLeave)}
        />
        <KpiCard
          label="퇴직 누적"
          value={retired.length.toLocaleString()}
          sub={formatPercent(ratioRetired)}
          tone="warn"
        />
        <KpiCard label="전체 채용 합계" value={total.toLocaleString()} />
      </KpiGrid>

      <Collapsible title="채용 경로별 자원 현황" description="각 채용경로의 재직/퇴직/비율/평균연봉">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-[var(--fg-muted)]">
              <tr>
                <th className="text-left py-2 px-3 font-normal">항목</th>
                <th className="text-right py-2 px-3 font-normal">재직(합)</th>
                <th className="text-right py-2 px-3 font-normal">재직中</th>
                <th className="text-right py-2 px-3 font-normal">휴직</th>
                <th className="text-right py-2 px-3 font-normal">퇴직</th>
                <th className="text-right py-2 px-3 font-normal">전체합계</th>
                <th className="text-right py-2 px-3 font-normal">비율</th>
                <th className="text-right py-2 px-3 font-normal">평균 입사전경력</th>
                <th className="text-right py-2 px-3 font-normal">평균 총경력</th>
                <th className="text-right py-2 px-3 font-normal">평균 연봉</th>
              </tr>
            </thead>
            <tbody>
              {channelRows.map((r) => (
                <tr key={r.label} className="border-t border-[var(--border)]">
                  <td className="py-2 px-3">{r.label}</td>
                  <td className="py-2 px-3 text-right tabular-nums">{r.activeIncl}</td>
                  <td className="py-2 px-3 text-right tabular-nums">{r.active}</td>
                  <td className="py-2 px-3 text-right tabular-nums">{r.onLeave}</td>
                  <td className="py-2 px-3 text-right tabular-nums">{r.retired}</td>
                  <td className="py-2 px-3 text-right tabular-nums">{r.total}</td>
                  <td className="py-2 px-3 text-right tabular-nums">{formatPercent(r.pct)}</td>
                  <td className="py-2 px-3 text-right tabular-nums">{formatYears(r.avgPreCareer)}</td>
                  <td className="py-2 px-3 text-right tabular-nums">{formatYears(r.avgTotalCareer)}</td>
                  <td className="py-2 px-3 text-right tabular-nums">{formatKRW(r.avgSalary)}</td>
                </tr>
              ))}
              <tr className="border-t border-[var(--border)] font-medium">
                <td className="py-2 px-3">합계</td>
                <td className="py-2 px-3 text-right tabular-nums">{channelTotal.activeIncl}</td>
                <td className="py-2 px-3 text-right tabular-nums">{channelTotal.active}</td>
                <td className="py-2 px-3 text-right tabular-nums">{channelTotal.onLeave}</td>
                <td className="py-2 px-3 text-right tabular-nums">{channelTotal.retired}</td>
                <td className="py-2 px-3 text-right tabular-nums">{channelTotal.total}</td>
                <td className="py-2 px-3 text-right tabular-nums">100%</td>
                <td colSpan={3} />
              </tr>
            </tbody>
          </table>
        </div>
      </Collapsible>

      <Collapsible title="채용 시점 경력 분포" description="입사 당시 경력 구간별 재직 상태">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-[var(--fg-muted)]">
              <tr>
                <th className="text-left py-2 px-3 font-normal">경력 구간</th>
                <th className="text-right py-2 px-3 font-normal">재직(합)</th>
                <th className="text-right py-2 px-3 font-normal">재직中</th>
                <th className="text-right py-2 px-3 font-normal">휴직</th>
                <th className="text-right py-2 px-3 font-normal">퇴직</th>
                <th className="text-right py-2 px-3 font-normal">합계</th>
                <th className="text-right py-2 px-3 font-normal">비율</th>
              </tr>
            </thead>
            <tbody>
              {entryBucketsRows.map((r) => (
                <tr key={r.label} className="border-t border-[var(--border)]">
                  <td className="py-2 px-3">{r.label}</td>
                  <td className="py-2 px-3 text-right tabular-nums">{r.activeIncl}</td>
                  <td className="py-2 px-3 text-right tabular-nums">{r.active}</td>
                  <td className="py-2 px-3 text-right tabular-nums">{r.onLeave}</td>
                  <td className="py-2 px-3 text-right tabular-nums">{r.retired}</td>
                  <td className="py-2 px-3 text-right tabular-nums">{r.total}</td>
                  <td className="py-2 px-3 text-right tabular-nums">{formatPercent(r.pct)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Collapsible>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card p-4 md:p-5">
          <SectionHeader title="연도별 채용 추이" />
          {yearItems.length ? (
            <BarList items={yearItems} valueSuffix="명" />
          ) : (
            <div className="text-xs text-[var(--fg-muted)] py-6 text-center">데이터 없음</div>
          )}
        </div>
        <div className="card p-4 md:p-5">
          <SectionHeader title="재직자 채용 경로 비율" />
          <BarList items={activeChannelItems} valueSuffix="명" showPercent />
        </div>
      </div>

      <Collapsible title="고용 형태별 현황" description="정규직/임원/계약직/고문 각 상태와 평균 연봉">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-[var(--fg-muted)]">
              <tr>
                <th className="text-left py-2 px-3 font-normal">고용형태</th>
                <th className="text-right py-2 px-3 font-normal">재직(합)</th>
                <th className="text-right py-2 px-3 font-normal">재직中</th>
                <th className="text-right py-2 px-3 font-normal">휴직</th>
                <th className="text-right py-2 px-3 font-normal">퇴직</th>
                <th className="text-right py-2 px-3 font-normal">전체</th>
                <th className="text-right py-2 px-3 font-normal">비율</th>
                <th className="text-right py-2 px-3 font-normal">평균 연봉</th>
                <th className="text-right py-2 px-3 font-normal">평균 총경력</th>
              </tr>
            </thead>
            <tbody>
              {empTypeRows.map((r) => (
                <tr key={r.label} className="border-t border-[var(--border)]">
                  <td className="py-2 px-3">{r.label}</td>
                  <td className="py-2 px-3 text-right tabular-nums">{r.activeIncl}</td>
                  <td className="py-2 px-3 text-right tabular-nums">{r.active}</td>
                  <td className="py-2 px-3 text-right tabular-nums">{r.onLeave}</td>
                  <td className="py-2 px-3 text-right tabular-nums">{r.retired}</td>
                  <td className="py-2 px-3 text-right tabular-nums">{r.total}</td>
                  <td className="py-2 px-3 text-right tabular-nums">{formatPercent(r.pct)}</td>
                  <td className="py-2 px-3 text-right tabular-nums">{formatKRW(r.avgSalary)}</td>
                  <td className="py-2 px-3 text-right tabular-nums">{formatYears(r.avgTotalCareer)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Collapsible>

      <Collapsible title="직급별 채용 경로 (재직)" description="직급 × 채용경로 매트릭스">
        <MatrixTable
          corner="직급"
          cols={channels.map((c) => ({ key: c.code, label: c.label }))}
          rows={rankChannelRows}
        />
      </Collapsible>

      <Collapsible title="직군별 고용형태 현황 (재직)" description="직군 × 고용형태 매트릭스">
        <MatrixTable
          corner="직군"
          cols={empTypes.map((t) => ({ key: t.code, label: t.label }))}
          rows={jfEmpRows}
        />
      </Collapsible>

      <Collapsible title="신규 차원별 채용경로 분포 (재직)" description="내외국인 / 회계 / 직군 × 채용경로">
        <MatrixTable
          corner="기준"
          cols={channels.map((c) => ({ key: c.code, label: c.label }))}
          rows={dimMatrix}
          showColTotal={false}
        />
      </Collapsible>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card p-4 md:p-5">
          <SectionHeader
            title="채용 경로별 정착률"
            description="해당 경로로 채용된 인원 中 재직 비율"
          />
          {channelRetentionItems.length ? (
            <BarList items={channelRetentionItems} valueSuffix="%" max={100} />
          ) : (
            <div className="text-xs text-[var(--fg-muted)] py-6 text-center">데이터 없음</div>
          )}
        </div>
        <div className="card p-4 md:p-5">
          <SectionHeader
            title="입사 코호트 잔존율"
            description="입사 연도 그룹별 현재 재직 비율"
          />
          {cohortRows.length ? (
            <MatrixTable
              corner="입사 코호트"
              cols={[
                { key: "hired", label: "채용" },
                { key: "active", label: "재직" },
                { key: "retired", label: "퇴직" },
                { key: "retention", label: "잔존율" },
              ]}
              rows={cohortRows}
              showColTotal={false}
              showRowTotal={false}
              numeric
            />
          ) : (
            <div className="text-xs text-[var(--fg-muted)] py-6 text-center">데이터 없음</div>
          )}
        </div>
      </div>
    </div>
  );
}
