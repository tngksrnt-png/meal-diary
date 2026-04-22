"use client";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Database } from "@/types/database";
import { createEmployeeAction } from "@/actions/employees";

type Company = Database["public"]["Tables"]["companies"]["Row"];
type Worksite = Database["public"]["Tables"]["worksites"]["Row"];
type Department = Database["public"]["Tables"]["departments"]["Row"];
type Lookup = Database["public"]["Tables"]["lookups"]["Row"];

const inputCls = "rounded-sm border border-[var(--border)] px-2 py-1.5 bg-[var(--surface)] text-sm";

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-xs text-[var(--fg-muted)]">
        {label}
        {required && <span className="text-[var(--danger)] ml-0.5">*</span>}
      </span>
      {children}
    </label>
  );
}

export function NewEmployeeForm({
  companies,
  worksites,
  departments,
  lookups,
  defaultCompanyId,
  defaultWorksiteId,
}: {
  companies: Company[];
  worksites: Worksite[];
  departments: Department[];
  lookups: Lookup[];
  defaultCompanyId: string;
  defaultWorksiteId: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const [f, setF] = useState({
    employee_no: "" as string,
    name: "",
    company_id: defaultCompanyId,
    worksite_id: defaultWorksiteId ?? "" as string,
    department_id: "" as string,
    rank_code: "",
    birth_date: "",
    hire_date: new Date().toISOString().slice(0, 10),
    gender: "" as "남" | "여" | "",
    employment_type_code: "",
    nationality_type: "내국인" as "내국인" | "외국인",
    nationality: "대한민국",
    accounting_type_code: "",
    job_family_code: "",
    annual_salary: "" as string | number,
    hire_channel_code: "직채용",
    education_code: "",
    career_before_join_years: "" as string | number,
    memo: "",
  });

  const filteredWorksites = useMemo(
    () => worksites.filter((w) => w.company_id === f.company_id),
    [worksites, f.company_id],
  );
  const filteredDepartments = useMemo(
    () =>
      departments.filter(
        (d) => d.company_id === f.company_id && (f.worksite_id ? d.worksite_id === f.worksite_id : true),
      ),
    [departments, f.company_id, f.worksite_id],
  );
  const actives = (type: string) => lookups.filter((l) => l.type === type && l.is_active);

  function update<K extends keyof typeof f>(key: K, value: (typeof f)[K]) {
    setF((prev) => ({ ...prev, [key]: value }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    start(async () => {
      const r = await createEmployeeAction({
        employee_no: f.employee_no || null,
        name: f.name,
        company_id: f.company_id,
        worksite_id: f.worksite_id || null,
        department_id: f.department_id || null,
        rank_code: f.rank_code || null,
        birth_date: f.birth_date || null,
        hire_date: f.hire_date || null,
        gender: f.gender || null,
        employment_type_code: f.employment_type_code || null,
        nationality_type: f.nationality_type,
        nationality: f.nationality || null,
        accounting_type_code: f.accounting_type_code || null,
        job_family_code: f.job_family_code || null,
        annual_salary: f.annual_salary === "" ? null : Number(f.annual_salary),
        hire_channel_code: f.hire_channel_code || null,
        education_code: f.education_code || null,
        career_before_join_years:
          f.career_before_join_years === "" ? null : Number(f.career_before_join_years),
        total_career_years: null,
        memo: f.memo || null,
        status_code: "재직",
      });
      if (!r.ok) {
        setErr(r.error ?? "오류");
        return;
      }
      router.push(r.id ? `/employees/${r.id}` : "/employees");
    });
  }

  return (
    <form onSubmit={submit} className="card p-4 md:p-5 flex flex-col gap-4">
      <section>
        <div className="label-eyebrow mb-2">기본 정보</div>
        <div className="grid md:grid-cols-4 gap-3">
          <Field label="사번"><input className={inputCls} value={f.employee_no} onChange={(e) => update("employee_no", e.target.value)} /></Field>
          <Field label="이름" required><input className={inputCls} value={f.name} onChange={(e) => update("name", e.target.value)} required /></Field>
          <Field label="성별">
            <select className={inputCls} value={f.gender} onChange={(e) => update("gender", e.target.value as "남" | "여" | "")}>
              <option value="">-</option>
              <option value="남">남</option>
              <option value="여">여</option>
            </select>
          </Field>
          <Field label="생년월일"><input type="date" className={inputCls} value={f.birth_date} onChange={(e) => update("birth_date", e.target.value)} /></Field>
        </div>
      </section>

      <section>
        <div className="label-eyebrow mb-2">소속</div>
        <div className="grid md:grid-cols-3 gap-3">
          <Field label="법인" required>
            <select
              className={inputCls}
              value={f.company_id}
              onChange={(e) => {
                update("company_id", e.target.value);
                update("worksite_id", "");
                update("department_id", "");
              }}
              required
            >
              {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="사업장">
            <select
              className={inputCls}
              value={f.worksite_id}
              onChange={(e) => {
                update("worksite_id", e.target.value);
                update("department_id", "");
              }}
            >
              <option value="">(없음 / HQ)</option>
              {filteredWorksites.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </Field>
          <Field label="부서">
            <select className={inputCls} value={f.department_id} onChange={(e) => update("department_id", e.target.value)}>
              <option value="">-</option>
              {filteredDepartments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </Field>
        </div>
      </section>

      <section>
        <div className="label-eyebrow mb-2">고용 · 급여</div>
        <div className="grid md:grid-cols-4 gap-3">
          <Field label="직급">
            <select className={inputCls} value={f.rank_code} onChange={(e) => update("rank_code", e.target.value)}>
              <option value="">-</option>
              {actives("rank").map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
          </Field>
          <Field label="고용형태">
            <select className={inputCls} value={f.employment_type_code} onChange={(e) => update("employment_type_code", e.target.value)}>
              <option value="">-</option>
              {actives("employment_type").map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
          </Field>
          <Field label="회계구분">
            <select className={inputCls} value={f.accounting_type_code} onChange={(e) => update("accounting_type_code", e.target.value)}>
              <option value="">-</option>
              {actives("accounting_type").map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
          </Field>
          <Field label="직군">
            <select className={inputCls} value={f.job_family_code} onChange={(e) => update("job_family_code", e.target.value)}>
              <option value="">-</option>
              {actives("job_family").map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
          </Field>
          <Field label="입사일"><input type="date" className={inputCls} value={f.hire_date} onChange={(e) => update("hire_date", e.target.value)} /></Field>
          <Field label="연봉 (원)">
            <input type="number" className={inputCls} value={f.annual_salary} onChange={(e) => update("annual_salary", e.target.value)} />
          </Field>
          <Field label="채용경로">
            <select className={inputCls} value={f.hire_channel_code} onChange={(e) => update("hire_channel_code", e.target.value)}>
              <option value="">-</option>
              {actives("hire_channel").map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
          </Field>
          <Field label="최종학력">
            <select className={inputCls} value={f.education_code} onChange={(e) => update("education_code", e.target.value)}>
              <option value="">-</option>
              {actives("education").map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
          </Field>
        </div>
      </section>

      <section>
        <div className="label-eyebrow mb-2">국적 · 경력</div>
        <div className="grid md:grid-cols-4 gap-3">
          <Field label="내/외국인">
            <select className={inputCls} value={f.nationality_type} onChange={(e) => update("nationality_type", e.target.value as "내국인" | "외국인")}>
              <option value="내국인">내국인</option>
              <option value="외국인">외국인</option>
            </select>
          </Field>
          <Field label="국적"><input className={inputCls} value={f.nationality} onChange={(e) => update("nationality", e.target.value)} /></Field>
          <Field label="입사전경력 (년)">
            <input
              type="number"
              step="0.1"
              className={inputCls}
              value={f.career_before_join_years}
              onChange={(e) => update("career_before_join_years", e.target.value)}
              placeholder="이전 직장 경력. 비워두면 0년 처리"
            />
          </Field>
          <div className="text-[11px] text-[var(--fg-subtle)] md:col-span-1 self-end pb-2">
            총경력은 입사전경력 + 근속(년)으로 자동 계산됩니다.
          </div>
        </div>
      </section>

      <Field label="비고">
        <textarea className={`${inputCls} min-h-[60px]`} value={f.memo} onChange={(e) => update("memo", e.target.value)} />
      </Field>

      <div className="flex items-center justify-end gap-3 flex-wrap">
        {err && <span className="text-xs text-[var(--danger)] mr-auto">{err}</span>}
        <button type="button" className="btn !text-sm" onClick={() => router.push("/employees")}>
          취소
        </button>
        <button type="submit" className="btn btn-primary !text-sm" disabled={pending || !f.name || !f.company_id}>
          {pending ? "저장 중…" : "직원 추가"}
        </button>
      </div>
    </form>
  );
}
