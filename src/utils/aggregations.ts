import type { Database } from "@/types/database";

type Employee = Database["public"]["Tables"]["employees"]["Row"];

export const CAREER_BUCKETS: { key: string; test: (y: number) => boolean }[] = [
  { key: "1년 미만", test: (y) => y < 1 },
  { key: "1~3년", test: (y) => y >= 1 && y < 3 },
  { key: "3~5년", test: (y) => y >= 3 && y < 5 },
  { key: "5~10년", test: (y) => y >= 5 && y < 10 },
  { key: "10년 이상", test: (y) => y >= 10 },
];

export function careerBucket(years: number | null | undefined): string {
  if (years == null) return "미기재";
  return CAREER_BUCKETS.find((b) => b.test(years))?.key ?? "미기재";
}

export function mean(nums: (number | null | undefined)[]): number | null {
  const xs = nums.filter((n): n is number => typeof n === "number" && !Number.isNaN(n));
  if (!xs.length) return null;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

export function sum(nums: (number | null | undefined)[]): number {
  return nums.reduce<number>((a, b) => a + (typeof b === "number" ? b : 0), 0);
}

export function min(nums: number[]): number | null {
  if (!nums.length) return null;
  return Math.min(...nums);
}

export function max(nums: number[]): number | null {
  if (!nums.length) return null;
  return Math.max(...nums);
}

export function tenureMonths(hire: string | null, termination: string | null = null): number | null {
  if (!hire) return null;
  const h = new Date(hire).getTime();
  const e = termination ? new Date(termination).getTime() : Date.now();
  if (isNaN(h) || isNaN(e)) return null;
  const days = (e - h) / (1000 * 60 * 60 * 24);
  return days / 30.4375;
}

/**
 * 총경력(년) 자동 산정.
 * - 입사전경력이 있으면: 입사전경력 + (현재 근속 또는 재직기간)
 * - 입사전경력이 없으면: 근속/재직기간만
 * - 둘 다 없으면 null
 */
export function totalCareerYears(
  careerBefore: number | null | undefined,
  hire: string | null,
  termination: string | null = null,
): number | null {
  const tenureMo = tenureMonths(hire, termination);
  const tenureYr = tenureMo != null ? tenureMo / 12 : null;
  if (careerBefore == null && tenureYr == null) return null;
  return (careerBefore ?? 0) + (tenureYr ?? 0);
}

/**
 * 만 나이 계산. 미래 일자나 잘못된 데이터는 null.
 * 입력 양식 예: "1978-07-10" 또는 ISO timestamp.
 */
export function ageFromBirth(birth: string | null, asOf: Date = new Date()): number | null {
  if (!birth) return null;
  const b = new Date(birth);
  if (isNaN(b.getTime())) return null;
  // 과거 데이터에 미래 연도(2056 등) 오기재가 있어 0~110 구간만 허용
  let age = asOf.getFullYear() - b.getFullYear();
  const m = asOf.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && asOf.getDate() < b.getDate())) age -= 1;
  if (age < 0 || age > 110) return null;
  return age;
}

export const AGE_BUCKETS: { key: string; test: (a: number) => boolean }[] = [
  { key: "20대 이하", test: (a) => a < 30 },
  { key: "30대", test: (a) => a >= 30 && a < 40 },
  { key: "40대", test: (a) => a >= 40 && a < 50 },
  { key: "50대", test: (a) => a >= 50 && a < 60 },
  { key: "60대 이상", test: (a) => a >= 60 },
];

/** ISO 날짜(YYYY-MM-DD)에서 N일 전 비교용 키 생성 */
export function daysAgoIso(days: number, ref: Date = new Date()): string {
  const d = new Date(ref.getTime() - days * 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

export function countBy<T extends string | number>(items: T[]): Map<T, number> {
  const m = new Map<T, number>();
  for (const it of items) m.set(it, (m.get(it) ?? 0) + 1);
  return m;
}

/**
 * 이직률 = 퇴직자 / (재직자 + 퇴직자)
 */
export function turnoverRate(active: number, retired: number): number {
  const total = active + retired;
  return total === 0 ? 0 : retired / total;
}

export function splitByStatus(employees: Employee[]) {
  return {
    active: employees.filter((e) => e.status_code === "재직"),
    leave: employees.filter((e) => e.status_code === "휴직"),
    retired: employees.filter((e) => e.status_code === "퇴직"),
  };
}
