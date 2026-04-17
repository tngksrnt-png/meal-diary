import { z } from "zod";

export const categorySchema = z.object({
  code: z.string().min(1).max(32),
  name: z.string().min(1).max(64),
  order_idx: z.number().int().default(0),
  is_hq: z.boolean().default(false),
});

export const companySchema = z.object({
  category_id: z.string().uuid(),
  name: z.string().min(1).max(128),
  ceo_name: z.string().max(64).optional().nullable(),
  order_idx: z.number().int().default(0),
});

export const worksiteSchema = z.object({
  company_id: z.string().uuid(),
  name: z.string().min(1).max(128),
  order_idx: z.number().int().default(0),
});

export const departmentSchema = z.object({
  company_id: z.string().uuid(),
  worksite_id: z.string().uuid().optional().nullable(),
  parent_department_id: z.string().uuid().optional().nullable(),
  name: z.string().min(1).max(128),
  kind: z.enum(["division", "team", "part"]).default("team"),
  order_idx: z.number().int().default(0),
});

export const lookupSchema = z.object({
  type: z.enum([
    "rank", "employment_type", "hire_channel", "education",
    "employee_status", "termination_reason", "accounting_type", "job_family",
  ]),
  code: z.string().min(1).max(64),
  label: z.string().min(1).max(64),
  order_idx: z.number().int().default(0),
  is_active: z.boolean().default(true),
});

export const employeeSchema = z.object({
  employee_no: z.string().max(32).optional().nullable(),
  name: z.string().min(1).max(64),
  company_id: z.string().uuid(),
  worksite_id: z.string().uuid().optional().nullable(),
  department_id: z.string().uuid().optional().nullable(),
  rank_code: z.string().optional().nullable(),
  birth_date: z.string().optional().nullable(),
  hire_date: z.string().optional().nullable(),
  termination_date: z.string().optional().nullable(),
  gender: z.enum(["남", "여"]).optional().nullable(),
  employment_type_code: z.string().optional().nullable(),
  nationality_type: z.enum(["내국인", "외국인"]).optional().nullable(),
  nationality: z.string().max(64).optional().nullable(),
  accounting_type_code: z.string().optional().nullable(),
  job_family_code: z.string().optional().nullable(),
  annual_salary: z.number().int().optional().nullable(),
  hire_channel_code: z.string().optional().nullable(),
  education_code: z.string().optional().nullable(),
  career_before_join_years: z.number().optional().nullable(),
  total_career_years: z.number().optional().nullable(),
  status_code: z.enum(["재직", "휴직", "퇴직"]).default("재직"),
  termination_reason_code: z.string().optional().nullable(),
  memo: z.string().optional().nullable(),
});

export const profileSchema = z.object({
  email: z.string().email(),
  role: z.literal("group_admin").default("group_admin"),
});

export type CategoryInput = z.infer<typeof categorySchema>;
export type CompanyInput = z.infer<typeof companySchema>;
export type WorksiteInput = z.infer<typeof worksiteSchema>;
export type DepartmentInput = z.infer<typeof departmentSchema>;
export type LookupInput = z.infer<typeof lookupSchema>;
export type EmployeeInput = z.infer<typeof employeeSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;

export const LOOKUP_TYPES = [
  "rank", "employment_type", "hire_channel", "education",
  "employee_status", "termination_reason", "accounting_type", "job_family",
] as const;

export type LookupType = (typeof LOOKUP_TYPES)[number];

export const LOOKUP_LABEL_KO: Record<LookupType, string> = {
  rank: "직급",
  employment_type: "고용형태",
  hire_channel: "채용경로",
  education: "최종학력",
  employee_status: "재직상태",
  termination_reason: "퇴직사유",
  accounting_type: "회계구분",
  job_family: "직군",
};
