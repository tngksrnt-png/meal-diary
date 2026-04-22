export function formatKRW(n: number | null | undefined): string {
  if (!n) return "-";
  if (n >= 1e8) return `${(n / 1e8).toFixed(2)}억원`;
  if (n >= 1e4) return `${Math.round(n / 1e4).toLocaleString()}만원`;
  return `${n.toLocaleString()}원`;
}

export function formatCount(n: number | null | undefined): string {
  if (n == null) return "-";
  return `${n.toLocaleString()}명`;
}

export function formatPercent(n: number | null | undefined, digits = 1): string {
  if (n == null || !isFinite(n)) return "-";
  return `${(n * 100).toFixed(digits)}%`;
}

export function formatYears(n: number | null | undefined, digits = 1): string {
  if (n == null) return "-";
  return `${n.toFixed(digits)}년`;
}

export function formatMonths(n: number | null | undefined): string {
  if (n == null) return "-";
  return `${n.toFixed(1)}개월`;
}

/**
 * 근속/재직기간 표기는 "년" 단위로 통일.
 * 입력은 개월 수(tenureMonths 결과). 1년 미만은 자동으로 "X개월"로 표시.
 */
export function formatTenureYears(months: number | null | undefined, digits = 1): string {
  if (months == null) return "-";
  if (months < 12) return `${months.toFixed(0)}개월`;
  return `${(months / 12).toFixed(digits)}년`;
}
