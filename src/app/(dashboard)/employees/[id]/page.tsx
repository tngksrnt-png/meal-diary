import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EmployeeEditForm } from "./EmployeeEditForm";
import { StatusActions } from "./StatusActions";

export const dynamic = "force-dynamic";

export default async function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [empRes, cos, wss, deps, lks] = await Promise.all([
    supabase.from("employees").select("*").eq("id", id).maybeSingle(),
    supabase.from("companies").select("*").order("order_idx"),
    supabase.from("worksites").select("*").order("order_idx"),
    supabase.from("departments").select("*").order("order_idx"),
    supabase.from("lookups").select("*").order("order_idx"),
  ]);

  const emp = empRes.data;
  if (!emp) notFound();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="label-eyebrow">
            <Link href="/employees" className="hover:underline">직원 명단</Link>
            <span className="mx-1.5 text-[var(--fg-subtle)]">›</span>
            {emp.employee_no ?? emp.id.slice(0, 8)}
          </div>
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight leading-tight mt-1">
            {emp.name}
            <span
              className={`ml-2 text-[11px] px-2 py-0.5 rounded-sm align-middle num ${
                emp.status_code === "재직"
                  ? "bg-[var(--brand-soft)] text-[var(--brand)]"
                  : emp.status_code === "퇴직"
                  ? "bg-red-100 text-[var(--danger)]"
                  : "bg-[var(--accent-soft)] text-[var(--accent)]"
              }`}
            >
              {emp.status_code}
            </span>
          </h1>
        </div>
      </div>

      <StatusActions
        employeeId={emp.id}
        currentStatus={emp.status_code}
        terminationReasons={(lks.data ?? []).filter((l) => l.type === "termination_reason" && l.is_active)}
      />

      <EmployeeEditForm
        employee={emp}
        companies={cos.data ?? []}
        worksites={wss.data ?? []}
        departments={deps.data ?? []}
        lookups={lks.data ?? []}
      />
    </div>
  );
}
