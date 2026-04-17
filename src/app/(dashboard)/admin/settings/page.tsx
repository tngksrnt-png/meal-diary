import { createClient } from "@/lib/supabase/server";
import { LookupsClient } from "./LookupsClient";
import { LOOKUP_LABEL_KO, LOOKUP_TYPES } from "@/types/schema";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: lookups } = await supabase
    .from("lookups")
    .select("*")
    .order("type")
    .order("order_idx");

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl md:text-2xl font-semibold tracking-tight">드롭다운 설정</h1>
        <p className="text-sm text-[var(--fg-muted)] mt-1">
          엑셀 <code>⚙️ 설정</code> 시트의 직급·고용형태 등 드롭다운 소스. 사용 중인 값은 비활성화만 가능합니다.
        </p>
      </div>
      <LookupsClient
        lookups={lookups ?? []}
        types={LOOKUP_TYPES.map((t) => ({ key: t, label: LOOKUP_LABEL_KO[t] }))}
      />
    </div>
  );
}
