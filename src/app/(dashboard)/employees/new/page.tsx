import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { NewEmployeeForm } from "./NewEmployeeForm";

export const dynamic = "force-dynamic";

export default async function NewEmployeePage({
  searchParams,
}: {
  searchParams: Promise<{ company?: string; worksite?: string }>;
}) {
  const { company = "", worksite = "" } = await searchParams;
  const supabase = await createClient();

  const [cos, wss, deps, lks] = await Promise.all([
    supabase.from("companies").select("*").order("order_idx"),
    supabase.from("worksites").select("*").order("order_idx"),
    supabase.from("departments").select("*").order("order_idx"),
    supabase.from("lookups").select("*").order("order_idx"),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="label-eyebrow">
          <Link href="/employees" className="hover:underline">직원 명단</Link>
          <span className="mx-1.5 text-[var(--fg-subtle)]">›</span>
          신규 추가
        </div>
        <h1 className="text-xl md:text-2xl font-semibold tracking-tight leading-tight mt-1">
          직원 추가
        </h1>
      </div>

      <NewEmployeeForm
        companies={cos.data ?? []}
        worksites={wss.data ?? []}
        departments={deps.data ?? []}
        lookups={lks.data ?? []}
        defaultCompanyId={company || ((cos.data ?? [])[0]?.id ?? "")}
        defaultWorksiteId={worksite || null}
      />
    </div>
  );
}
