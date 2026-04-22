import Link from "next/link";

export type StatusRow = {
  key: string;
  label: string;
  filter?: Record<string, string>;
  active: number;
  onLeave: number;
  retired: number;
};

function CellLink({
  href,
  value,
  dim,
}: {
  href: string;
  value: number;
  dim?: boolean;
}) {
  if (value === 0) {
    return <span className="text-[var(--fg-subtle)] num">0</span>;
  }
  return (
    <Link
      href={href}
      className={`inline-block num px-1.5 py-0.5 -my-0.5 rounded-sm hover:bg-[var(--muted)] hover:underline decoration-dotted underline-offset-2 ${
        dim ? "text-[var(--fg-muted)]" : ""
      }`}
    >
      {value.toLocaleString()}
    </Link>
  );
}

function build(filter: Record<string, string> | undefined, status: string) {
  const qp = new URLSearchParams({ ...(filter ?? {}), status });
  return `/employees?${qp.toString()}`;
}

export function StatusTable({
  rows,
  firstColumnHeader = "구분",
  firstColumnClickable = false,
  showTotalRow = true,
}: {
  rows: StatusRow[];
  firstColumnHeader?: string;
  firstColumnClickable?: boolean;
  showTotalRow?: boolean;
}) {
  const totals = rows.reduce(
    (a, r) => ({
      active: a.active + r.active,
      onLeave: a.onLeave + r.onLeave,
      retired: a.retired + r.retired,
    }),
    { active: 0, onLeave: 0, retired: 0 },
  );

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-[12.5px] whitespace-nowrap">
        <thead className="text-[var(--fg-muted)]">
          <tr className="border-b border-[var(--border)]">
            <th className="text-left py-2 pl-3.5 pr-2 font-medium">{firstColumnHeader}</th>
            <th className="text-right py-2 px-2 font-medium">재직</th>
            <th className="text-right py-2 px-2 font-medium">휴직</th>
            <th className="text-right py-2 px-2 font-medium">퇴직</th>
            <th className="text-right py-2 pr-3.5 pl-2 font-medium">합계</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const total = r.active + r.onLeave + r.retired;
            const labelEl = firstColumnClickable && r.filter ? (
              <Link
                href={`/employees?${new URLSearchParams(r.filter).toString()}&status=재직`}
                className="hover:underline"
              >
                {r.label}
              </Link>
            ) : (
              <span>{r.label}</span>
            );
            return (
              <tr key={r.key} className="border-b border-[var(--border)] last:border-0">
                <td className="py-2 pl-3.5 pr-2">{labelEl}</td>
                <td className="py-2 px-2 text-right">
                  <CellLink href={build(r.filter, "재직")} value={r.active} />
                </td>
                <td className="py-2 px-2 text-right">
                  <CellLink href={build(r.filter, "휴직")} value={r.onLeave} dim />
                </td>
                <td className="py-2 px-2 text-right">
                  <CellLink href={build(r.filter, "퇴직")} value={r.retired} dim />
                </td>
                <td className="py-2 pr-3.5 pl-2 text-right font-medium num">
                  {total.toLocaleString()}
                </td>
              </tr>
            );
          })}
          {showTotalRow && (
            <tr className="bg-[var(--muted)]/60 font-medium">
              <td className="py-2 pl-3.5 pr-2">전체</td>
              <td className="py-2 px-2 text-right num">{totals.active.toLocaleString()}</td>
              <td className="py-2 px-2 text-right num">{totals.onLeave.toLocaleString()}</td>
              <td className="py-2 px-2 text-right num">{totals.retired.toLocaleString()}</td>
              <td className="py-2 pr-3.5 pl-2 text-right num">
                {(totals.active + totals.onLeave + totals.retired).toLocaleString()}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
