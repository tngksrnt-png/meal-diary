import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function getSession() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * Returns the whitelisted profile for the current user or null if not whitelisted.
 */
export async function getAllowedProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, role, user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  return profile ?? null;
}

/**
 * Guard for dashboard routes. Redirects to /login if unauthenticated,
 * or /no-access if authenticated but not whitelisted.
 */
export async function requireAdmin() {
  const profile = await getAllowedProfile();
  if (!profile) {
    // Distinguish: if there's a user but no profile, send to no-access
    const user = await getSession();
    if (user) redirect("/no-access");
    redirect("/login");
  }
  return profile;
}
