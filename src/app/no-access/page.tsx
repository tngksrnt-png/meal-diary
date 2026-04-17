import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function NoAccessPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="card w-full max-w-sm p-8 flex flex-col gap-4">
        <div className="text-xl font-semibold">접근 권한 없음</div>
        <p className="text-sm text-[var(--fg-muted)]">
          {user?.email ? `${user.email} ` : ""}계정은 ReNA 그룹 HR 허용 목록에 없습니다.
        </p>
        <p className="text-xs text-[var(--fg-subtle)]">
          접근이 필요하면 그룹 HR 관리자에게 이메일 등록을 요청하세요.
        </p>
        <Link href="/login" className="btn justify-center">
          다른 계정으로 로그인
        </Link>
      </div>
    </main>
  );
}
