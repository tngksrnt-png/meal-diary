import { notFound } from "next/navigation";
import Link from "next/link";
import { getCompanyContext, getCompanyEmployees } from "@/features/company/queries";
import { CompanyTabs } from "@/components/company/CompanyTabs";
import { WorksiteFilter } from "@/components/company/WorksiteFilter";
import { ActiveTab } from "./tabs/ActiveTab";
import { PlaceholderTab } from "./tabs/PlaceholderTab";

export const dynamic = "force-dynamic";

export default async function CompanyPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; worksite?: string }>;
}) {
  const { id } = await params;
  const { tab = "active", worksite = "" } = await searchParams;

  const ctx = await getCompanyContext(id);
  if (!ctx) notFound();
  const { company, category, worksites, departments, lookups } = ctx;

  const employees = await getCompanyEmployees(id, worksite || undefined);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="text-xs text-[var(--fg-muted)]">
            <Link href="/companies" className="hover:underline">법인</Link>
            {category ? <> · {category.name}</> : null}
          </div>
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight mt-1">
            {company.name}
          </h1>
          {company.ceo_name ? (
            <p className="text-sm text-[var(--fg-muted)] mt-0.5">{company.ceo_name}</p>
          ) : null}
        </div>
      </div>

      <CompanyTabs companyId={company.id} />

      {worksites.length > 0 ? (
        <WorksiteFilter
          companyId={company.id}
          worksites={worksites.map((w) => ({ id: w.id, name: w.name }))}
        />
      ) : null}

      {tab === "active" ? (
        <ActiveTab
          employees={employees}
          departments={departments}
          worksites={worksites}
          lookups={lookups}
        />
      ) : (
        <PlaceholderTab tab={tab} />
      )}
    </div>
  );
}
