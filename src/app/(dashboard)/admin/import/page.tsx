import { createClient } from "@/lib/supabase/server";
import { ImportClient } from "./ImportClient";
import { SectionHeader } from "@/components/ui/SectionHeader";

export const dynamic = "force-dynamic";

export default async function ImportPage() {
  const supabase = await createClient();
  const [{ data: categories }, { data: companies }, { data: logs }] = await Promise.all([
    supabase.from("categories").select("id,name,code,order_idx").order("order_idx"),
    supabase.from("companies").select("id,name,category_id,order_idx").order("order_idx"),
    supabase
      .from("import_logs")
      .select("id,file_name,sheet_type,upserted_count,skipped_count,uploaded_at,company_id")
      .order("uploaded_at", { ascending: false })
      .limit(20),
  ]);

  const byId = new Map((companies ?? []).map((c) => [c.id, c.name]));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl md:text-2xl font-semibold tracking-tight">Excel 업로드</h1>
        <p className="text-sm text-[var(--fg-muted)] mt-1">
          재직자/퇴직자 시트를 업로드하면 사번 기준으로 업서트됩니다.
        </p>
      </div>
      <ImportClient categories={categories ?? []} companies={companies ?? []} />

      <div className="card p-4 md:p-5">
        <SectionHeader title="최근 업로드 이력" />
        {logs && logs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-[var(--fg-muted)]">
                <tr>
                  <th className="text-left py-2 pr-4 font-normal">일시</th>
                  <th className="text-left py-2 pr-4 font-normal">법인</th>
                  <th className="text-left py-2 pr-4 font-normal">시트</th>
                  <th className="text-left py-2 pr-4 font-normal">파일</th>
                  <th className="text-right py-2 pl-4 font-normal">저장 / 건너뜀</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id} className="border-t border-[var(--border)]">
                    <td className="py-2 pr-4">{new Date(l.uploaded_at).toLocaleString()}</td>
                    <td className="py-2 pr-4">{l.company_id ? byId.get(l.company_id) ?? "-" : "-"}</td>
                    <td className="py-2 pr-4">{l.sheet_type === "active" ? "재직자" : "퇴직자"}</td>
                    <td className="py-2 pr-4 truncate max-w-[280px]">{l.file_name}</td>
                    <td className="py-2 pl-4 text-right tabular-nums">
                      {l.upserted_count} / {l.skipped_count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-xs text-[var(--fg-muted)]">아직 업로드 이력이 없습니다.</div>
        )}
      </div>
    </div>
  );
}
