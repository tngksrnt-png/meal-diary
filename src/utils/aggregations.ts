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
