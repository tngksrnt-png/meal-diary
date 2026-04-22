import type { Database } from "@/types/database";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Collapsible } from "@/components/ui/Collapsible";
import { formatKRW, formatPercent, formatTenureYears } from "@/utils/format";
import { mean, tenureMonths, turnoverRate } from "@/utils/aggregations";

type Employee = Database["public"]["Tables"]["employees"]["Row"];

type ColStat = {
  active: number;
  onLeave: number;
  retired: number;
  male: number;
  female: number;
  avgSalary: number | null;
  avgTenure: number | null;
  turnover: number;
  avgTenureRetired: number | null;
  execRet: number;
  regRet: number;
  contractRet: number;
  advRet: number;
  regActive: number;
  execActive: number;
  contractActive: number;
  advActive: number;
  prodActive: number;
  mgmtActive: number;
  prodRetired: number;
  mgmtRetired: number;
};

function computeStats(emps: Employee[]): ColStat {
  const active = emps.filter((e) => e.status_code === "재직");
  const retired = emps.filter((e) => e.status_code === "퇴직");
  const onLeave = emps.filter((e) => e.status_code === "휴직");
  return {
    active: active.length,
    onLeave: onLeave.length,
    retired: retired.length,
    male: active.filter((e) => e.gender === "남").length,
    female: active.filter((e) => e.gender === "여").length,
    avgSalary: mean(active.map((e) => e.annual_salary ?? null)),
    avgTenure: mean(active.map((e) => tenureMonths(e.hire_date))),
    turnover: turnoverRate(active.length, retired.length),
    avgTenureRetired: mean(retired.map((e) => tenureMonths(e.hire_date, e.termination_date))),
    execRet: retired.filter((e) => e.employment_type_code === "임원").length,
    regRet: retired.filter((e) => e.employment_type_code === "정규직").length,
    contractRet: retired.filter((e) => e.employment_type_code === "계약직").length,
    advRet: retired.filter((e) => e.employment_type_code === "고문").length,
    regActive: active.filter((e) => e.employment_type_code === "정규직").length,
    execActive: active.filter((e) => e.employment_type_code === "임원").length,
    contractActive: active.filter((e) => e.employment_type_code === "계약직").length,
    advActive: active.filter((e) => e.employment_type_code === "고문").length,
    prodActive: active.filter((e) => e.job_family_code === "생산").length,
    mgmtActive: active.filter((e) => e.job_family_code === "관리").length,
    prodRetired: retired.filter((e) => e.job_family_code === "생산").length,
    mgmtRetired: retired.filter((e) => e.job_family_code === "관리").length,
  };
}

function MiniStat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <div className="label-eyebrow">{label}</div>
      <div className="text-lg font-semibold num leading-tight">{value}</div>
      {sub ? <div className="text-[11px] text-muted-auto mt-0.5">{sub}</div> : null}
    </div>
  );
}

function ComparisonCard({ name, stat }: { name: string; stat: ColStat }) {
  const turnoverHigh = stat.turnover > 0.3;
  return (
    <div className="card p-4 md:p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="font-semibold tracking-tight">{name}</div>
        <span
          className={`text-[11px] px-2 py-0.5 rounded-sm num ${
            turnoverHigh ? "bg-red-100 text-[var(--danger)]" : "bg-[var(--muted)] text-[var(--fg-muted)]"
          }`}
        >
          이직률 {formatPercent(stat.turnover)}
        </span>
      </div>
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3 pb-3 border-b border-[var(--border)]">
        <MiniStat label="재직" value={stat.active.toLocaleString()} sub={`휴직 ${stat.onLeave}`} />
        <MiniStat label="퇴직" value={stat.retired.toLocaleString()} />
        <MiniStat label="평균 연봉" value={stat.active ? formatKRW(stat.avgSalary) : "-"} />
        <MiniStat label="평균 근속" value={formatTenureYears(stat.avgTenure)} />
        <MiniStat label="남 / 여" value={`${stat.male} / ${stat.female}`} />
        <MiniStat label="임원 퇴직" value={stat.execRet.toLocaleString()} />
      </div>
      <div className="grid grid-cols-4 gap-3 pt-3 text-xs">
        <div>
          <div className="label-eyebrow">고용형태 (재직)</div>
          <div className="mt-1 num">
            정규 {stat.regActive} · 계약 {stat.contractActive}
            {stat.execActive ? ` · 임원 ${stat.execActive}` : ""}
            {stat.advActive ? ` · 고문 ${stat.advActive}` : ""}
          </div>
        </div>
        <div>
          <div className="label-eyebrow">직군 (재직)</div>
          <div className="mt-1 num">
            생산 {stat.prodActive} · 관리 {stat.mgmtActive}
          </div>
        </div>
        <div>
          <div className="label-eyebrow">퇴직 유형</div>
          <div className="mt-1 num">
            정규 {stat.regRet} · 계약 {stat.contractRet}
            {stat.advRet ? ` · 고문 ${stat.advRet}` : ""}
          </div>
        </div>
        <div>
          <div className="label-eyebrow">퇴직 평균 재직</div>
          <div className="mt-1 num">{formatTenureYears(stat.avgTenureRetired)}</div>
        </div>
      </div>
    </div>
  );
}

