import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/server";
import { getAllowedProfile } from "@/lib/auth";

const HEADERS_ACTIVE = [
  "법인", "사번", "이름", "부서", "직급", "생년월일", "입사일",
  "성별", "고용형태", "구분(내/외국인)", "국적", "사업장", "회계구분", "직군",
  "연봉(원)", "채용경로", "최종학력", "입사전경력(년)", "재직상태", "비고",
];

const HEADERS_RETIRED = [
  "법인", "사번", "이름", "부서", "직급", "생년월일", "입사일", "퇴사일",
  "성별", "고용형태", "구분(내/외국인)", "국적", "사업장", "회계구분", "직군",
  "연봉(원)", "채용경로", "최종학력", "입사전경력(년)", "재직상태",
  "퇴직사유", "비고",
];

const SAMPLE_ACTIVE: (string | number)[] = [
  "하이원리싸이클링", "B2504001", "홍길동", "총무팀", "과장", "1990-01-15", "2025-04-01",
  "남", "정규직", "내국인", "대한민국", "본점", "판관", "관리",
  50000000, "직채용", "학사", 3, "재직", "",
];

const SAMPLE_RETIRED: (string | number)[] = [
  "하이원리싸이클링", "B2303001", "김철수", "생산팀", "사원", "1985-08-22", "2023-03-15", "2025-09-30",
  "남", "계약직", "내국인", "대한민국", "본점", "제조", "생산",
  30000000, "직채용", "고졸", 0, "퇴직",
  "자발", "",
];

export async function GET(request: Request) {
  const profile = await getAllowedProfile();
  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const type = url.searchParams.get("type") === "retired" ? "retired" : "active";

  const supabase = await createClient();
  const [{ data: lookups }, { data: companiesRows }, { data: categoriesRows }, { data: worksites }, { data: departments }] = await Promise.all([
    supabase.from("lookups").select("type,label,is_active").eq("is_active", true).order("order_idx"),
    supabase.from("companies").select("id,name,category_id,order_idx").order("order_idx"),
    supabase.from("categories").select("id,name,code,order_idx").order("order_idx"),
    supabase.from("worksites").select("name,company_id").order("order_idx"),
    supabase.from("departments").select("name,company_id").order("order_idx"),
  ]);

  const groupLookups = (t: string) =>
    (lookups ?? []).filter((l) => l.type === t).map((l) => l.label);

  const wb = XLSX.utils.book_new();

  // Sheet 1: data sheet
  const headers = type === "active" ? HEADERS_ACTIVE : HEADERS_RETIRED;
  const sample = type === "active" ? SAMPLE_ACTIVE : SAMPLE_RETIRED;
  const dataMatrix = [headers, sample];
  const wsData = XLSX.utils.aoa_to_sheet(dataMatrix);
  // Column widths
  wsData["!cols"] = headers.map((h) => ({
    wch: h.length <= 4 ? 12 : Math.max(14, h.length + 2),
  }));
  XLSX.utils.book_append_sheet(wb, wsData, type === "active" ? "📋 재직자" : "📋 퇴직자");

  // Sheet 2: reference (drop-down values + list of worksites/departments)
  const refRows: (string | number)[][] = [];
  refRows.push(["각 컬럼에 입력 가능한 값 참고 (⚙️ 설정 시트 대체)"]);
  refRows.push([]);

  const pairs: [string, string][] = [
    ["직급", "rank"],
    ["고용형태", "employment_type"],
    ["채용경로", "hire_channel"],
    ["최종학력", "education"],
    ["재직상태", "employee_status"],
    ["퇴직사유", "termination_reason"],
    ["회계구분", "accounting_type"],
    ["직군", "job_family"],
  ];

  // Header row for lookup columns
  refRows.push(pairs.map(([label]) => label));
  const maxLookupLen = Math.max(...pairs.map(([, key]) => groupLookups(key).length));
  for (let i = 0; i < maxLookupLen; i += 1) {
    refRows.push(pairs.map(([, key]) => groupLookups(key)[i] ?? ""));
  }

  refRows.push([]);
  refRows.push(["고정값 (직접 이 값을 써주세요)"]);
  refRows.push(["성별", "남, 여"]);
  refRows.push(["구분(내/외국인)", "내국인, 외국인"]);

  // 사업장/부서 help
  // 법인 목록 (라우팅 key)
  refRows.push([]);
  refRows.push(["법인 목록 (A열 '법인'에 이 이름 중 하나를 정확히 입력해야 매칭됩니다)"]);
  refRows.push(["BU(카테고리)", "법인명"]);
  const catById = new Map((categoriesRows ?? []).map((c) => [c.id, c.name]));
  for (const co of companiesRows ?? []) {
    refRows.push([catById.get(co.category_id) ?? "-", co.name]);
  }

  refRows.push([]);
  refRows.push(["사업장 목록 (해당 법인에 등록된 이름과 일치해야 매칭됩니다)"]);
  const wsNames = Array.from(new Set((worksites ?? []).map((w) => w.name))).sort();
  for (const n of wsNames) refRows.push([n]);

  refRows.push([]);
  refRows.push(["부서 목록 (등록되지 않은 이름은 자동 매칭되지 않습니다 — /admin/org에서 먼저 추가)"]);
  const deptNames = Array.from(new Set((departments ?? []).map((d) => d.name))).sort();
  for (const n of deptNames) refRows.push([n]);

  refRows.push([]);
  refRows.push(["업로드 규칙"]);
  refRows.push(["1", "A열 '법인'에 ReNA 그룹 법인명(위 목록) 입력 → 해당 법인으로 라우팅"]);
  refRows.push(["2", "법인 비어있으면 업로드 화면의 '기본 법인' 값 사용 (선택했을 때만)"]);
  refRows.push(["3", "법인 이름이 목록에 없으면 그 행은 건너뜁니다 (이력에 카운트)"]);
  refRows.push(["4", "사번이 같으면 기존 직원 덮어쓰기 (업서트)"]);
  refRows.push(["5", "이름 비어있으면 건너뜀"]);
  refRows.push(["6", "날짜는 YYYY-MM-DD 또는 엑셀 날짜 셀"]);
  refRows.push(["7", "연봉은 원 단위 숫자 (예: 50000000)"]);
  refRows.push(["8", "근속연수/재직기간은 입사일·퇴사일에서 자동 계산되므로 입력 불필요"]);
  refRows.push(["9", "총경력(년) = 입사전경력(년) + 근속연수 → 자동 계산. 입사전경력만 입력하세요"]);

  const wsRef = XLSX.utils.aoa_to_sheet(refRows);
  wsRef["!cols"] = [{ wch: 28 }, { wch: 28 }, { wch: 28 }, { wch: 28 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, wsRef, "📘 입력 참고");

  const buffer = XLSX.write(wb, { bookType: "xlsx", type: "buffer" }) as Buffer;
  const fileName = type === "active" ? "ReNA_HR_재직자_양식.xlsx" : "ReNA_HR_퇴직자_양식.xlsx";

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    },
  });
}
