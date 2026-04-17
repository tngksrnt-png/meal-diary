import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SectionHeader } from "@/components/ui/SectionHeader";

export const dynamic = "force-dynamic";

export default async function CompaniesPage() {
  const supabase = await createClient();
  const [cats, cos, emps] = await Promise.all([
    supabase.from("categories").select("*").order("order_idx"),
    supabase.from("companies").select("*").order("order_idx"),
    supabase.from("employees").select("id,company_id,status_code"),
  ]);

  const activeByCompany = new Map<string, number>();
  const retiredByCompany = new Map<string, number>();
  for (const e of emps.data ?? []) {
    if (e.status_code === "재직") activeByCompany.set(e.company_id, (activeByCompany.get(e.company_id) ?? 0) + 1);
    if (e.status_code === "퇴직") retiredByCompany.set(e.company_id, (retiredByCompany.get(e.company_id) ?? 0) + 1);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl md:text-2xl font-semibold tracking-tight">법인 목록</h1>
        <p className="text-sm text-[var(--fg-muted)] mt-1">
          카테고리(BU) 기준 그룹핑. 카드를 클릭하면 해당 법인 HR 대시보드로 이동합니다.
        </p>
      </div>
      {(cats.data ?? []).map((cat) => {
        const companies = (cos.data ?? []).filter((c) => c.category_id === cat.id);
        if (companies.length === 0) return null;
        return (
          <section key={cat.id} className="flex flex-col gap-3">
            <SectionHeader
              title={cat.name}
              right={<span className="text-xs text-[var(--fg-muted)]">{companies.length}개 법인</span>}
            />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {companies.map((co) => {
                const active = activeByCompany.get(co.id) ?? 0;
                const retired = retiredByCompany.get(co.id) ?? 0;
                return (
                  <Link
                    key={co.id}
                    href={`/companies/${co.id}`}
                    className="card p-4 hover:border-[var(--brand)] transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-medium">{co.name}</div>
                        {co.ceo_name ? (
                          <div className="text-xs text-[var(--fg-muted)] mt-0.5">
                            {co.ceo_name}
                          </div>
                        ) : null}
                      </div>
                      <span className="text-[11px] rounded-full bg-[var(--brand-soft)] text-[var(--brand)] px-2 py-0.5">
                        {cat.code}
                      </span>
                    </div>
                    <div className="mt-3 flex items-end gap-4">
                      <div>
                        <div className="text-xs text-[var(--fg-muted)]">재직</div>
                        <div className="text-lg font-semibold tabular-nums">{active}</div>
                      </div>
                      <div>
                        <div className="text-xs text-[var(--fg-muted)]">퇴직 누적</div>
                        <div className="text-lg tabular-nums text-[var(--fg-muted)]">{retired}</div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
