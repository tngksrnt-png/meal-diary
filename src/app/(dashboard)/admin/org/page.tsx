import { createClient } from "@/lib/supabase/server";
import { OrgAdminClient, type OrgAdminData } from "./OrgAdminClient";

export const dynamic = "force-dynamic";

export default async function AdminOrgPage() {
  const supabase = await createClient();
  const [cats, cos, wss, deps, emps] = await Promise.all([
    supabase.from("categories").select("*").order("order_idx"),
    supabase.from("companies").select("*").order("order_idx"),
    supabase.from("worksites").select("*").order("order_idx"),
    supabase.from("departments").select("*").order("order_idx"),
    supabase.from("employees").select("id,company_id,worksite_id,department_id"),
  ]);

  const data: OrgAdminData = {
    categories: cats.data ?? [],
    companies: cos.data ?? [],
    worksites: wss.data ?? [],
    departments: deps.data ?? [],
    counts: {
      byCompany: Object.fromEntries(
        (cos.data ?? []).map((c) => [
          c.id,
          (emps.data ?? []).filter((e) => e.company_id === c.id).length,
        ]),
      ),
      byWorksite: Object.fromEntries(
        (wss.data ?? []).map((w) => [
          w.id,
          (emps.data ?? []).filter((e) => e.worksite_id === w.id).length,
        ]),
      ),
      byDepartment: Object.fromEntries(
        (deps.data ?? []).map((d) => [
          d.id,
          (emps.data ?? []).filter((e) => e.department_id === d.id).length,
        ]),
      ),
    },
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl md:text-2xl font-semibold tracking-tight">조직 구조 관리</h1>
        <p className="text-sm text-[var(--fg-muted)] mt-1">
          BU → 법인 → 사업장 → 부서 트리에서 추가/수정/삭제
        </p>
      </div>
      <OrgAdminClient data={data} />
    </div>
  );
}
