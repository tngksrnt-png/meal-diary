"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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
  const email = parsed.data.email.toLowerCase();
  const supabase = await createClient();

  // Look up existing auth user via service role (auth schema isn't exposed to anon/authenticated).
  // Covers the case where the user already signed up before being whitelisted — the
  // handle_new_user trigger only fires on fresh signups, so we backfill user_id here.
  let existingUserId: string | null = null;
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const admin = createAdminClient();
    const { data: list } = await admin.auth.admin.listUsers({ perPage: 200 });
    existingUserId = list?.users.find((u) => u.email?.toLowerCase() === email)?.id ?? null;
  }

  const { error } = await supabase
    .from("profiles")
    .insert({ email, role: "group_admin", user_id: existingUserId });
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
