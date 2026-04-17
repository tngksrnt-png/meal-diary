"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

function fail(msg: string) {
  return { ok: false as const, error: msg };
}
function ok() {
  return { ok: true as const };
}

const revalidate = () => {
  revalidatePath("/");
  revalidatePath("/org");
  revalidatePath("/companies");
  revalidatePath("/admin/org");
};

// --- Category ---
const categoryCreate = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  is_hq: z.boolean().optional(),
});
export async function createCategoryAction(input: z.infer<typeof categoryCreate>) {
  await requireAdmin();
  const parsed = categoryCreate.safeParse(input);
  if (!parsed.success) return fail("입력값이 올바르지 않습니다.");
  const supabase = await createClient();
  const { error } = await supabase.from("categories").insert({
    code: parsed.data.code,
    name: parsed.data.name,
    is_hq: parsed.data.is_hq ?? false,
  });
  if (error) return fail(error.message);
  revalidate();
  return ok();
}

export async function updateCategoryAction(input: { id: string; name: string; code: string }) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("categories")
    .update({ name: input.name, code: input.code })
    .eq("id", input.id);
  if (error) return fail(error.message);
  revalidate();
  return ok();
}

export async function deleteCategoryAction(id: string) {
  await requireAdmin();
  const supabase = await createClient();
  const { count } = await supabase
    .from("companies")
    .select("id", { count: "exact", head: true })
    .eq("category_id", id);
  if ((count ?? 0) > 0) return fail("소속 법인이 있어 삭제할 수 없습니다.");
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) return fail(error.message);
  revalidate();
  return ok();
}

// --- Company ---
export async function createCompanyAction(input: { category_id: string; name: string; ceo_name?: string | null }) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("companies").insert({
    category_id: input.category_id,
    name: input.name,
    ceo_name: input.ceo_name ?? null,
  });
  if (error) return fail(error.message);
  revalidate();
  return ok();
}

export async function updateCompanyAction(input: { id: string; name: string; ceo_name?: string | null; category_id?: string }) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("companies")
    .update({
      name: input.name,
      ceo_name: input.ceo_name ?? null,
      ...(input.category_id ? { category_id: input.category_id } : {}),
    })
    .eq("id", input.id);
  if (error) return fail(error.message);
  revalidate();
  return ok();
}

export async function deleteCompanyAction(id: string) {
  await requireAdmin();
  const supabase = await createClient();
  const [{ count: wsCount }, { count: empCount }] = await Promise.all([
    supabase.from("worksites").select("id", { count: "exact", head: true }).eq("company_id", id),
    supabase.from("employees").select("id", { count: "exact", head: true }).eq("company_id", id),
  ]);
  if ((wsCount ?? 0) > 0) return fail("소속 사업장이 있어 삭제할 수 없습니다.");
  if ((empCount ?? 0) > 0) return fail("소속 직원이 있어 삭제할 수 없습니다.");
  const { error } = await supabase.from("companies").delete().eq("id", id);
  if (error) return fail(error.message);
  revalidate();
  return ok();
}

// --- Worksite ---
export async function createWorksiteAction(input: { company_id: string; name: string }) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("worksites").insert({
    company_id: input.company_id,
    name: input.name,
  });
  if (error) return fail(error.message);
  revalidate();
  return ok();
}

export async function updateWorksiteAction(input: { id: string; name: string }) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("worksites").update({ name: input.name }).eq("id", input.id);
  if (error) return fail(error.message);
  revalidate();
  return ok();
}

export async function deleteWorksiteAction(id: string) {
  await requireAdmin();
  const supabase = await createClient();
  const [{ count: depCount }, { count: empCount }] = await Promise.all([
    supabase.from("departments").select("id", { count: "exact", head: true }).eq("worksite_id", id),
    supabase.from("employees").select("id", { count: "exact", head: true }).eq("worksite_id", id),
  ]);
  if ((depCount ?? 0) > 0) return fail("소속 부서가 있어 삭제할 수 없습니다.");
  if ((empCount ?? 0) > 0) return fail("소속 직원이 있어 삭제할 수 없습니다.");
  const { error } = await supabase.from("worksites").delete().eq("id", id);
  if (error) return fail(error.message);
  revalidate();
  return ok();
}

// --- Department ---
export async function createDepartmentAction(input: {
  company_id: string;
  worksite_id?: string | null;
  parent_department_id?: string | null;
  name: string;
  kind?: "division" | "team" | "part";
}) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("departments").insert({
    company_id: input.company_id,
    worksite_id: input.worksite_id ?? null,
    parent_department_id: input.parent_department_id ?? null,
    name: input.name,
    kind: input.kind ?? "team",
  });
  if (error) return fail(error.message);
  revalidate();
  return ok();
}

export async function updateDepartmentAction(input: { id: string; name: string; kind?: "division" | "team" | "part" }) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("departments")
    .update({ name: input.name, ...(input.kind ? { kind: input.kind } : {}) })
    .eq("id", input.id);
  if (error) return fail(error.message);
  revalidate();
  return ok();
}

export async function deleteDepartmentAction(id: string) {
  await requireAdmin();
  const supabase = await createClient();
  const [{ count: childCount }, { count: empCount }] = await Promise.all([
    supabase.from("departments").select("id", { count: "exact", head: true }).eq("parent_department_id", id),
    supabase.from("employees").select("id", { count: "exact", head: true }).eq("department_id", id),
  ]);
  if ((childCount ?? 0) > 0) return fail("하위 팀이 있어 삭제할 수 없습니다.");
  if ((empCount ?? 0) > 0) return fail("소속 직원이 있어 삭제할 수 없습니다.");
  const { error } = await supabase.from("departments").delete().eq("id", id);
  if (error) return fail(error.message);
  revalidate();
  return ok();
}
