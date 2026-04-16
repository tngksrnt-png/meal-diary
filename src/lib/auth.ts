"use client";

import { createClient } from "@/lib/supabase/client";

export async function handleGoogleSignIn() {
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });
  if (error) {
    console.error("Login error:", error.message);
  }
}

export async function handleSignOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  window.location.href = "/login";
}
