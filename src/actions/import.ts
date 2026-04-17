"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { parseEmployeeSheet, type ImportSheetType } from "@/lib/excel-import";

const inputSchema = z.object({
  companyId: z.string().uuid(),
  sheetType: z.enum(["active", "retired"]),
  fileName: z.string(),
  fileBase64: z.string(),
});

export type ImportResult =
  | { ok: true; upserted: number; skipped: number; sheetName: string }
  | { ok: false; error: string };

export async function importEmployeesAction(input: z.infer<typeof inputSchema>): Promise<ImportResult> {
  await requireAdmin();
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "입력값이 올바르지 않습니다." };

  const { companyId, sheetType, fileName, fileBase64 } = parsed.data;
  const buffer = Buffer.from(fileBase64, "base64");
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

  let sheetName = "";
  let rows: ReturnType<typeof parseEmployeeSheet>["rows"] = [];
  try {
    const out = parseEmployeeSheet(arrayBuffer as ArrayBuffer, sheetType as ImportSheetType);
    rows = out.rows;
    sheetName = out.sheetName;
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }

  const supabase = await createClient();

  // Pre-fetch worksites + departments + lookup codes to resolve string → uuid/code
  const [{ data: worksites }, { data: departments }, { data: lookups }] = await Promise.all([
    supabase.from("worksites").select("id,name").eq("company_id", companyId),
    supabase.from("departments").select("id,name,worksite_id").eq("company_id", companyId),
    supabase.from("lookups").select("type,code"),
  ]);

  const wsByName = new Map((worksites ?? []).map((w) => [w.name, w.id]));
  const depByName = new Map((departments ?? []).map((d) => [d.name, d.id]));
  const lookupCodes = new Map<string, Set<string>>();
  for (const l of lookups ?? []) {
    if (!lookupCodes.has(l.type)) lookupCodes.set(l.type, new Set());
    lookupCodes.get(l.type)!.add(l.code);
  }
  const codeOrNull = (type: string, v: string | null) =>
    v && lookupCodes.get(type)?.has(v) ? v : null;

  let upserted = 0;
  let skipped = 0;
  const toInsert: Record<string, unknown>[] = [];

  for (const r of rows) {
    if (!r.name) {
      skipped += 1;
      continue;
    }
    const worksite_id = r.worksite_name ? wsByName.get(r.worksite_name) ?? null : null;
    const department_id = r.dept_name ? depByName.get(r.dept_name) ?? null : null;
    toInsert.push({
      employee_no: r.employee_no,
      name: r.name,
      company_id: companyId,
      worksite_id,
      department_id,
      rank_code: codeOrNull("rank", r.rank),
      birth_date: r.birth_date,
      hire_date: r.hire_date,
      termination_date: r.termination_date,
      gender: r.gender === "남" || r.gender === "여" ? r.gender : null,
      employment_type_code: codeOrNull("employment_type", r.employment_type),
      nationality_type: r.nationality_type === "내국인" || r.nationality_type === "외국인" ? r.nationality_type : null,
      nationality: r.nationality,
      accounting_type_code: codeOrNull("accounting_type", r.accounting_type),
      job_family_code: codeOrNull("job_family", r.job_family),
      annual_salary: r.annual_salary,
      hire_channel_code: codeOrNull("hire_channel", r.hire_channel),
      education_code: codeOrNull("education", r.education),
      career_before_join_years: r.career_before,
      total_career_years: r.total_career,
      status_code: r.status ?? (sheetType === "retired" ? "퇴직" : "재직"),
      termination_reason_code: codeOrNull("termination_reason", r.termination_reason),
      memo: r.memo,
    });
  }

  // Upsert by (company_id, employee_no). Rows without employee_no are inserted as new.
  const withEmpNo = toInsert.filter((r) => r.employee_no);
  const withoutEmpNo = toInsert.filter((r) => !r.employee_no);

  if (withEmpNo.length) {
    const { error } = await supabase
      .from("employees")
      .upsert(withEmpNo as never, { onConflict: "company_id,employee_no" });
    if (error) return { ok: false, error: error.message };
    upserted += withEmpNo.length;
  }
  if (withoutEmpNo.length) {
    const { error } = await supabase.from("employees").insert(withoutEmpNo as never);
    if (error) return { ok: false, error: error.message };
    upserted += withoutEmpNo.length;
  }

  const { data: { user } } = await supabase.auth.getUser();
  await supabase.from("import_logs").insert({
    company_id: companyId,
    sheet_type: sheetType,
    file_name: fileName,
    upserted_count: upserted,
    skipped_count: skipped,
    uploaded_by: user?.id ?? null,
  });

  revalidatePath("/");
  revalidatePath("/org");
  revalidatePath("/companies");
  revalidatePath(`/companies/${companyId}`);
  return { ok: true, upserted, skipped, sheetName };
}
