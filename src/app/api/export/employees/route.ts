import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/server";
import { getAllowedProfile } from "@/lib/auth";
import { ageFromBirth, tenureMonths, totalCareerYears } from "@/utils/aggregations";

const HEADERS = [
  "카테고리", "법인", "사번", "이름", "사업장", "부서", "직급",
  "생년월일", "만나이", "입사일", "퇴사일", "재직기간(년)",
  "성별", "고용형태", "구분(내/외국인)", "국적",
  "회계구분", "직군", "연봉(원)", "채용경로", "최종학력",
  "입사전경력(년)", "총경력(년)", "재직상태", "퇴직사유", "비고",
];

export async function GET(request: Request) {
  const profile = await getAllowedProfile();
  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const bu = url.searchParams.get("bu") ?? "";
  const company = url.searchParams.get("company") ?? "";
  const worksite = url.searchParams.get("worksite") ?? "";
  const status = url.searchParams.get("status") ?? "";
  const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();

  const supabase = await createClient();
  const [cats, cos, wss, deps, lks, emps] = await Promise.all([
    supabase.from("categories").select("id,name,order_idx").order("order_idx"),
    supabase.from("companies").select("id,name,category_id,ceo_name,order_idx").order("order_idx"),
    supabase.from("worksites").select("id,name,company_id,order_idx").order("order_idx"),
    supabase.from("departments").select("id,name,company_id,order_idx").order("order_idx"),
    supabase.from("lookups").select("type,code,label,order_idx").order("order_idx"),
    supabase.from("employees").select("*"),
  ]);

  const categories = cats.data ?? [];
  const companies = cos.data ?? [];
  const worksites = wss.data ?? [];
  const departments = deps.data ?? [];
  const lookups = lks.data ?? [];
  const employees = emps.data ?? [];

  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const companyById = new Map(companies.map((c) => [c.id, c]));
  const worksiteById = new Map(worksites.map((w) => [w.id, w]));
  const deptById = new Map(departments.map((d) => [d.id, d]));
  const rankOrder = new Map<string, number>();
  lookups.filter((l) => l.type === "rank").forEach((l, i) => rankOrder.set(l.code, l.order_idx ?? i));
  const labelFor = (type: string, code: string | null) =>
    code ? lookups.find((l) => l.type === type && l.code === code)?.label ?? code : "";

  let rows = employees;
  if (worksite) rows = rows.filter((e) => e.worksite_id === worksite);
  else if (company) rows = rows.filter((e) => e.company_id === company);
  else if (bu) {
    const buCompanyIds = new Set(companies.filter((c) => c.category_id === bu).map((c) => c.id));
    rows = rows.filter((e) => buCompanyIds.has(e.company_id));
  }
  if (status === "재직" || status === "휴직" || status === "퇴직") {
    rows = rows.filter((e) => e.status_code === status);
  }
  if (q) {
    rows = rows.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        (e.employee_no ?? "").toLowerCase().includes(q),
    );
  }

  rows.sort((a, b) => {
    const coA = companyById.get(a.company_id);
    const coB = companyById.get(b.company_id);
    const catA = coA ? categoryById.get(coA.category_id) : null;
    const catB = coB ? categoryById.get(coB.category_id) : null;
    const wsA = a.worksite_id ? worksiteById.get(a.worksite_id) : null;
    const wsB = b.worksite_id ? worksiteById.get(b.worksite_id) : null;
    const depA = a.department_id ? deptById.get(a.department_id) : null;
    const depB = b.department_id ? deptById.get(b.department_id) : null;
    const rkA = a.rank_code ? rankOrder.get(a.rank_code) ?? 999 : 999;
    const rkB = b.rank_code ? rankOrder.get(b.rank_code) ?? 999 : 999;
    const keys: [number, number][] = [
      [catA?.order_idx ?? 9999, catB?.order_idx ?? 9999],
      [coA?.order_idx ?? 9999, coB?.order_idx ?? 9999],
      [wsA?.order_idx ?? 9999, wsB?.order_idx ?? 9999],
      [depA?.order_idx ?? 9999, depB?.order_idx ?? 9999],
      [rkA, rkB],
    ];
    for (const [x, y] of keys) if (x !== y) return x - y;
    return (b.hire_date ?? "").localeCompare(a.hire_date ?? "");
  });

  const dataMatrix: (string | number | null)[][] = [HEADERS];
  for (const e of rows) {
    const co = companyById.get(e.company_id);
    const cat = co ? categoryById.get(co.category_id) : null;
    const ws = e.worksite_id ? worksiteById.get(e.worksite_id) : null;
    const dep = e.department_id ? deptById.get(e.department_id) : null;

    const tenureM = tenureMonths(e.hire_date, e.termination_date);
    const tenureY = tenureM != null ? Number((tenureM / 12).toFixed(2)) : null;
    const totalY = totalCareerYears(e.career_before_join_years, e.hire_date, e.termination_date);
    const age = e.birth_date
      ? ageFromBirth(
          e.birth_date,
          e.termination_date ? new Date(e.termination_date) : new Date(),
        )
      : null;

    dataMatrix.push([
      cat?.name ?? "",
      co?.name ?? "",
      e.employee_no ?? "",
      e.name,
      ws?.name ?? "",
      dep?.name ?? "",
      labelFor("rank", e.rank_code),
      e.birth_date ?? "",
      age ?? "",
      e.hire_date ?? "",
      e.termination_date ?? "",
      tenureY ?? "",
      e.gender ?? "",
      labelFor("employment_type", e.employment_type_code),
      e.nationality_type ?? "",
      e.nationality ?? "",
      labelFor("accounting_type", e.accounting_type_code),
      labelFor("job_family", e.job_family_code),
      e.annual_salary ?? "",
      labelFor("hire_channel", e.hire_channel_code),
      labelFor("education", e.education_code),
      e.career_before_join_years ?? "",
      totalY != null ? Number(totalY.toFixed(2)) : "",
      e.status_code,
      labelFor("termination_reason", e.termination_reason_code),
      e.memo ?? "",
    ]);
  }

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(dataMatrix);
  ws["!cols"] = HEADERS.map((h) => ({
    wch: h.length <= 4 ? 10 : Math.max(12, h.length + 2),
  }));
  ws["!freeze"] = { xSplit: 0, ySplit: 1 };
  XLSX.utils.book_append_sheet(wb, ws, "직원 명단");

  // Summary sheet
  const summary: (string | number)[][] = [];
  summary.push(["ReNA Group HR — 직원 명단 내보내기"]);
  summary.push(["생성일시", new Date().toLocaleString("ko-KR")]);
  summary.push(["전체 행 수", rows.length]);
  summary.push([]);
  summary.push(["적용된 필터"]);
  summary.push(["BU(카테고리)", bu ? categoryById.get(bu)?.name ?? bu : "전체"]);
  summary.push(["법인", company ? companyById.get(company)?.name ?? company : "전체"]);
  summary.push(["사업장", worksite ? worksiteById.get(worksite)?.name ?? worksite : "전체"]);
  summary.push(["상태", status || "전체"]);
  summary.push(["검색어", q || "-"]);
  summary.push([]);
  summary.push(["상태별 집계"]);
  summary.push(["재직", rows.filter((r) => r.status_code === "재직").length]);
  summary.push(["휴직", rows.filter((r) => r.status_code === "휴직").length]);
  summary.push(["퇴직", rows.filter((r) => r.status_code === "퇴직").length]);
  const wsSummary = XLSX.utils.aoa_to_sheet(summary);
  wsSummary["!cols"] = [{ wch: 22 }, { wch: 36 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, "📋 내보내기 정보");

  const buffer = XLSX.write(wb, { bookType: "xlsx", type: "buffer" }) as Buffer;
  const stamp = new Date().toISOString().slice(0, 10);
  const scopeLabel =
    (worksite && worksiteById.get(worksite)?.name) ||
    (company && companyById.get(company)?.name) ||
    (bu && categoryById.get(bu)?.name) ||
    "전사";
  const statusLabel = status || "전체";
  const fileName = `ReNA_HR_직원명단_${scopeLabel}_${statusLabel}_${stamp}.xlsx`;

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      "Cache-Control": "no-store",
    },
  });
}
