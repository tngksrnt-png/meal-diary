import { createClient } from "@/lib/supabase/server";
import { WhitelistClient } from "./WhitelistClient";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data } = await supabase
    .from("profiles")
    .select("id,email,role,user_id,created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl md:text-2xl font-semibold tracking-tight">허용 이메일 관리</h1>
        <p className="text-sm text-[var(--fg-muted)] mt-1">
          그룹 HR 대시보드에 접근 가능한 이메일 목록입니다.
        </p>
      </div>
      <WhitelistClient profiles={data ?? []} currentUserId={user?.id ?? null} />
    </div>
  );
}
