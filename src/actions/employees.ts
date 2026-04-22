"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

function fail(msg: string) {
  return { ok: false as const, error: msg };
}
function ok<T extends object>(data?: T) {
  return { ok: true as const, ...(data ?? ({} as T)) };
}

const updateSchema = z.object({
  id: z.string().uuid(),
  employee_no: z.string().trim().max(32).nullable().optional(),
  name: z.string().trim().min(1).max(64).optional(),
  company_id: z.string().uuid().optional(),
  worksite_id: z.string().uuid().nullable().optional(),
  department_id: z.string().uuid().nullable().optional(),
  rank_code: z.string().nullable().optional(),
  birth_date: z.string().nullable().optional(),
  hire_date: z.string().nullable().optional(),
  gender: z.enum(["남", "여"]).nullable().optional(),
  employment_type_code: z.string().nullable().optional(),
  nationality_type: z.enum(["내국인", "외국인"]).nullable().optional(),
  nationality: z.string().nullable().optional(),
  accounting_type_code: z.string().nullable().optional(),
  job_family_code: z.string().nullable().optional(),
  annual_salary: z.number().int().nullable().optional(),
  hire_channel_code: z.string().nullable().optional(),
  education_code: z.string().nullable().optional(),
  career_before_join_years: z.number().nullable().optional(),
  total_career_years: z.number().nullable().optional(),
  memo: z.string().nullable().optional(),
});

const terminateSchema = z.object({
  id: z.string().uuid(),
  termination_date: z.string().min(1, "퇴사일은 필수입니다."),
  termination_reason_code: z.string().min(1, "퇴직사유는 필수입니다."),
  memo: z.string().nullable().optional(),
});

const revalidate = (companyId?: string | null) => {
  revalidatePath("/");
  revalidatePath("/org");
  revalidatePath("/employees");
  if (companyId) revalidatePath(`/companies/${companyId}`);
};

export async function updateEmployeeAction(input: z.infer<typeof updateSchema>) {
  await requireAdmin();
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "입력값 오류");
  const { id, ...fields } = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("employees")
    .update(fields)
    .eq("id", id)
    .select("company_id")
    .maybeSingle();
  if (error) return fail(error.message);
  revalidate(data?.company_id);
  return ok();
}

export async function terminateEmployeeAction(input: z.infer<typeof terminateSchema>) {
  await requireAdmin();
  const parsed = terminateSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "입력값 오류");
  const { id, termination_date, termination_reason_code, memo } = parsed.data;
  const supabase = await createClient();

  // Fetch to validate status transition
  const { data: emp } = await supabase
    .from("employees")
    .select("id,status_code,hire_date,company_id")
    .eq("id", id)
    .maybeSingle();
  if (!emp) return fail("직원을 찾을 수 없습니다.");
  if (emp.status_code === "퇴직") return fail("이미 퇴직 상태입니다.");
  if (emp.hire_date && new Date(termination_date) < new Date(emp.hire_date)) {
    return fail("퇴사일은 입사일 이전일 수 없습니다.");
  }

  const { error } = await supabase
    .from("employees")
    .update({
      status_code: "퇴직",
      termination_date,
      termination_reason_code,
      ...(memo !== undefined ? { memo } : {}),
    })
    .eq("id", id);
  if (error) return fail(error.message);
  revalidate(emp.company_id);
  return ok();
}

export async function reinstateEmployeeAction(input: { id: string }) {
  await requireAdmin();
  const supabase = await createClient();
  const { data: emp } = await supabase
    .from("employees")
    .select("id,status_code,company_id")
    .eq("id", input.id)
    .maybeSingle();
  if (!emp) return fail("직원을 찾을 수 없습니다.");
  if (emp.status_code !== "퇴직") return fail("퇴직 상태가 아닙니다.");
  const { error } = await supabase
    .from("employees")
    .update({
      status_code: "재직",
      termination_date: null,
      termination_reason_code: null,
    })
    .eq("id", input.id);
  if (error) return fail(error.message);
  revalidate(emp.company_id);
  return ok();
}

export async function setOnLeaveAction(input: { id: string; onLeave: boolean }) {
  await requireAdmin();
  const supabase = await createClient();
  const { data: emp } = await supabase
    .from("employees")
    .select("id,status_code,company_id")
    .eq("id", input.id)
    .maybeSingle();
  if (!emp) return fail("직원을 찾을 수 없습니다.");
  if (emp.status_code === "퇴직") return fail("퇴직자는 휴직 전환 불가. 먼저 복구하세요.");
  const { error } = await supabase
    .from("employees")
    .update({ status_code: input.onLeave ? "휴직" : "재직" })
    .eq("id", input.id);
  if (error) return fail(error.message);
  revalidate(emp.company_id);
  return ok();
}

export async function deleteEmployeeAction(id: string) {
  await requireAdmin();
  const supabase = await createClient();
  const { data: emp } = await supabase
    .from("employees")
    .select("company_id")
    .eq("id", id)
    .maybeSingle();
  const { error } = await supabase.from("employees").delete().eq("id", id);
  if (error) return fail(error.message);
  revalidate(emp?.company_id);
  return ok();
}

const createSchema = updateSchema.omit({ id: true }).extend({
  name: z.string().trim().min(1).max(64),
  company_id: z.string().uuid(),
  status_code: z.enum(["재직", "휴직", "퇴직"]).default("재직"),
});

export async function createEmployeeAction(input: z.infer<typeof createSchema>) {
  await requireAdmin();
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "입력값 오류");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("employees")
    .insert(parsed.data)
    .select("id,company_id")
    .maybeSingle();
  if (error) return fail(error.message);
  revalidate(data?.company_id);
  return ok({ id: data?.id });
}
