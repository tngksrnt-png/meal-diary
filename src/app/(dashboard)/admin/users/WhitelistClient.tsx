"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Database } from "@/types/database";
import { addWhitelistAction, removeWhitelistAction } from "@/actions/users";

type P = Database["public"]["Tables"]["profiles"]["Row"];

export function WhitelistClient({
  profiles,
  currentUserId,
}: {
  profiles: P[];
  currentUserId: string | null;
}) {
  const [email, setEmail] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) => {
    setErr(null);
    start(async () => {
      const r = await fn();
      if (!r.ok) {
        setErr(r.error ?? "오류");
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="card p-4 flex items-center gap-2 flex-wrap">
        <input
          type="email"
          placeholder="email@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm w-72"
        />
        <button
          className="btn btn-primary !text-xs"
          disabled={!email || pending}
          onClick={() =>
            run(async () => {
              const r = await addWhitelistAction({ email });
              if (r.ok) setEmail("");
              return r;
            })
          }
        >
          추가
        </button>
        {err && <span className="text-xs text-[var(--danger)]">{err}</span>}
      </div>

      <div className="card overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="text-[var(--fg-muted)]">
            <tr>
              <th className="text-left py-2 px-3 font-normal">이메일</th>
              <th className="text-left py-2 px-3 font-normal">상태</th>
              <th className="text-left py-2 px-3 font-normal">역할</th>
              <th className="text-left py-2 px-3 font-normal">추가일</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {profiles.map((p) => (
              <tr key={p.id} className="border-t border-[var(--border)]">
                <td className="py-2 px-3">{p.email}</td>
                <td className="py-2 px-3 text-xs">
                  {p.user_id ? (
                    <span className="text-[var(--brand)]">연결됨</span>
                  ) : (
                    <span className="text-[var(--fg-muted)]">미연결(가입 대기)</span>
                  )}
                </td>
                <td className="py-2 px-3 text-xs text-[var(--fg-muted)]">{p.role}</td>
                <td className="py-2 px-3 text-xs text-[var(--fg-muted)]">
                  {new Date(p.created_at).toLocaleDateString()}
                </td>
                <td className="py-2 px-3 text-right">
                  <button
                    className="btn btn-danger !py-0.5 !px-2 !text-xs"
                    disabled={p.user_id === currentUserId}
                    onClick={() => run(() => removeWhitelistAction(p.id))}
                  >
                    삭제
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
