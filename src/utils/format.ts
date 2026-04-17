export function formatKRW(n: number | null | undefined): string {
  if (!n) return "-";
  if (n >= 1e8) return `${(n / 1e8).toFixed(2)}억`;
  if (n >= 1e4) return `${(n / 1e4).toFixed(0)}만`;
  return n.toLocaleString();
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
