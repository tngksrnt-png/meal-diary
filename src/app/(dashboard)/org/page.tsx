import { createClient } from "@/lib/supabase/server";
import { OrgTree, type OrgCategoryNode } from "@/components/org/OrgTree";

export const dynamic = "force-dynamic";

export default async function OrgPage() {
  const supabase = await createClient();
  const [cats, cos, wss, deps, emps] = await Promise.all([
    supabase.from("categories").select("*").order("order_idx"),
    supabase.from("companies").select("*").order("order_idx"),
    supabase.from("worksites").select("*").order("order_idx"),
    supabase.from("departments").select("*").order("order_idx"),
    supabase.from("employees").select("id,company_id,worksite_id,department_id,status_code"),
  ]);

  const employees = (emps.data ?? []).filter((e) => e.status_code === "재직");
  const countByCompany = new Map<string, number>();
  const countByWorksite = new Map<string, number>();
  const countByDepartment = new Map<string, number>();
  for (const e of employees) {
    countByCompany.set(e.company_id, (countByCompany.get(e.company_id) ?? 0) + 1);
    if (e.worksite_id) countByWorksite.set(e.worksite_id, (countByWorksite.get(e.worksite_id) ?? 0) + 1);
    if (e.department_id) countByDepartment.set(e.department_id, (countByDepartment.get(e.department_id) ?? 0) + 1);
  }

  const roots: OrgCategoryNode[] = (cats.data ?? []).map((cat) => {
    const companies = (cos.data ?? []).filter((c) => c.category_id === cat.id);
    return {
      id: cat.id,
      name: cat.name,
      code: cat.code,
      is_hq: cat.is_hq,
      headcount: companies.reduce((sum, c) => sum + (countByCompany.get(c.id) ?? 0), 0),
      companies: companies.map((co) => {
        const coWorksites = (wss.data ?? []).filter((w) => w.company_id === co.id);
        const coDepartments = (deps.data ?? []).filter((d) => d.company_id === co.id);

        // HQ: divisions (top-level, no worksite) + teams under each division
        const hqDivisions = cat.is_hq
          ? coDepartments
              .filter((d) => d.kind === "division")
              .map((div) => ({
                id: div.id,
                name: div.name,
                headcount: countByDepartment.get(div.id) ?? 0,
                teams: coDepartments
                  .filter((t) => t.parent_department_id === div.id)
                  .map((t) => ({
                    id: t.id,
                    name: t.name,
                    headcount: countByDepartment.get(t.id) ?? 0,
                  })),
              }))
          : [];

        const worksites = coWorksites.map((w) => ({
          id: w.id,
          name: w.name,
          headcount: countByWorksite.get(w.id) ?? 0,
          departments: coDepartments
            .filter((d) => d.worksite_id === w.id)
            .map((d) => ({
              id: d.id,
              name: d.name,
              headcount: countByDepartment.get(d.id) ?? 0,
            })),
        }));

        return {
          id: co.id,
          name: co.name,
          ceo_name: co.ceo_name,
          headcount: countByCompany.get(co.id) ?? 0,
          worksites,
          hqDivisions,
        };
      }),
    };
  });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl md:text-2xl font-semibold tracking-tight">조직도</h1>
        <p className="text-sm text-[var(--fg-muted)] mt-1">
          카테고리 → 법인 → 사업장 → 부서 계층. 배지 숫자는 현재 재직 인원.
        </p>
      </div>
      <OrgTree roots={roots} />
    </div>
  );
}
