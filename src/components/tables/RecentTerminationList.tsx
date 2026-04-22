import Link from "next/link";
import type { Database } from "@/types/database";
import { formatTenureYears } from "@/utils/format";
import { tenureMonths } from "@/utils/aggregations";

type Employee = Database["public"]["Tables"]["employees"]["Row"];

export function RecentTerminationList({
  rows,
  companyName,
  reasonLabel,
}: {
  rows: Employee[];
  companyName: Map<string, string>;
  reasonLabel: (code: string | null) => string;
}) {
  if (rows.length === 0) {
    return (
      <div className="text-xs text-muted-auto py-10 text-center">
        최근 퇴직자가 없습니다.
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-[13px]">
        <thead className="text-[var(--fg-muted)] border-b border-[var(--border)]">
          <tr>
            <th className="text-left py-2 px-2.5 font-medium">이름</th>
            <th className="text-left py-2 px-2.5 font-medium">법인</th>
            <th className="text-left py-2 px-2.5 font-medium">퇴사일</th>
            <th className="text-right py-2 px-2.5 font-medium">재직기간</th>
            <th className="text-left py-2 px-2.5 font-medium">사유</th>
            <th className="text-right py-2 px-2.5 font-medium">상세</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((e) => (
            <tr key={e.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--muted)]/60">
              <td className="py-2 px-2.5">
                <Link href={`/employees/${e.id}`} className="font-medium hover:underline">
                  {e.name}
                </Link>
              </td>
              <td className="py-2 px-2.5 whitespace-nowrap">{companyName.get(e.company_id) ?? "-"}</td>
              <td className="py-2 px-2.5 whitespace-nowrap num">{e.termination_date ?? "-"}</td>
              <td className="py-2 px-2.5 text-right whitespace-nowrap num">
                {formatTenureYears(tenureMonths(e.hire_date, e.termination_date))}
              </td>
              <td className="py-2 px-2.5 whitespace-nowrap">{reasonLabel(e.termination_reason_code)}</td>
              <td className="py-2 px-2.5 text-right">
                <Link
                  href={`/employees/${e.id}`}
                  className="text-[var(--accent)] text-[12px] hover:underline whitespace-nowrap"
                >
                  보기
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
