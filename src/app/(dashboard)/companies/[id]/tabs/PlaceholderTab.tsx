const LABELS: Record<string, string> = {
  retired: "퇴직자 대시보드",
  worksites: "사업장별 비교",
  comp: "부서·연봉 분석",
  hiring: "채용현황 대시보드",
};

export function PlaceholderTab({ tab }: { tab: string }) {
  return (
    <div className="card p-8 text-center flex flex-col gap-2">
      <div className="text-sm text-[var(--fg-muted)]">{LABELS[tab] ?? tab}</div>
      <div className="text-xs text-[var(--fg-subtle)]">다음 릴리즈(P2)에서 구현 예정</div>
    </div>
  );
}
