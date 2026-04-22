"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import type { Database } from "@/types/database";
import {
  terminateEmployeeAction,
  reinstateEmployeeAction,
  deleteEmployeeAction,
  setOnLeaveAction,
} from "@/actions/employees";

type Lookup = Database["public"]["Tables"]["lookups"]["Row"];

export function StatusActions({
  employeeId,
  currentStatus,
  terminationReasons,
}: {
  employeeId: string;
  currentStatus: string;
  terminationReasons: Lookup[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [showTerminate, setShowTerminate] = useState(false);

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, navTo?: string) => {
    setErr(null);
    start(async () => {
      const r = await fn();
      if (!r.ok) {
        setErr(r.error ?? "오류");
        return;
      }
      if (navTo) router.push(navTo);
      else router.refresh();
    });
  };

  return (
    <div className="card p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="label-eyebrow">상태 전환</span>
        {currentStatus === "재직" && (
          <>
            <button
              type="button"
              onClick={() => setShowTerminate((v) => !v)}
              className="btn btn-danger !text-xs"
              disabled={pending}
            >
              퇴직처리
            </button>
            <button
              type="button"
              onClick={() => run(() => setOnLeaveAction({ id: employeeId, onLeave: true }))}
              className="btn !text-xs"
              disabled={pending}
            >
              휴직 전환
            </button>
          </>
        )}
        {currentStatus === "휴직" && (
          <>
            <button
              type="button"
              onClick={() => run(() => setOnLeaveAction({ id: employeeId, onLeave: false }))}
              className="btn !text-xs"
              disabled={pending}
            >
              재직 복귀
            </button>
            <button
              type="button"
              onClick={() => setShowTerminate((v) => !v)}
              className="btn btn-danger !text-xs"
              disabled={pending}
            >
              퇴직처리
            </button>
          </>
        )}
        {currentStatus === "퇴직" && (
          <button
            type="button"
            onClick={() => {
              if (confirm("이 직원을 재직 상태로 복구하시겠습니까? 퇴사일·퇴직사유가 초기화됩니다.")) {
                run(() => reinstateEmployeeAction({ id: employeeId }));
              }
            }}
            className="btn btn-primary !text-xs"
            disabled={pending}
          >
            ↻ 재직 복구
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            if (confirm("이 직원 레코드를 완전히 삭제합니다. 되돌릴 수 없습니다.")) {
              run(() => deleteEmployeeAction(employeeId), "/employees");
            }
          }}
          className="btn btn-danger !text-xs ml-auto"
          disabled={pending}
        >
          레코드 삭제
        </button>
      </div>

      {err && <div className="text-xs text-[var(--danger)]">{err}</div>}

      <AnimatePresence initial={false}>
        {showTerminate && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <TerminateForm
              employeeId={employeeId}
              reasons={terminationReasons}
              onClose={() => setShowTerminate(false)}
              onSubmit={(fn) => run(fn)}
              pending={pending}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TerminateForm({
  employeeId,
  reasons,
  onClose,
  onSubmit,
  pending,
}: {
  employeeId: string;
  reasons: Lookup[];
  onClose: () => void;
  onSubmit: (fn: () => Promise<{ ok: boolean; error?: string }>) => void;
  pending: boolean;
}) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState(reasons[0]?.code ?? "");
  const [memo, setMemo] = useState("");

  return (
    <div className="mt-2 pt-3 border-t border-[var(--border)] flex flex-col gap-3">
      <div className="label-eyebrow text-[var(--danger)]">퇴직처리 · 필수 입력</div>
      <div className="grid md:grid-cols-3 gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs text-[var(--fg-muted)]">퇴사일 *</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-sm border border-[var(--border)] px-2 py-1.5 bg-[var(--surface)]"
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs text-[var(--fg-muted)]">퇴직사유 *</span>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="rounded-sm border border-[var(--border)] px-2 py-1.5 bg-[var(--surface)]"
            required
          >
            {reasons.map((r) => (
              <option key={r.code} value={r.code}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs text-[var(--fg-muted)]">비고 (선택)</span>
          <input
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            className="rounded-sm border border-[var(--border)] px-2 py-1.5 bg-[var(--surface)]"
            placeholder="예: 계열사 전출"
          />
        </label>
      </div>
      <div className="flex gap-2 justify-end">
        <button type="button" className="btn !text-xs" onClick={onClose}>
          취소
        </button>
        <button
          type="button"
          className="btn btn-danger !text-xs"
          disabled={pending || !date || !reason}
          onClick={() =>
            onSubmit(() =>
              terminateEmployeeAction({
                id: employeeId,
                termination_date: date,
                termination_reason_code: reason,
                memo: memo || null,
              }),
            )
          }
        >
          {pending ? "처리 중…" : "퇴직 확정"}
        </button>
      </div>
    </div>
  );
}
