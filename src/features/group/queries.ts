import "server-only";
import { createClient } from "@/lib/supabase/server";

export async function getGroupOverview() {
  const supabase = await createClient();

  const [
    { data: categories },
    { data: companies },
    { data: worksites },
    { data: departments },
    { data: employees },
  ] = await Promise.all([
    supabase.from("categories").select("*").order("order_idx"),
    supabase.from("companies").select("*").order("order_idx"),
    supabase.from("worksites").select("id,company_id"),
    supabase.from("departments").select("id,company_id"),
    supabase.from("employees").select(
      "id,company_id,status_code,gender,annual_salary,hire_date,termination_date,total_career_years",
    ),
  ]);

  return {
    categories: categories ?? [],
    companies: companies ?? [],
    worksites: worksites ?? [],
    departments: departments ?? [],
    employees: employees ?? [],
  };
}