export function WorksitesTab({
  employees,
  groups,
  title = "사업장별 HR 현황 비교",
}: {
  employees: Employee[];
  groups: { id: string; name: string; filter: (e: Employee) => boolean }[];
  title?: string;
}) {
  const totalStat = computeStats(employees);
  const perGroup = groups.map((g) => ({
    id: g.id,
    name: g.name,
    stat: computeStats(employees.filter(g.filter)),
  })).sort((a, b) => b.stat.active - a.stat.active);

  // Full matrix rows (for collapsible detail)
  const rows: { group: string; label: string; get: (s: ColStat) => string | number }[] = [
    { group: "재직자 현황", label: "재직 인원", get: (s) => s.active.toLocaleString() },
    { group: "재직자 현황", label: "휴직자", get: (s) => s.onLeave.toLocaleString() },
    { group: "재직자 현황", label: "성별 (남/여)", get: (s) => `${s.male} / ${s.female}` },
    { group: "재직자 현황", label: "평균 연봉", get: (s) => (s.active ? formatKRW(s.avgSalary) : "-") },
    { group: "재직자 현황", label: "평균 근속", get: (s) => formatTenureYears(s.avgTenure) },
    { group: "재직자 현황", label: "이직률", get: (s) => (s.active + s.retired ? formatPercent(s.turnover) : "-") },
    { group: "퇴직자 현황", label: "총 퇴직자", get: (s) => s.retired.toLocaleString() },
    { group: "퇴직자 현황", label: "평균 재직기간", get: (s) => formatTenureYears(s.avgTenureRetired) },
    { group: "퇴직자 현황", label: "임원 퇴직", get: (s) => s.execRet.toLocaleString() },
    { group: "퇴직자 현황", label: "정규직 퇴직", get: (s) => s.regRet.toLocaleString() },
    { group: "퇴직자 현황", label: "계약직 퇴직", get: (s) => s.contractRet.toLocaleString() },
    { group: "퇴직자 현황", label: "고문 퇴직", get: (s) => s.advRet.toLocaleString() },
    { group: "고용형태 (재직)", label: "정규직", get: (s) => s.regActive.toLocaleString() },
    { group: "고용형태 (재직)", label: "임원", get: (s) => s.execActive.toLocaleString() },
    { group: "고용형태 (재직)", label: "계약직", get: (s) => s.contractActive.toLocaleString() },
    { group: "고용형태 (재직)", label: "고문", get: (s) => s.advActive.toLocaleString() },
    { group: "직군 현황", label: "생산 (재직)", get: (s) => s.prodActive.toLocaleString() },
    { group: "직군 현황", label: "관리 (재직)", get: (s) => s.mgmtActive.toLocaleString() },
    { group: "직군 현황", label: "생산 (퇴직)", get: (s) => s.prodRetired.toLocaleString() },
    { group: "직군 현황", label: "관리 (퇴직)", get: (s) => s.mgmtRetired.toLocaleString() },
  ];

  const bySite = [
    { name: "전체", stat: totalStat },
    ...perGroup.map((g) => ({ name: g.name, stat: g.stat })),
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="card-dark p-4 md:p-5">
        <SectionHeader
          title={title}
          description="OVERVIEW"
          right={
            <span className="text-xs text-white/75">
              전체 재직 {totalStat.active} · 퇴직 {totalStat.retired}
            </span>
          }
        />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MiniStat
            label="재직 합계"
            value={totalStat.active.toLocaleString()}
            sub={`휴직 ${totalStat.onLeave}`}
          />
          <MiniStat label="퇴직 합계" value={totalStat.retired.toLocaleString()} />
          <MiniStat
            label="이직률"
            value={formatPercent(totalStat.turnover)}
          />
          <MiniStat label="평균 연봉" value={formatKRW(totalStat.avgSalary)} />
        </div>
      </div>

      {perGroup.length === 0 ? (
        <div className="card p-8 text-center text-sm text-[var(--fg-muted)]">
          비교할 대상이 없습니다.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {perGroup.map((g) => (
            <ComparisonCard key={g.id} name={g.name} stat={g.stat} />
          ))}
        </div>
      )}

      <Collapsible title="전체 지표 매트릭스" description="엑셀과 동일한 가로 비교표">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-[var(--fg-muted)]">
              <tr>
                <th className="text-left py-2 px-3 font-normal">분류</th>
                <th className="text-left py-2 px-3 font-normal">지표</th>
                {bySite.map((s) => (
                  <th
                    key={s.name}
                    className={`text-right py-2 px-3 font-normal whitespace-nowrap ${
                      s.name === "전체" ? "text-[var(--fg)]" : ""
                    }`}
                  >
                    {s.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const prev = rows[i - 1];
                const showGroup = !prev || prev.group !== r.group;
                return (
                  <tr
                    key={`${r.group}-${r.label}-${i}`}
                    className={`border-t border-[var(--border)] ${showGroup ? "bg-[var(--muted)]/40" : ""}`}
                  >
                    <td className="py-2 px-3 text-[var(--fg-muted)] whitespace-nowrap">
                      {showGroup ? r.group : ""}
                    </td>
                    <td className="py-2 px-3">{r.label}</td>
                    {bySite.map((s) => (
                      <td
                        key={s.name}
                        className={`py-2 px-3 text-right num whitespace-nowrap ${
                          s.name === "전체" ? "font-medium" : ""
                        }`}
                      >
                        {r.get(s.stat)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Collapsible>
    </div>
  );
}
