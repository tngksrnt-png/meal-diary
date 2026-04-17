"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

const emailSchema = z.object({ email: z.string().email() });

function fail(msg: string) {
  return { ok: false as const, error: msg };
}
function ok() {
  return { ok: true as const };
}

export async function addWhitelistAction(input: { email: string }) {
  await requireAdmin();
  const parsed = emailSchema.safeParse(input);
  if (!parsed.success) return fail("이메일 형식이 올바르지 않습니다.");
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .insert({ email: parsed.data.email.toLowerCase(), role: "group_admin" });
  if (error) return fail(error.message);
  revalidatePath("/admin/users");
  return ok();
}

export async function removeWhitelistAction(id: string) {
  const me = await requireAdmin();
  if (id === me.id) return fail("본인 계정은 삭제할 수 없습니다.");
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").delete().eq("id", id);
  if (error) return fail(error.message);
  revalidatePath("/admin/users");
  return ok();
}
