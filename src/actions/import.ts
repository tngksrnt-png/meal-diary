"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { parseEmployeeSheet, type ImportSheetType } from "@/lib/excel-import";

const inputSchema = z.object({
  // Optional fallback company when rows don't specify one in 법인 column
  defaultCompanyId: z.string().uuid().nullable().optional(),
  sheetType: z.enum(["active", "retired"]),
  fileName: z.string(),
  fileBase64: z.string(),
});

export type ImportResult =
  | {
      ok: true;
      upserted: number;
      skipped: number;
      sheetName: string;
      perCompany: { companyName: string; count: number }[];
      skippedReasons: { reason: string; count: number }[];
    }
  | { ok: false; error: string };

export async function importEmployeesAction(
  input: z.infer<typeof inputSchema>,
): Promise<ImportResult> {
  await requireAdmin();
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "입력값이 올바르지 않습니다." };

  const { defaultCompanyId, sheetType, fileName, fileBase64 } = parsed.data;
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

  // Preload all orgs + lookups. Row-level routing by 법인 name.
  const [{ data: companies }, { data: worksites }, { data: departments }, { data: lookups }] =
    await Promise.all([
      supabase.from("companies").select("id,name"),
      supabase.from("worksites").select("id,name,company_id"),
      supabase.from("departments").select("id,name,company_id"),
      supabase.from("lookups").select("type,code"),
    ]);

  const companyIdByName = new Map((companies ?? []).map((c) => [c.name, c.id]));
  // worksite lookup keyed by (company_id, name) because names like 본점 repeat
  const worksiteIdByCoName = new Map<string, string>();
  for (const w of worksites ?? []) worksiteIdByCoName.set(`${w.company_id}::${w.name}`, w.id);
  const departmentIdByCoName = new Map<string, string>();
  for (const d of departments ?? []) departmentIdByCoName.set(`${d.company_id}::${d.name}`, d.id);

  const lookupCodes = new Map<string, Set<string>>();
  for (const l of lookups ?? []) {
    if (!lookupCodes.has(l.type)) lookupCodes.set(l.type, new Set());
    lookupCodes.get(l.type)!.add(l.code);
  }
  const codeOrNull = (type: string, v: string | null) =>
    v && lookupCodes.get(type)?.has(v) ? v : null;

  const perCompanyCount = new Map<string, number>();
  const skippedReasonCount = new Map<string, number>();
  const bump = (map: Map<string, number>, key: string) =>
    map.set(key, (map.get(key) ?? 0) + 1);

  const toInsertByCompany = new Map<string, Record<string, unknown>[]>();

  for (const r of rows) {
    if (!r.name) {
      bump(skippedReasonCount, "이름 비어있음");
      continue;
    }
    // Resolve target company: row 법인 wins, else defaultCompanyId
    let targetCompanyId: string | null = null;
    let targetCompanyName = "";
    if (r.company_name) {
      const id = companyIdByName.get(r.company_name) ?? null;
      if (!id) {
        bump(skippedReasonCount, `법인명 매칭 실패: ${r.company_name}`);
        continue;
      }
      targetCompanyId = id;
      targetCompanyName = r.company_name;
    } else if (defaultCompanyId) {
      targetCompanyId = defaultCompanyId;
      targetCompanyName = companies?.find((c) => c.id === defaultCompanyId)?.name ?? "-";
    } else {
      bump(skippedReasonCount, "법인 컬럼 비어있고 기본 법인 미선택");
      continue;
    }

    const worksite_id = r.worksite_name
      ? worksiteIdByCoName.get(`${targetCompanyId}::${r.worksite_name}`) ?? null
      : null;
    const department_id = r.dept_name
      ? departmentIdByCoName.get(`${targetCompanyId}::${r.dept_name}`) ?? null
      : null;

    const record: Record<string, unknown> = {
      employee_no: r.employee_no,
      name: r.name,
      company_id: targetCompanyId,
      worksite_id,
      department_id,
      rank_code: codeOrNull("rank", r.rank),
      birth_date: r.birth_date,
      hire_date: r.hire_date,
      termination_date: r.termination_date,
      gender: r.gender === "남" || r.gender === "여" ? r.gender : null,
      employment_type_code: codeOrNull("employment_type", r.employment_type),
      nationality_type:
        r.nationality_type === "내국인" || r.nationality_type === "외국인" ? r.nationality_type : null,
      nationality: r.nationality,
      accounting_type_code: codeOrNull("accounting_type", r.accounting_type),
      job_family_code: codeOrNull("job_family", r.job_family),
      annual_salary: r.annual_salary,
      hire_channel_code: codeOrNull("hire_channel", r.hire_channel),
      education_code: codeOrNull("education", r.education),
      career_before_join_years: r.career_before,
      total_career_years: null,
      status_code: r.status ?? (sheetType === "retired" ? "퇴직" : "재직"),
      termination_reason_code: codeOrNull("termination_reason", r.termination_reason),
      memo: r.memo,
    };

    if (!toInsertByCompany.has(targetCompanyId)) toInsertByCompany.set(targetCompanyId, []);
    toInsertByCompany.get(targetCompanyId)!.push(record);
    bump(perCompanyCount, targetCompanyName);
  }

  let upserted = 0;
  // Upsert per-company (onConflict key is company_id,employee_no)
  for (const records of toInsertByCompany.values()) {
    const withNo = records.filter((r) => r.employee_no);
    const withoutNo = records.filter((r) => !r.employee_no);
    if (withNo.length) {
      const { error } = await supabase
        .from("employees")
        .upsert(withNo as never, { onConflict: "company_id,employee_no" });
      if (error) return { ok: false, error: error.message };
      upserted += withNo.length;
    }
    if (withoutNo.length) {
      const { error } = await supabase.from("employees").insert(withoutNo as never);
      if (error) return { ok: false, error: error.message };
      upserted += withoutNo.length;
    }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const touchedCompanies = Array.from(toInsertByCompany.keys());
  // If all rows routed to one company, store it; if multi-company, leave null.
  const logCompanyId = touchedCompanies.length === 1 ? touchedCompanies[0]! : null;
  await supabase.from("import_logs").insert({
    company_id: logCompanyId,
    sheet_type: sheetType,
    file_name: fileName,
    upserted_count: upserted,
    skipped_count: Array.from(skippedReasonCount.values()).reduce((a, b) => a + b, 0),
    uploaded_by: user?.id ?? null,
  });

  revalidatePath("/");
  revalidatePath("/org");
  revalidatePath("/companies");
  for (const id of touchedCompanies) revalidatePath(`/companies/${id}`);

  return {
    ok: true,
    upserted,
    skipped: Array.from(skippedReasonCount.values()).reduce((a, b) => a + b, 0),
    sheetName,
    perCompany: Array.from(perCompanyCount.entries())
      .map(([companyName, count]) => ({ companyName, count }))
      .sort((a, b) => b.count - a.count),
    skippedReasons: Array.from(skippedReasonCount.entries())
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count),
  };
}
