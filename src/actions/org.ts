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
  const { data: last } = await supabase
    .from("categories")
    .select("order_idx")
    .order("order_idx", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { error } = await supabase.from("categories").insert({
    code: parsed.data.code,
    name: parsed.data.name,
    is_hq: parsed.data.is_hq ?? false,
    order_idx: (last?.order_idx ?? -1) + 1,
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
  const { data: last } = await supabase
    .from("companies")
    .select("order_idx")
    .eq("category_id", input.category_id)
    .order("order_idx", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { error } = await supabase.from("companies").insert({
    category_id: input.category_id,
    name: input.name,
    ceo_name: input.ceo_name ?? null,
    order_idx: (last?.order_idx ?? -1) + 1,
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
  const { data: last } = await supabase
    .from("worksites")
    .select("order_idx")
    .eq("company_id", input.company_id)
    .order("order_idx", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { error } = await supabase.from("worksites").insert({
    company_id: input.company_id,
    name: input.name,
    order_idx: (last?.order_idx ?? -1) + 1,
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
  // Scope order_idx within sibling set (same worksite OR same parent)
  let q = supabase
    .from("departments")
    .select("order_idx")
    .eq("company_id", input.company_id)
    .order("order_idx", { ascending: false })
    .limit(1);
  if (input.parent_department_id) {
    q = q.eq("parent_department_id", input.parent_department_id);
  } else if (input.worksite_id) {
    q = q.eq("worksite_id", input.worksite_id);
  } else {
    q = q.is("worksite_id", null).is("parent_department_id", null);
  }
  const { data: last } = await q.maybeSingle();

  const { error } = await supabase.from("departments").insert({
    company_id: input.company_id,
    worksite_id: input.worksite_id ?? null,
    parent_department_id: input.parent_department_id ?? null,
    name: input.name,
    kind: input.kind ?? "team",
    order_idx: (last?.order_idx ?? -1) + 1,
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

// =====================================================================
// Reorder helpers — swap order_idx with adjacent sibling
// =====================================================================

type ReorderTable = "categories" | "companies" | "worksites" | "departments";

async function reorderSwap(
  table: ReorderTable,
  id: string,
  direction: "up" | "down",
  scope: { column: string; value: string | null }[] = [],
) {
  const supabase = await createClient();
  const { data: target, error: te } = await supabase
    .from(table)
    .select("id,order_idx")
    .eq("id", id)
    .maybeSingle();
  if (te || !target) return fail("대상을 찾지 못했습니다.");

  let q = supabase.from(table).select("id,order_idx");
  for (const s of scope) {
    q = s.value === null ? q.is(s.column, null) : q.eq(s.column, s.value);
  }
  if (direction === "up") {
    q = q.lt("order_idx", target.order_idx).order("order_idx", { ascending: false }).limit(1);
  } else {
    q = q.gt("order_idx", target.order_idx).order("order_idx", { ascending: true }).limit(1);
  }
  const { data: neighbor } = await q.maybeSingle();
  if (!neighbor) return fail("더 이동할 수 없습니다.");

  const a = target.order_idx;
  const b = neighbor.order_idx;
  // Two updates — Supabase has no atomic swap, but order_idx mismatch during transit is harmless
  const { error: e1 } = await supabase.from(table).update({ order_idx: -1 }).eq("id", target.id);
  if (e1) return fail(e1.message);
  const { error: e2 } = await supabase.from(table).update({ order_idx: a }).eq("id", neighbor.id);
  if (e2) return fail(e2.message);
  const { error: e3 } = await supabase.from(table).update({ order_idx: b }).eq("id", target.id);
  if (e3) return fail(e3.message);
  revalidate();
  return ok();
}

export async function reorderCategoryAction(id: string, direction: "up" | "down") {
  await requireAdmin();
  return reorderSwap("categories", id, direction);
}

export async function reorderCompanyAction(id: string, direction: "up" | "down") {
  await requireAdmin();
  const supabase = await createClient();
  const { data: row } = await supabase.from("companies").select("category_id").eq("id", id).maybeSingle();
  if (!row) return fail("법인을 찾지 못했습니다.");
  return reorderSwap("companies", id, direction, [{ column: "category_id", value: row.category_id }]);
}

export async function reorderWorksiteAction(id: string, direction: "up" | "down") {
  await requireAdmin();
  const supabase = await createClient();
  const { data: row } = await supabase.from("worksites").select("company_id").eq("id", id).maybeSingle();
  if (!row) return fail("사업장을 찾지 못했습니다.");
  return reorderSwap("worksites", id, direction, [{ column: "company_id", value: row.company_id }]);
}

export async function reorderDepartmentAction(id: string, direction: "up" | "down") {
  await requireAdmin();
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("departments")
    .select("company_id,worksite_id,parent_department_id")
    .eq("id", id)
    .maybeSingle();
  if (!row) return fail("부서를 찾지 못했습니다.");
  // Scope: same parent_department_id OR same worksite_id (HQ vs BU branch)
  const scope: { column: string; value: string | null }[] = [
    { column: "company_id", value: row.company_id },
  ];
  if (row.parent_department_id) {
    scope.push({ column: "parent_department_id", value: row.parent_department_id });
  } else {
    scope.push({ column: "parent_department_id", value: null });
    scope.push({ column: "worksite_id", value: row.worksite_id });
  }
  return reorderSwap("departments", id, direction, scope);
}

// =====================================================================
// Move actions — change parent
// =====================================================================

async function nextOrderIdx(table: ReorderTable, scope: { column: string; value: string | null }[]) {
  const supabase = await createClient();
  let q = supabase.from(table).select("order_idx").order("order_idx", { ascending: false }).limit(1);
  for (const s of scope) {
    q = s.value === null ? q.is(s.column, null) : q.eq(s.column, s.value);
  }
  const { data } = await q.maybeSingle();
  return (data?.order_idx ?? -1) + 1;
}

export async function moveCompanyAction(input: { id: string; new_category_id: string }) {
  await requireAdmin();
  const supabase = await createClient();
  const newIdx = await nextOrderIdx("companies", [
    { column: "category_id", value: input.new_category_id },
  ]);
  const { error } = await supabase
    .from("companies")
    .update({ category_id: input.new_category_id, order_idx: newIdx })
    .eq("id", input.id);
  if (error) return fail(error.message);
  revalidate();
  return ok();
}

export async function moveWorksiteAction(input: { id: string; new_company_id: string }) {
  await requireAdmin();
  const supabase = await createClient();
  const { data: cur } = await supabase
    .from("worksites")
    .select("company_id")
    .eq("id", input.id)
    .maybeSingle();
  if (!cur) return fail("사업장을 찾지 못했습니다.");
  if (cur.company_id === input.new_company_id) return ok();

  const newIdx = await nextOrderIdx("worksites", [
    { column: "company_id", value: input.new_company_id },
  ]);
  // Cascade: employees in this worksite move to the new company
  const { error: ue } = await supabase
    .from("employees")
    .update({ company_id: input.new_company_id })
    .eq("worksite_id", input.id);
  if (ue) return fail(ue.message);
  // Cascade: departments under this worksite move to the new company
  const { error: ud } = await supabase
    .from("departments")
    .update({ company_id: input.new_company_id })
    .eq("worksite_id", input.id);
  if (ud) return fail(ud.message);
  const { error } = await supabase
    .from("worksites")
    .update({ company_id: input.new_company_id, order_idx: newIdx })
    .eq("id", input.id);
  if (error) return fail(error.message);
  revalidate();
  return ok();
}

export async function moveDepartmentAction(input: {
  id: string;
  new_worksite_id?: string | null;
  new_parent_department_id?: string | null;
}) {
  await requireAdmin();
  const supabase = await createClient();
  const { data: cur } = await supabase
    .from("departments")
    .select("company_id,worksite_id,parent_department_id")
    .eq("id", input.id)
    .maybeSingle();
  if (!cur) return fail("부서를 찾지 못했습니다.");

  type DeptUpdate = {
    parent_department_id?: string | null;
    worksite_id?: string | null;
    company_id?: string;
    order_idx?: number;
  };
  const updates: DeptUpdate = {};
  let scopeCol: string;
  let scopeVal: string | null;
  if (input.new_parent_department_id !== undefined) {
    updates.parent_department_id = input.new_parent_department_id;
    updates.worksite_id = null;
    scopeCol = "parent_department_id";
    scopeVal = input.new_parent_department_id;
  } else if (input.new_worksite_id !== undefined) {
    updates.worksite_id = input.new_worksite_id;
    updates.parent_department_id = null;
    scopeCol = "worksite_id";
    scopeVal = input.new_worksite_id;
  } else {
    return fail("이동 대상이 지정되지 않았습니다.");
  }

  // Determine target company_id from new parent / worksite
  let newCompanyId: string | null = cur.company_id;
  if (input.new_worksite_id) {
    const { data: ws } = await supabase
      .from("worksites")
      .select("company_id")
      .eq("id", input.new_worksite_id)
      .maybeSingle();
    if (ws) newCompanyId = ws.company_id;
  } else if (input.new_parent_department_id) {
    const { data: pd } = await supabase
      .from("departments")
      .select("company_id")
      .eq("id", input.new_parent_department_id)
      .maybeSingle();
    if (pd) newCompanyId = pd.company_id;
  }
  if (newCompanyId !== cur.company_id) {
    updates.company_id = newCompanyId;
    // Cascade employees in this department to new company
    const { error: ue } = await supabase
      .from("employees")
      .update({ company_id: newCompanyId, worksite_id: input.new_worksite_id ?? null })
      .eq("department_id", input.id);
    if (ue) return fail(ue.message);
  } else if (input.new_worksite_id !== undefined) {
    // Same company, only worksite changed → update employees' worksite
    const { error: ue } = await supabase
      .from("employees")
      .update({ worksite_id: input.new_worksite_id })
      .eq("department_id", input.id);
    if (ue) return fail(ue.message);
  }

  const newIdx = await nextOrderIdx("departments", [
    { column: scopeCol, value: scopeVal },
  ]);
  updates.order_idx = newIdx;
  const { error } = await supabase.from("departments").update(updates).eq("id", input.id);
  if (error) return fail(error.message);
  revalidate();
  return ok();
}
