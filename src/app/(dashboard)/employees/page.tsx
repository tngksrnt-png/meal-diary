import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ScopeHeader } from "@/components/ui/ScopeHeader";
import { ScopeFilter } from "@/components/filters/ScopeFilter";
import { EmployeeListClient } from "./EmployeeListClient";

export const dynamic = "force-dynamic";

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{
    bu?: string;
    company?: string;
    worksite?: string;
    status?: "재직" | "휴직" | "퇴직";
    q?: string;
  }>;
}) {
  const { bu = "", company = "", worksite = "", status = "재직", q = "" } = await searchParams;
  const supabase = await createClient();

  const [cats, cos, wss, deps, lks, emps] = await Promise.all([
    supabase.from("categories").select("*").order("order_idx"),
    supabase.from("companies").select("*").order("order_idx"),
    supabase.from("worksites").select("*").order("order_idx"),
    supabase.from("departments").select("*").order("order_idx"),
    supabase.from("lookups").select("*").order("order_idx"),
    supabase.from("employees").select("*"),
  ]);

  const categories = cats.data ?? [];
  const companies = cos.data ?? [];
  const worksites = wss.data ?? [];
  const departments = deps.data ?? [];
  const lookups = lks.data ?? [];
  const employees = emps.data ?? [];

  // Apply scope + status + search
  let rows = employees;
  if (worksite) rows = rows.filter((e) => e.worksite_id === worksite);
  else if (company) rows = rows.filter((e) => e.company_id === company);
  else if (bu) {
    const buCompanyIds = new Set(
      companies.filter((c) => c.category_id === bu).map((c) => c.id),
    );
    rows = rows.filter((e) => buCompanyIds.has(e.company_id));
  }
  rows = rows.filter((e) => e.status_code === status);
  const query = q.trim().toLowerCase();
  if (query) {
    rows = rows.filter(
      (e) =>
        e.name.toLowerCase().includes(query) ||
        (e.employee_no ?? "").toLowerCase().includes(query),
    );
  }
  return (
    <div className="flex flex-col gap-4">
      <ScopeHeader crumbs={[{ label: "직원 명단" }]} />

      <ScopeFilter categories={categories} companies={companies} worksites={worksites} />

      <div className="flex items-center justify-end gap-2 flex-wrap">
        <Link
          href={{
            pathname: "/employees/new",
            query: { bu, company, worksite },
          }}
          className="btn btn-primary !text-xs"
        >
          + 직원 추가
        </Link>
      </div>

      <EmployeeListClient
        rows={rows}
        status={status}
        q={q}
        categories={categories}
        companies={companies}
        worksites={worksites}
        departments={departments}
        lookups={lookups}
      />
    </div>
  );
}
