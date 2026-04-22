"use client";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Database } from "@/types/database";
import {
  createLookupAction,
  updateLookupAction,
  deleteLookupAction,
  reorderLookupAction,
} from "@/actions/lookups";

type L = Database["public"]["Tables"]["lookups"]["Row"];

export function LookupsClient({
  lookups,
  types,
}: {
  lookups: L[];
  types: { key: string; label: string }[];
}) {
  const [tab, setTab] = useState(types[0]?.key ?? "rank");
  const rows = useMemo(
    () => lookups.filter((l) => l.type === tab).sort((a, b) => a.order_idx - b.order_idx),
    [lookups, tab],
  );
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [newCode, setNewCode] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const router = useRouter();

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) => {
    setErr(null);
    start(async () => {
      const r = await fn();
      if (!r.ok) {
        setErr(r.error ?? "오류");
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex overflow-x-auto gap-1 border-b border-[var(--border)]">
        {types.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-2 text-sm whitespace-nowrap ${
              tab === t.key
                ? "text-[var(--brand)] font-medium border-b-2 border-[var(--brand)]"
                : "text-[var(--fg-muted)] hover:text-[var(--fg)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {err && <div className="text-xs text-[var(--danger)]">{err}</div>}

      <div className="card p-4 flex items-center gap-2">
        <input
          placeholder="코드"
          value={newCode}
          onChange={(e) => setNewCode(e.target.value)}
          className="rounded-md border border-[var(--border)] px-2 py-1.5 text-sm w-36"
        />
        <input
          placeholder="표시 라벨"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          className="rounded-md border border-[var(--border)] px-2 py-1.5 text-sm w-48"
        />
        <button
          className="btn btn-primary !text-xs"
          disabled={!newCode || !newLabel || pending}
          onClick={() => {
            run(async () => {
              const r = await createLookupAction({ type: tab, code: newCode, label: newLabel });
              if (r.ok) {
                setNewCode("");
                setNewLabel("");
              }
              return r;
            });
          }}
        >
          추가
        </button>
      </div>

      <div className="card overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="text-[var(--fg-muted)]">
            <tr>
              <th className="text-left py-2 px-3 font-normal">순서</th>
              <th className="text-left py-2 px-3 font-normal">코드</th>
              <th className="text-left py-2 px-3 font-normal">라벨</th>
              <th className="text-left py-2 px-3 font-normal">활성</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((l, idx) => (
              <LookupRow
                key={l.id}
                row={l}
                isFirst={idx === 0}
                isLast={idx === rows.length - 1}
                onSave={(patch) => run(() => updateLookupAction(patch))}
                onDelete={(id) => run(() => deleteLookupAction(id))}
                onReorder={(direction) =>
                  run(() => reorderLookupAction({ id: l.id, direction }))
                }
              />
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-[var(--fg-muted)] text-xs">
                  항목이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LookupRow({
  row,
  isFirst,
  isLast,
  onSave,
  onDelete,
  onReorder,
}: {
  row: L;
  isFirst: boolean;
  isLast: boolean;
  onSave: (patch: { id: string; label: string; is_active: boolean }) => void;
  onDelete: (id: string) => void;
  onReorder: (direction: "up" | "down") => void;
}) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(row.label);
  const [active, setActive] = useState(row.is_active);
  return (
    <tr className="border-t border-[var(--border)]">
      <td className="py-2 px-3 w-24 whitespace-nowrap">
        <div className="inline-flex gap-0.5">
          <button
            className="btn !py-0.5 !px-1.5 !text-xs disabled:opacity-30"
            disabled={isFirst}
            onClick={() => onReorder("up")}
            aria-label="위로"
          >
            ▲
          </button>
          <button
            className="btn !py-0.5 !px-1.5 !text-xs disabled:opacity-30"
            disabled={isLast}
            onClick={() => onReorder("down")}
            aria-label="아래로"
          >
            ▼
          </button>
        </div>
      </td>
      <td className="py-2 px-3 text-[var(--fg-muted)]">{row.code}</td>
      <td className="py-2 px-3">
        {editing ? (
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="rounded-md border border-[var(--border)] px-2 py-1 text-sm w-48"
          />
        ) : (
          row.label
        )}
      </td>
      <td className="py-2 px-3">
        <label className="inline-flex items-center gap-2 text-xs">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} disabled={!editing} />
          {active ? "활성" : "비활성"}
        </label>
      </td>
      <td className="py-2 px-3 text-right whitespace-nowrap">
        {editing ? (
          <>
            <button
              className="btn btn-primary !py-0.5 !px-2 !text-xs"
              onClick={() => {
                onSave({ id: row.id, label, is_active: active });
                setEditing(false);
              }}
            >
              저장
            </button>
            <button
              className="btn !py-0.5 !px-2 !text-xs ml-1"
              onClick={() => {
                setLabel(row.label);
                setActive(row.is_active);
                setEditing(false);
              }}
            >
              취소
            </button>
          </>
        ) : (
          <>
            <button className="btn !py-0.5 !px-2 !text-xs" onClick={() => setEditing(true)}>
              수정
            </button>
            <button
              className="btn btn-danger !py-0.5 !px-2 !text-xs ml-1"
              onClick={() => onDelete(row.id)}
            >
              삭제
            </button>
          </>
        )}
      </td>
    </tr>
  );
}
