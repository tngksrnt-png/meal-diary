import { createClient } from "@/lib/supabase/server";
import { OrgTree, type OrgCategoryNode, type OrgCounts } from "@/components/org/OrgTree";
import { KpiCard, KpiGrid } from "@/components/kpi/KpiCard";

export const dynamic = "force-dynamic";

const ZERO: OrgCounts = { active: 0, onLeave: 0, retired: 0 };

function add(a: OrgCounts, b: OrgCounts): OrgCounts {
  return {
    active: a.active + b.active,
    onLeave: a.onLeave + b.onLeave,
    retired: a.retired + b.retired,
  };
}

export default async function OrgPage() {
  const supabase = await createClient();
  const [cats, cos, wss, deps, emps] = await Promise.all([
    supabase.from("categories").select("*").order("order_idx"),
    supabase.from("companies").select("*").order("order_idx"),
    supabase.from("worksites").select("*").order("order_idx"),
    supabase.from("departments").select("*").order("order_idx"),
    supabase.from("employees").select("id,company_id,worksite_id,department_id,status_code"),
  ]);

  const employees = emps.data ?? [];

  // Per-key status counts
  const cByCompany = new Map<string, OrgCounts>();
  const cByWorksite = new Map<string, OrgCounts>();
  const cByDept = new Map<string, OrgCounts>();
  function bump(map: Map<string, OrgCounts>, key: string, status: string | null) {
    const cur = map.get(key) ?? { ...ZERO };
    if (status === "재직") cur.active += 1;
    else if (status === "휴직") cur.onLeave += 1;
    else if (status === "퇴직") cur.retired += 1;
    map.set(key, cur);
  }
  for (const e of employees) {
    bump(cByCompany, e.company_id, e.status_code);
    if (e.worksite_id) bump(cByWorksite, e.worksite_id, e.status_code);
    if (e.department_id) bump(cByDept, e.department_id, e.status_code);
  }

  const roots: OrgCategoryNode[] = (cats.data ?? []).map((cat) => {
    const companies = (cos.data ?? []).filter((c) => c.category_id === cat.id);

    const builtCompanies = companies.map((co) => {
      const coWorksites = (wss.data ?? []).filter((w) => w.company_id === co.id);
      const coDepartments = (deps.data ?? []).filter((d) => d.company_id === co.id);

      const hqDivisions = cat.is_hq
        ? coDepartments
            .filter((d) => d.kind === "division")
            .map((div) => {
              const teams = coDepartments
                .filter((t) => t.parent_department_id === div.id)
                .map((t) => ({
                  id: t.id,
                  name: t.name,
                  counts: cByDept.get(t.id) ?? { ...ZERO },
                }));
              const divDirect = cByDept.get(div.id) ?? { ...ZERO };
              const divTotal = teams.reduce((s, t) => add(s, t.counts), divDirect);
              return { id: div.id, name: div.name, counts: divTotal, teams };
            })
        : [];

      const worksites = coWorksites.map((w) => {
        const departments = coDepartments
          .filter((d) => d.worksite_id === w.id)
          .map((d) => ({
            id: d.id,
            name: d.name,
            counts: cByDept.get(d.id) ?? { ...ZERO },
          }));
        const wDirect = cByWorksite.get(w.id) ?? { ...ZERO };
        const wTotal = departments.reduce((s, d) => add(s, d.counts), wDirect);
        return { id: w.id, name: w.name, counts: wTotal, departments };
      });

      const coCounts = cByCompany.get(co.id) ?? { ...ZERO };
      return {
        id: co.id,
        name: co.name,
        ceo_name: co.ceo_name,
        counts: coCounts,
        worksites,
        hqDivisions,
      };
    });

    const catCounts = builtCompanies.reduce((s, c) => add(s, c.counts), { ...ZERO });
    return {
      id: cat.id,
      name: cat.name,
      code: cat.code,
      is_hq: cat.is_hq,
      counts: catCounts,
      companies: builtCompanies,
    };
  });

  // Top KPI summary
  const buCount = (cats.data ?? []).filter((c) => !c.is_hq).length;
  const hqCount = (cats.data ?? []).filter((c) => c.is_hq).length;
  const companyCount = (cos.data ?? []).length;
  const worksiteCount = (wss.data ?? []).length;
  const deptCount = (deps.data ?? []).length;

  const groupCounts = roots.reduce((s, r) => add(s, r.counts), { ...ZERO });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl md:text-2xl font-semibold tracking-tight">조직도</h1>
        <p className="text-sm text-[var(--fg-muted)] mt-1">
          BU(카테고리) → 법인 → 사업장/부문 → 부서/팀 계층. 배지: <span className="text-[var(--brand)] font-medium">재직</span> · <span className="text-[var(--warn)]">휴</span> · <span className="text-[var(--danger)]">퇴</span>
        </p>
      </div>

      <KpiGrid cols={6}>
        <KpiCard label="BU" value={buCount.toLocaleString()} sub={hqCount ? `HQ ${hqCount}개 별도` : undefined} />
        <KpiCard label="법인" value={companyCount.toLocaleString()} />
        <KpiCard label="사업장" value={worksiteCount.toLocaleString()} />
        <KpiCard label="부서·팀" value={deptCount.toLocaleString()} />
        <KpiCard label="재직 인원" value={groupCounts.active.toLocaleString()} tone="brand" />
        <KpiCard
          label="휴직 / 퇴직"
          value={
            <span className="text-base md:text-lg leading-tight">
              휴 {groupCounts.onLeave} · 퇴 {groupCounts.retired}
            </span>
          }
        />
      </KpiGrid>

      <OrgTree roots={roots} />
    </div>
  );
}
