"use client";
import { useMemo, useState, useTransition } from "react";
import { importEmployeesAction, type ImportResult } from "@/actions/import";

type Category = { id: string; name: string; code: string };
type Company = { id: string; name: string; category_id: string };

async function fileToBase64(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary);
}

export function ImportClient({
  categories,
  companies,
}: {
  categories: Category[];
  companies: Company[];
}) {
  const [categoryId, setCategoryId] = useState<string>("");
  const [companyId, setCompanyId] = useState<string>("");
  const [sheetType, setSheetType] = useState<"active" | "retired">("active");
  const [file, setFile] = useState<File | null>(null);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ImportResult | null>(null);

  const filteredCompanies = useMemo(
    () => (categoryId ? companies.filter((c) => c.category_id === categoryId) : companies),
    [categoryId, companies],
  );

  const canSubmit = !!file && !pending;

  function submit() {
    if (!file) return;
    setResult(null);
    startTransition(async () => {
      const fileBase64 = await fileToBase64(file);
      const res = await importEmployeesAction({
        defaultCompanyId: companyId || null,
        sheetType,
        fileName: file.name,
        fileBase64,
      });
      setResult(res);
      if (res.ok) setFile(null);
    });
  }

  return (
    <div className="card p-4 md:p-5 flex flex-col gap-4">
      <div>
        <div className="text-sm font-medium">기본 법인 (선택사항)</div>
        <p className="text-xs text-[var(--fg-muted)] mt-0.5">
          파일의 <code>법인</code> 컬럼이 비어있는 행에만 적용됩니다. 채워진 행은 그 법인으로 자동 라우팅.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[var(--fg-muted)] text-xs">카테고리 필터</span>
          <select
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
              setCompanyId("");
            }}
            className="rounded-md border border-[var(--border)] px-3 py-2 bg-[var(--surface)]"
          >
            <option value="">전체</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[var(--fg-muted)] text-xs">기본 법인</span>
          <select
            value={companyId}
            onChange={(e) => setCompanyId(e.target.value)}
            className="rounded-md border border-[var(--border)] px-3 py-2 bg-[var(--surface)]"
          >
            <option value="">선택 안 함 (법인 컬럼이 반드시 채워져 있어야 함)</option>
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

      <div className="flex items-center justify-end gap-3 flex-wrap">
        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit}
          className="btn btn-primary disabled:opacity-50"
        >
          {pending ? "업로드 중…" : "업로드 & 저장"}
        </button>
      </div>

      {result ? (
        result.ok ? (
          <div className="rounded-lg border border-[var(--brand)] bg-[var(--brand-soft)] p-3 text-sm">
            <div className="font-medium text-[var(--brand)]">
              {result.sheetName} 시트에서 {result.upserted}건 저장
              {result.skipped > 0 ? `, ${result.skipped}건 건너뜀` : ""}
            </div>
            {result.perCompany.length > 0 && (
              <div className="mt-2 text-xs">
                <div className="text-[var(--fg-muted)]">법인별:</div>
                <ul className="list-disc pl-5">
                  {result.perCompany.map((p) => (
                    <li key={p.companyName}>
                      {p.companyName}: {p.count}건
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {result.skippedReasons.length > 0 && (
              <div className="mt-2 text-xs text-[var(--fg-muted)]">
                <div>건너뛴 이유:</div>
                <ul className="list-disc pl-5">
                  {result.skippedReasons.map((r) => (
                    <li key={r.reason}>
                      {r.reason}: {r.count}건
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-lg border border-[var(--danger)] bg-red-50 p-3 text-sm text-[var(--danger)]">
            {result.error}
          </div>
        )
      ) : null}

      <p className="text-[11px] text-[var(--fg-subtle)]">
        양식의 <code>법인</code> 컬럼(A열)에 ReNA 그룹 법인명을 채우면 해당 법인으로 자동 저장됩니다. 비어있는 행만 기본 법인 선택이 적용됩니다.
      </p>
    </div>
  );
}
