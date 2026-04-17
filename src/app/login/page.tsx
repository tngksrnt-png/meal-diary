"use client";
import { useState } from "react";
import { motion } from "motion/react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGoogleLogin() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6 bg-[var(--bg)]">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="card w-full max-w-sm p-8 flex flex-col gap-6"
      >
        <div>
          <div className="text-2xl font-semibold tracking-tight">ReNA HR</div>
          <p className="text-sm text-[var(--fg-muted)] mt-1">
            그룹 HR 대시보드에 로그인하세요
          </p>
        </div>
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="btn btn-primary w-full justify-center py-3"
        >
          {loading ? "연결 중…" : "Google로 로그인"}
        </button>
        {error ? (
          <p className="text-xs text-[var(--danger)]">{error}</p>
        ) : null}
        <p className="text-xs text-[var(--fg-subtle)]">
          허용된 그룹 HR 계정만 접근할 수 있습니다.
        </p>
      </motion.div>
    </main>
  );
}
