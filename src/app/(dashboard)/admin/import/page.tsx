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
      <div className="card p-4 md:p-5">
        <SectionHeader
          title="양식 다운로드"
          description="현재 시스템의 드롭다운 값·사업장·부서 목록이 참고 시트로 함께 포함됩니다"
        />
        <div className="flex flex-wrap gap-2">
          <a
            href="/api/template?type=active"
            className="btn"
            download
          >
            📥 재직자 양식 (.xlsx)
          </a>
          <a
            href="/api/template?type=retired"
            className="btn"
            download
          >
            📥 퇴직자 양식 (.xlsx)
          </a>
        </div>
        <ul className="mt-3 text-xs text-[var(--fg-muted)] list-disc pl-5 space-y-0.5">
          <li>헤더 행은 수정하지 마세요 (매핑 기준).</li>
          <li>샘플 한 줄이 포함되어 있으니 그 행을 지우고 실제 데이터를 채워 넣으세요.</li>
          <li>사번이 같으면 덮어쓰기, 사번이 비면 신규 추가됩니다.</li>
          <li>사업장·부서·직급 등은 <b>입력 참고</b> 시트의 목록과 일치해야 자동 매칭됩니다.</li>
        </ul>
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
