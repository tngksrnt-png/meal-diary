"use client";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Database } from "@/types/database";
import { updateEmployeeAction } from "@/actions/employees";
import { totalCareerYears } from "@/utils/aggregations";
import { formatYears } from "@/utils/format";

type Employee = Database["public"]["Tables"]["employees"]["Row"];
type Company = Database["public"]["Tables"]["companies"]["Row"];
type Worksite = Database["public"]["Tables"]["worksites"]["Row"];
type Department = Database["public"]["Tables"]["departments"]["Row"];
type Lookup = Database["public"]["Tables"]["lookups"]["Row"];

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

const inputCls = "rounded-sm border border-[var(--border)] px-2 py-1.5 bg-[var(--surface)] text-sm";

export function EmployeeEditForm({
  employee,
  companies,
  worksites,
  departments,
  lookups,
}: {
  employee: Employee;
  companies: Company[];
  worksites: Worksite[];
  departments: Department[];
  lookups: Lookup[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [f, setF] = useState(() => ({ ...employee }));

  const activeLookups = useMemo(
    () => (type: string) => lookups.filter((l) => l.type === type && l.is_active),
    [lookups],
  );
  const companyWorksites = useMemo(
    () => worksites.filter((w) => w.company_id === f.company_id),
    [worksites, f.company_id],
  );
  const worksiteDepartments = useMemo(
    () =>
      departments.filter(
        (d) =>
          d.company_id === f.company_id &&
          (f.worksite_id ? d.worksite_id === f.worksite_id : true),
      ),
    [departments, f.company_id, f.worksite_id],
  );

  function update<K extends keyof Employee>(key: K, value: Employee[K]) {
    setF((prev) => ({ ...prev, [key]: value }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    start(async () => {
      const r = await updateEmployeeAction({
        id: employee.id,
        employee_no: f.employee_no,
        name: f.name,
        company_id: f.company_id,
        worksite_id: f.worksite_id,
        department_id: f.department_id,
        rank_code: f.rank_code,
        birth_date: f.birth_date,
        hire_date: f.hire_date,
        gender: f.gender as "남" | "여" | null,
        employment_type_code: f.employment_type_code,
        nationality_type: f.nationality_type as "내국인" | "외국인" | null,
        nationality: f.nationality,
        accounting_type_code: f.accounting_type_code,
        job_family_code: f.job_family_code,
        annual_salary: f.annual_salary,
        hire_channel_code: f.hire_channel_code,
        education_code: f.education_code,
        career_before_join_years: f.career_before_join_years,
        total_career_years: null,
        memo: f.memo,
      });
      if (!r.ok) setErr(r.error ?? "오류");
      else {
        setMsg("저장되었습니다");
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={submit} className="card p-4 md:p-5 flex flex-col gap-4">
      <section>
        <div className="label-eyebrow mb-2">기본 정보</div>
        <div className="grid md:grid-cols-4 gap-3">
          <Field label="사번"><input className={inputCls} value={f.employee_no ?? ""} onChange={(e) => update("employee_no", e.target.value || null)} /></Field>
          <Field label="이름" required><input className={inputCls} value={f.name} onChange={(e) => update("name", e.target.value)} required /></Field>
          <Field label="성별">
            <select className={inputCls} value={f.gender ?? ""} onChange={(e) => update("gender", (e.target.value || null) as "남" | "여" | null)}>
              <option value="">-</option>
              <option value="남">남</option>
              <option value="여">여</option>
            </select>
          </Field>
          <Field label="생년월일"><input type="date" className={inputCls} value={f.birth_date ?? ""} onChange={(e) => update("birth_date", e.target.value || null)} /></Field>
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
                update("worksite_id", null);
                update("department_id", null);
              }}
              required
            >
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>
          <Field label="사업장">
            <select
              className={inputCls}
              value={f.worksite_id ?? ""}
              onChange={(e) => {
                update("worksite_id", e.target.value || null);
                update("department_id", null);
              }}
            >
              <option value="">(없음 / HQ)</option>
              {companyWorksites.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </Field>
          <Field label="부서">
            <select
              className={inputCls}
              value={f.department_id ?? ""}
              onChange={(e) => update("department_id", e.target.value || null)}
            >
              <option value="">-</option>
              {worksiteDepartments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </Field>
        </div>
      </section>

      <section>
        <div className="label-eyebrow mb-2">고용 · 급여</div>
        <div className="grid md:grid-cols-4 gap-3">
          <Field label="직급">
            <select className={inputCls} value={f.rank_code ?? ""} onChange={(e) => update("rank_code", e.target.value || null)}>
              <option value="">-</option>
              {activeLookups("rank").map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
          </Field>
          <Field label="고용형태">
            <select className={inputCls} value={f.employment_type_code ?? ""} onChange={(e) => update("employment_type_code", e.target.value || null)}>
              <option value="">-</option>
              {activeLookups("employment_type").map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
          </Field>
          <Field label="회계구분">
            <select className={inputCls} value={f.accounting_type_code ?? ""} onChange={(e) => update("accounting_type_code", e.target.value || null)}>
              <option value="">-</option>
              {activeLookups("accounting_type").map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
          </Field>
          <Field label="직군">
            <select className={inputCls} value={f.job_family_code ?? ""} onChange={(e) => update("job_family_code", e.target.value || null)}>
              <option value="">-</option>
              {activeLookups("job_family").map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
          </Field>
          <Field label="입사일"><input type="date" className={inputCls} value={f.hire_date ?? ""} onChange={(e) => update("hire_date", e.target.value || null)} /></Field>
          <Field label="연봉 (원)">
            <input
              type="number"
              className={inputCls}
              value={f.annual_salary ?? ""}
              onChange={(e) => update("annual_salary", e.target.value ? Number(e.target.value) : null)}
            />
          </Field>
          <Field label="채용경로">
            <select className={inputCls} value={f.hire_channel_code ?? ""} onChange={(e) => update("hire_channel_code", e.target.value || null)}>
              <option value="">-</option>
              {activeLookups("hire_channel").map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
          </Field>
          <Field label="최종학력">
            <select className={inputCls} value={f.education_code ?? ""} onChange={(e) => update("education_code", e.target.value || null)}>
              <option value="">-</option>
              {activeLookups("education").map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
          </Field>
        </div>
      </section>

      <section>
        <div className="label-eyebrow mb-2">국적 · 경력</div>
        <div className="grid md:grid-cols-4 gap-3">
          <Field label="내/외국인">
            <select className={inputCls} value={f.nationality_type ?? ""} onChange={(e) => update("nationality_type", (e.target.value || null) as "내국인" | "외국인" | null)}>
              <option value="">-</option>
              <option value="내국인">내국인</option>
              <option value="외국인">외국인</option>
            </select>
          </Field>
          <Field label="국적"><input className={inputCls} value={f.nationality ?? ""} onChange={(e) => update("nationality", e.target.value || null)} /></Field>
          <Field label="입사전경력 (년)">
            <input
              type="number"
              step="0.1"
              className={inputCls}
              value={f.career_before_join_years ?? ""}
              onChange={(e) => update("career_before_join_years", e.target.value ? Number(e.target.value) : null)}
              placeholder="비워두면 0년"
            />
          </Field>
          <Field label="총경력 (자동)">
            <input
              className={`${inputCls} bg-[var(--muted)] text-[var(--fg-muted)]`}
              value={formatYears(totalCareerYears(f.career_before_join_years, f.hire_date, f.termination_date))}
              disabled
              readOnly
            />
          </Field>
        </div>
        <div className="text-[11px] text-[var(--fg-subtle)] mt-1">
          총경력은 입사전경력 + 근속(년)으로 자동 산정됩니다.
        </div>
      </section>

      {f.status_code === "퇴직" && (
        <section>
          <div className="label-eyebrow mb-2 text-[var(--danger)]">퇴직 정보</div>
          <div className="grid md:grid-cols-3 gap-3">
            <Field label="퇴사일">
              <input type="date" className={inputCls} value={f.termination_date ?? ""} disabled />
            </Field>
            <Field label="퇴직사유">
              <input className={inputCls} value={f.termination_reason_code ?? ""} disabled />
            </Field>
          </div>
          <div className="text-[11px] text-[var(--fg-subtle)] mt-1">
            퇴직 정보는 상단 상태 전환 패널에서만 변경됩니다.
          </div>
        </section>
      )}

      <section>
        <Field label="비고">
          <textarea
            className={`${inputCls} min-h-[60px]`}
            value={f.memo ?? ""}
            onChange={(e) => update("memo", e.target.value || null)}
          />
        </Field>
      </section>

      <div className="flex items-center justify-end gap-3 flex-wrap">
        {err && <span className="text-xs text-[var(--danger)] mr-auto">{err}</span>}
        {msg && <span className="text-xs text-[var(--brand)] mr-auto">{msg}</span>}
        <button type="submit" className="btn btn-primary !text-sm" disabled={pending}>
          {pending ? "저장 중…" : "저장"}
        </button>
      </div>
    </form>
  );
}
