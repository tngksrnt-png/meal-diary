"use server";
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
  revalidatePath("/admin/settings");
  revalidatePath("/companies");
};

export async function createLookupAction(input: { type: string; code: string; label: string }) {
  await requireAdmin();
  const supabase = await createClient();
  const { data: last } = await supabase
    .from("lookups")
    .select("order_idx")
    .eq("type", input.type)
    .order("order_idx", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { error } = await supabase.from("lookups").insert({
    type: input.type,
    code: input.code,
    label: input.label,
    order_idx: (last?.order_idx ?? -1) + 1,
  });
  if (error) return fail(error.message);
  revalidate();
  return ok();
}

export async function reorderLookupAction(input: { id: string; direction: "up" | "down" }) {
  await requireAdmin();
  const supabase = await createClient();
  const { data: current } = await supabase
    .from("lookups")
    .select("id,type,order_idx")
    .eq("id", input.id)
    .maybeSingle();
  if (!current) return fail("찾을 수 없습니다.");

  const neighborQ = supabase
    .from("lookups")
    .select("id,order_idx")
    .eq("type", current.type)
    .order("order_idx", { ascending: input.direction === "up" ? false : true })
    .limit(1);
  const { data: neighbor } = await (input.direction === "up"
    ? neighborQ.lt("order_idx", current.order_idx)
    : neighborQ.gt("order_idx", current.order_idx)
  ).maybeSingle();
  if (!neighbor) return ok(); // already at boundary

  // Swap via a temporary value to avoid unique conflicts (no unique on order_idx, but safe)
  const tmp = -1_000_000 - current.order_idx;
  const u1 = await supabase.from("lookups").update({ order_idx: tmp }).eq("id", current.id);
  if (u1.error) return fail(u1.error.message);
  const u2 = await supabase.from("lookups").update({ order_idx: current.order_idx }).eq("id", neighbor.id);
  if (u2.error) return fail(u2.error.message);
  const u3 = await supabase.from("lookups").update({ order_idx: neighbor.order_idx }).eq("id", current.id);
  if (u3.error) return fail(u3.error.message);

  revalidate();
  return ok();
}

export async function updateLookupAction(input: { id: string; label: string; is_active: boolean }) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("lookups")
    .update({ label: input.label, is_active: input.is_active })
    .eq("id", input.id);
  if (error) return fail(error.message);
  revalidate();
  return ok();
}

export async function deleteLookupAction(id: string) {
  await requireAdmin();
  const supabase = await createClient();
  const { data: lookup } = await supabase.from("lookups").select("type,code").eq("id", id).maybeSingle();
  if (!lookup) return fail("찾을 수 없습니다.");
  // Check usage across employees
  const field = `${lookup.type === "rank" ? "rank_code"
    : lookup.type === "employment_type" ? "employment_type_code"
    : lookup.type === "hire_channel" ? "hire_channel_code"
    : lookup.type === "education" ? "education_code"
    : lookup.type === "employee_status" ? "status_code"
    : lookup.type === "termination_reason" ? "termination_reason_code"
    : lookup.type === "accounting_type" ? "accounting_type_code"
    : "job_family_code"}`;
  const { count } = await supabase
    .from("employees")
    .select("id", { count: "exact", head: true })
    .eq(field, lookup.code);
  if ((count ?? 0) > 0) {
    return fail("이미 사용 중입니다. 비활성화만 가능합니다.");
  }
  const { error } = await supabase.from("lookups").delete().eq("id", id);
  if (error) return fail(error.message);
  revalidate();
  return ok();
}
