"use client";
import { useMemo, useState, useTransition } from "react";
import { importEmployeesAction } from "@/actions/import";

type Category = { id: string; name: string; code: string };
type Company = { id: string; name: string; category_id: string };

async function fileToBase64(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary);
}

export function ImportClient({ categories, companies }: { categories: Category[]; companies: Company[] }) {
  const [categoryId, setCategoryId] = useState<string>(categories[0]?.id ?? "");
  const [companyId, setCompanyId] = useState<string>("");
  const [sheetType, setSheetType] = useState<"active" | "retired">("active");
  const [file, setFile] = useState<File | null>(null);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<null | { ok: boolean; msg: string }>(null);

  const filteredCompanies = useMemo(
    () => companies.filter((c) => c.category_id === categoryId),
    [categoryId, companies],
  );

  const canSubmit = !!companyId && !!file && !pending;

  function submit() {
    if (!file || !companyId) return;
    setResult(null);
    startTransition(async () => {
      const fileBase64 = await fileToBase64(file);
      const res = await importEmployeesAction({
        companyId,
        sheetType,
        fileName: file.name,
        fileBase64,
      });
      if (res.ok) {
        setResult({
          ok: true,
          msg: `${res.sheetName} 시트에서 ${res.upserted}건 저장, ${res.skipped}건 건너뜀`,
        });
        setFile(null);
      } else {
        setResult({ ok: false, msg: res.error });
      }
    });
  }

  return (
    <div className="card p-4 md:p-5 flex flex-col gap-4">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[var(--fg-muted)] text-xs">카테고리</span>
          <select
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
              setCompanyId("");
            }}
            className="rounded-md border border-[var(--border)] px-3 py-2 bg-[var(--surface)]"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[var(--fg-muted)] text-xs">법인</span>
          <select
            value={companyId}
            onChange={(e) => setCompanyId(e.target.value)}
            className="rounded-md border border-[var(--border)] px-3 py-2 bg-[var(--surface)]"
          >
            <option value="">선택하세요</option>
            {filteredCompanies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex gap-2">
        {(["active", "retired"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setSheetType(t)}
            className={`btn ${sheetType === t ? "btn-primary" : ""}`}
          >
            {t === "active" ? "재직자 시트" : "퇴직자 시트"}
          </button>
        ))}
      </div>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-[var(--fg-muted)] text-xs">Excel 파일 (.xlsx)</span>
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="text-sm"
        />
      </label>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        {result && (
          <div className={`text-xs ${result.ok ? "text-[var(--brand)]" : "text-[var(--danger)]"}`}>
            {result.msg}
          </div>
        )}
        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit}
          className="btn btn-primary ml-auto disabled:opacity-50"
        >
          {pending ? "업로드 중…" : "업로드 & 저장"}
        </button>
      </div>

      <p className="text-[11px] text-[var(--fg-subtle)]">
        헤더는 엑셀 샘플과 동일해야 합니다 (사번/이름/부서/직급/입사일/…). 사번이 일치하면 업서트됩니다.
      </p>
    </div>
  );
}
