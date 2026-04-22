export type MatrixCol = { key: string; label: string };
export type MatrixRow = { key: string; label: string; values: Record<string, number | string> };

export function MatrixTable({
  cols,
  rows,
  corner = "",
  showRowTotal = true,
  showColTotal = true,
  numeric = true,
}: {
  cols: MatrixCol[];
  rows: MatrixRow[];
  corner?: string;
  showRowTotal?: boolean;
  showColTotal?: boolean;
  numeric?: boolean;
}) {
  const rowTotal = (r: MatrixRow): number =>
    cols.reduce((s, c) => s + (typeof r.values[c.key] === "number" ? (r.values[c.key] as number) : 0), 0);
  const colTotal = (c: MatrixCol): number =>
    rows.reduce(
      (s, r) => s + (typeof r.values[c.key] === "number" ? (r.values[c.key] as number) : 0),
      0,
    );

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="text-[var(--fg-muted)]">
          <tr>
            <th className="text-left py-2 pr-4 font-normal">{corner}</th>
            {cols.map((c) => (
              <th key={c.key} className="text-right py-2 px-3 font-normal">
                {c.label}
              </th>
            ))}
            {showRowTotal && (
              <th className="text-right py-2 pl-3 font-normal">합계</th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className="border-t border-[var(--border)]">
              <td className="py-2 pr-4">{r.label}</td>
              {cols.map((c) => (
                <td
                  key={c.key}
                  className={`py-2 px-3 text-right ${numeric ? "tabular-nums" : ""}`}
                >
                  {r.values[c.key] ?? (numeric ? 0 : "-")}
                </td>
              ))}
              {showRowTotal && (
                <td className="py-2 pl-3 text-right font-medium tabular-nums">
                  {rowTotal(r).toLocaleString()}
                </td>
              )}
            </tr>
          ))}
          {showColTotal && (
            <tr className="border-t border-[var(--border)] text-[var(--fg-muted)]">
              <td className="py-2 pr-4">합계</td>
              {cols.map((c) => (
                <td key={c.key} className="py-2 px-3 text-right tabular-nums">
                  {colTotal(c).toLocaleString()}
                </td>
              ))}
              {showRowTotal && (
                <td className="py-2 pl-3 text-right font-semibold tabular-nums">
                  {rows.reduce((s, r) => s + rowTotal(r), 0).toLocaleString()}
                </td>
              )}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
