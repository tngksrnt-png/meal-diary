import Link from "next/link";
import { getGroupOverview } from "@/features/group/queries";
import { KpiCard, KpiGrid } from "@/components/kpi/KpiCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { BarList } from "@/components/charts/BarList";
import { DonutChart } from "@/components/charts/DonutChart";
import { formatKRW, formatPercent } from "@/utils/format";
import { mean, turnoverRate } from "@/utils/aggregations";

export const dynamic = "force-dynamic";

export default async function GroupDashboardPage() {
  const { categories, companies, employees } = await getGroupOverview();

  const active = employees.filter((e) => e.status_code === "재직");
  const onLeave = employees.filter((e) => e.status_code === "휴직");
  const retired = employees.filter((e) => e.status_code === "퇴직");
  const male = active.filter((e) => e.gender === "남").length;
  const female = active.filter((e) => e.gender === "여").length;
  const avgSalary = mean(active.map((e) => e.annual_salary ?? null));
  const turnover = turnoverRate(active.length, retired.length);

  const byCategory = categories.map((cat) => {
    const compIds = new Set(companies.filter((c) => c.category_id === cat.id).map((c) => c.id));
    const headcount = active.filter((e) => compIds.has(e.company_id)).length;
    return { id: cat.id, name: cat.name, code: cat.code, value: headcount };
  });

  const byCompany = companies
    .map((co) => {
      const headcount = active.filter((e) => e.company_id === co.id).length;
      const cat = categories.find((c) => c.id === co.category_id);
      return {
        label: co.name,
        value: headcount,
        href: `/companies/${co.id}`,
        category: cat?.code ?? "",
      };
    })
    .sort((a, b) => b.value - a.value);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl md:text-2xl font-semibold tracking-tight">그룹 HR 대시보드</h1>
        <p className="text-sm text-[var(--fg-muted)] mt-1">
          ReNA 그룹 전체 재직·퇴직·조직 현황
        </p>
      </div>

      <KpiGrid>
        <KpiCard
          label="재직 인원"
          value={active.length.toLocaleString()}
          sub={`${companies.length}개 법인`}
          tone="brand"
        />
        <KpiCard label="휴직" value={onLeave.length.toLocaleString()} />
        <KpiCard label="퇴직 누적" value={retired.length.toLocaleString()} tone="warn" />
        <KpiCard
          label="이직률"
          value={formatPercent(turnover)}
          sub="재직/퇴직 합계 대비"
        />
        <KpiCard label="평균 연봉" value={formatKRW(avgSalary ?? 0)} />
      </KpiGrid>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card p-4 md:p-5">
          <SectionHeader
            title="카테고리(BU)별 재직 인원"
            description="HQ · Sorting · MR · WtE · Shredding · Oil·Others"
          />
          {byCategory.some((c) => c.value > 0) ? (
            <DonutChart
              data={byCategory.filter((c) => c.value > 0).map((c) => ({ name: c.name, value: c.value }))}
              totalLabel="전체 재직"
            />
          ) : (
            <EmptyState>
              아직 직원 데이터가 없습니다. <Link className="underline" href="/admin/import">Excel 업로드</Link>로 시작하세요.
            </EmptyState>
          )}
          <ul className="mt-4 flex flex-col gap-1 text-xs">
            {byCategory.map((c) => (
              <li key={c.id} className="flex justify-between">
                <span className="text-[var(--fg-muted)]">{c.name}</span>
                <span className="tabular-nums">{c.value}명</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="card p-4 md:p-5">
          <SectionHeader
            title="성별 구성 (재직)"
            right={
              <span className="text-xs text-[var(--fg-muted)]">
                남 {male} · 여 {female}
              </span>
            }
          />
          {male + female > 0 ? (
            <DonutChart
              data={[
                { name: "남", value: male },
                { name: "여", value: female },
              ]}
            />
          ) : (
            <EmptyState>성별 데이터 없음</EmptyState>
          )}
        </div>
      </div>

      <div className="card p-4 md:p-5">
        <SectionHeader
          title="법인별 재직 인원"
          description="클릭하면 해당 법인 HR 대시보드로 이동합니다"
        />
        {byCompany.length ? (
          <BarList
            items={byCompany.map((c) => ({
              label: `${c.label}  ·  ${c.category}`,
              value: c.value,
              href: c.href,
            }))}
            valueFormatter={(n) => `${n}명`}
          />
        ) : (
          <EmptyState>법인 정보 없음</EmptyState>
        )}
      </div>
    </div>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-[var(--border)] p-6 text-sm text-[var(--fg-muted)] text-center">
      {children}
    </div>
  );
}
