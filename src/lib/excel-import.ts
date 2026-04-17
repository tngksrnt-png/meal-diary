import * as XLSX from "xlsx";

export type ImportSheetType = "active" | "retired";

export type RawEmployeeRow = {
  employee_no: string | null;
  name: string;
  dept_name: string | null;
  rank: string | null;
  birth_date: string | null;
  hire_date: string | null;
  termination_date: string | null;
  tenure_years: number | null;
  gender: string | null;
  employment_type: string | null;
  nationality_type: string | null;
  nationality: string | null;
  worksite_name: string | null;
  accounting_type: string | null;
  job_family: string | null;
  annual_salary: number | null;
  hire_channel: string | null;
  education: string | null;
  career_before: number | null;
  total_career: number | null;
  status: string | null;
  termination_reason: string | null;
  memo: string | null;
};

const COL_HEADERS_ACTIVE = [
  "사번", "이름", "부서", "직급", "생년월일", "입사일", "근속연수",
  "성별", "고용형태", "구분(내/외국인)", "국적", "사업장", "회계구분", "직군",
  "연봉(원)", "채용경로", "최종학력", "입사전경력(년)", "총경력(년)", "재직상태", "비고",
];

const COL_HEADERS_RETIRED = [
  "사번", "이름", "부서", "직급", "생년월일", "입사일", "퇴사일", "재직기간",
  "성별", "고용형태", "구분(내/외국인)", "국적", "사업장", "회계구분", "직군",
  "연봉(원)", "채용경로", "최종학력", "입사전경력(년)", "총경력(년)", "재직상태",
  "퇴직사유", "비고",
];

function toIsoDate(v: unknown): string | null {
  if (v == null || v === "") return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "number") {
    // Excel serial date
    const epoch = new Date(Date.UTC(1899, 11, 30));
    const d = new Date(epoch.getTime() + v * 86400000);
    return d.toISOString().slice(0, 10);
  }
  const s = String(v).trim();
  const parsed = new Date(s);
  return isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

function toNumber(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(/[, ]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function toStr(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

export function parseEmployeeSheet(
  fileBuffer: ArrayBuffer,
  sheetType: ImportSheetType,
): { rows: RawEmployeeRow[]; sheetName: string } {
  const wb = XLSX.read(fileBuffer, { type: "array", cellDates: true });
  void (sheetType === "active" ? COL_HEADERS_ACTIVE : COL_HEADERS_RETIRED);
  let pick: string | null = null;
  let headerRow: unknown[] | null = null;

  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    if (!ws) continue;
    const arr = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, blankrows: false });
    if (!arr.length) continue;
    const first = (arr[0] as unknown[]).map((c) => String(c ?? "").trim());
    // Must contain key headers
    const hasHire = first.includes("입사일");
    const hasName = first.includes("이름");
    const hasEmployeeNo = first.includes("사번");
    if (!hasHire || !hasName || !hasEmployeeNo) continue;
    if (sheetType === "retired" && !first.includes("퇴사일")) continue;
    if (sheetType === "active" && first.includes("퇴사일")) continue;
    pick = name;
    headerRow = first;
    break;
  }
  if (!pick || !headerRow) {
    throw new Error(
      `${sheetType === "active" ? "재직자" : "퇴직자"} 시트를 찾지 못했습니다. 헤더를 확인하세요.`,
    );
  }

  const ws = wb.Sheets[pick];
  if (!ws) throw new Error("시트를 읽을 수 없습니다.");

  const idx = (name: string) => (headerRow as string[]).indexOf(name);
  const arr = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, blankrows: false });
  const dataRows = arr.slice(1) as unknown[][];

  const rows: RawEmployeeRow[] = [];
  for (const r of dataRows) {
    const name = toStr(r[idx("이름")]);
    if (!name) continue;
    rows.push({
      employee_no: toStr(r[idx("사번")]),
      name,
      dept_name: toStr(r[idx("부서")]),
      rank: toStr(r[idx("직급")]),
      birth_date: toIsoDate(r[idx("생년월일")]),
      hire_date: toIsoDate(r[idx("입사일")]),
      termination_date: sheetType === "retired" ? toIsoDate(r[idx("퇴사일")]) : null,
      tenure_years: toNumber(r[idx(sheetType === "retired" ? "재직기간" : "근속연수")]),
      gender: toStr(r[idx("성별")]),
      employment_type: toStr(r[idx("고용형태")]),
      nationality_type: toStr(r[idx("구분(내/외국인)")]),
      nationality: toStr(r[idx("국적")]),
      worksite_name: toStr(r[idx("사업장")]),
      accounting_type: toStr(r[idx("회계구분")]),
      job_family: toStr(r[idx("직군")]),
      annual_salary: toNumber(r[idx("연봉(원)")]),
      hire_channel: toStr(r[idx("채용경로")]),
      education: toStr(r[idx("최종학력")]),
      career_before: toNumber(r[idx("입사전경력(년)")]),
      total_career: toNumber(r[idx("총경력(년)")]),
      status: toStr(r[idx("재직상태")]) ?? (sheetType === "retired" ? "퇴직" : "재직"),
      termination_reason: sheetType === "retired" ? toStr(r[idx("퇴직사유")]) : null,
      memo: toStr(r[idx("비고")]),
    });
  }
  return { rows, sheetName: pick };
}
