import "server-only";
import { createClient } from "@/lib/supabase/server";

export async function getCompanyContext(companyId: string) {
  const supabase = await createClient();
  const [cos, cats, wss, deps, lookups] = await Promise.all([
    supabase.from("companies").select("*").eq("id", companyId).maybeSingle(),
    supabase.from("categories").select("*"),
    supabase.from("worksites").select("*").eq("company_id", companyId).order("order_idx"),
    supabase.from("departments").select("*").eq("company_id", companyId).order("order_idx"),
    supabase.from("lookups").select("*").order("order_idx"),
  ]);
  const company = cos.data;
  if (!company) return null;
  const category = cats.data?.find((c) => c.id === company.category_id) ?? null;
  return {
    company,
    category,
    worksites: wss.data ?? [],
    departments: deps.data ?? [],
    lookups: lookups.data ?? [],
  };
}

export async function getCompanyEmployees(companyId: string, worksiteId?: string) {
  const supabase = await createClient();
  let q = supabase.from("employees").select("*").eq("company_id", companyId);
  if (worksiteId) q = q.eq("worksite_id", worksiteId);
  const { data } = await q.order("name");
  return data ?? [];
}
