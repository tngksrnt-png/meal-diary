"use client";
import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { Database } from "@/types/database";
import {
  createCategoryAction, updateCategoryAction, deleteCategoryAction,
  createCompanyAction, updateCompanyAction, deleteCompanyAction,
  createWorksiteAction, updateWorksiteAction, deleteWorksiteAction,
  createDepartmentAction, updateDepartmentAction, deleteDepartmentAction,
} from "@/actions/org";

type C = Database["public"]["Tables"]["categories"]["Row"];
type Co = Database["public"]["Tables"]["companies"]["Row"];
type W = Database["public"]["Tables"]["worksites"]["Row"];
type D = Database["public"]["Tables"]["departments"]["Row"];

export type OrgAdminData = {
  categories: C[];
  companies: Co[];
  worksites: W[];
  departments: D[];
  counts: {
    byCompany: Record<string, number>;
    byWorksite: Record<string, number>;
    byDepartment: Record<string, number>;
  };
};

function useAction() {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) => {
    setErr(null);
    start(async () => {
      const res = await fn();
      if (!res.ok) setErr(res.error ?? "오류가 발생했습니다.");
    });
  };
  return { pending, err, run };
}

function InlineInput({
  value,
  onSave,
  placeholder,
  extra,
}: {
  value: string;
  onSave: (v: string) => void;
  placeholder?: string;
  extra?: React.ReactNode;
}) {
  const [v, setV] = useState(value);
  return (
    <div className="flex gap-1 items-center">
      <input
        value={v}
        placeholder={placeholder}
        onChange={(e) => setV(e.target.value)}
        className="rounded-md border border-[var(--border)] px-2 py-1 text-sm w-40"
      />
      {extra}
      <button
        type="button"
        onClick={() => onSave(v)}
        className="btn btn-primary !px-2 !py-1 !text-xs"
      >
        저장
      </button>
    </div>
  );
}

function Row({
  depth,
  expanded,
  onToggle,
  label,
  badge,
  actions,
}: {
  depth: number;
  expanded?: boolean;
  onToggle?: () => void;
  label: React.ReactNode;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div
      className="flex items-center gap-2 py-2 px-2 border-b border-[var(--border)]"
      style={{ paddingLeft: `${depth * 16 + 8}px` }}
    >
      {onToggle ? (
        <button onClick={onToggle} className="w-4 text-xs text-[var(--fg-subtle)]">
          {expanded ? "▼" : "▶"}
        </button>
      ) : (
        <span className="w-4" />
      )}
      <div className="min-w-0 flex-1 text-sm flex items-center gap-2 truncate">{label}</div>
      {badge ? <span className="text-[11px] text-[var(--fg-muted)]">{badge}</span> : null}
      <div className="flex items-center gap-1 shrink-0">{actions}</div>
    </div>
  );
}

export function OrgAdminClient({ data }: { data: OrgAdminData }) {
  const [openCat, setOpenCat] = useState<Record<string, boolean>>({});
  const [openCo, setOpenCo] = useState<Record<string, boolean>>({});
  const [openWs, setOpenWs] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState<string | null>(null);
  const [newCatOpen, setNewCatOpen] = useState(false);
  const { pending, err, run } = useAction();

  const { categories, companies, worksites, departments, counts } = data;

  return (
    <div className="card">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border)]">
        <div className="text-xs text-[var(--fg-muted)]">조직 트리</div>
        <button
          className="btn !py-1 !px-2 !text-xs"
          onClick={() => setNewCatOpen((v) => !v)}
        >
          + 카테고리 추가
        </button>
      </div>
      <AnimatePresence>
        {newCatOpen && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            className="overflow-hidden bg-[var(--muted)]"
          >
            <NewCategoryForm
              onCreate={(code, name, is_hq) => {
                run(() => createCategoryAction({ code, name, is_hq }));
                setNewCatOpen(false);
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
      {err && <div className="px-3 py-2 text-xs text-[var(--danger)]">{err}</div>}

      {categories.map((cat) => {
        const catCompanies = companies.filter((c) => c.category_id === cat.id);
        const isOpen = openCat[cat.id] ?? true;
        const isEditing = editing === `cat-${cat.id}`;
        return (
          <div key={cat.id}>
            <Row
              depth={0}
              expanded={isOpen}
              onToggle={() => setOpenCat({ ...openCat, [cat.id]: !isOpen })}
              label={
                isEditing ? (
                  <InlineEdit
                    defaults={{ code: cat.code, name: cat.name }}
                    onSave={(v) => {
                      run(() => updateCategoryAction({ id: cat.id, code: v.code, name: v.name }));
                      setEditing(null);
                    }}
                    onCancel={() => setEditing(null)}
                  />
                ) : (
                  <span>
                    <b>{cat.name}</b>{" "}
                    <span className="text-[var(--fg-subtle)] text-xs">({cat.code}{cat.is_hq ? ", HQ" : ""})</span>
                  </span>
                )
              }
              badge={`법인 ${catCompanies.length}`}
              actions={
                !isEditing && (
                  <>
                    <button className="btn !py-0.5 !px-2 !text-xs" onClick={() => setAdding(`cat-${cat.id}`)}>+법인</button>
                    <button className="btn !py-0.5 !px-2 !text-xs" onClick={() => setEditing(`cat-${cat.id}`)}>수정</button>
                    <button
                      className="btn btn-danger !py-0.5 !px-2 !text-xs"
                      disabled={pending}
                      onClick={() => run(() => deleteCategoryAction(cat.id))}
                    >
                      삭제
                    </button>
                  </>
                )
              }
            />
            {adding === `cat-${cat.id}` && (
              <div className="pl-10 py-2 bg-[var(--muted)]">
                <InlineInput
                  value=""
                  placeholder="법인 이름"
                  onSave={(name) => {
                    if (name) run(() => createCompanyAction({ category_id: cat.id, name }));
                    setAdding(null);
                  }}
                />
              </div>
            )}

            {isOpen && catCompanies.map((co) => {
              const coWorksites = worksites.filter((w) => w.company_id === co.id);
              const coDepartments = departments.filter((d) => d.company_id === co.id);
              const coOpen = openCo[co.id] ?? false;
              const coEditing = editing === `co-${co.id}`;
              return (
                <div key={co.id}>
                  <Row
                    depth={1}
                    expanded={coOpen}
                    onToggle={() => setOpenCo({ ...openCo, [co.id]: !coOpen })}
                    label={
                      coEditing ? (
                        <InlineEdit
                          defaults={{ code: co.ceo_name ?? "", name: co.name }}
                          codeLabel="대표자"
                          onSave={(v) => {
                            run(() => updateCompanyAction({ id: co.id, name: v.name, ceo_name: v.code }));
                            setEditing(null);
                          }}
                          onCancel={() => setEditing(null)}
                        />
                      ) : (
                        <span>
                          {co.name}{" "}
                          <span className="text-[var(--fg-subtle)] text-xs">({co.ceo_name ?? "-"})</span>
                        </span>
                      )
                    }
                    badge={`재직 ${counts.byCompany[co.id] ?? 0}`}
                    actions={
                      !coEditing && (
                        <>
                          <button className="btn !py-0.5 !px-2 !text-xs" onClick={() => setAdding(`co-${co.id}`)}>+사업장</button>
                          <button className="btn !py-0.5 !px-2 !text-xs" onClick={() => setEditing(`co-${co.id}`)}>수정</button>
                          <button
                            className="btn btn-danger !py-0.5 !px-2 !text-xs"
                            disabled={pending}
                            onClick={() => run(() => deleteCompanyAction(co.id))}
                          >
                            삭제
                          </button>
                        </>
                      )
                    }
                  />
                  {adding === `co-${co.id}` && (
                    <div className="pl-16 py-2 bg-[var(--muted)]">
                      <InlineInput
                        value=""
                        placeholder="사업장 이름"
                        onSave={(name) => {
                          if (name) run(() => createWorksiteAction({ company_id: co.id, name }));
                          setAdding(null);
                        }}
                      />
                    </div>
                  )}

                  {coOpen && coWorksites.map((ws) => {
                    const wsDeps = coDepartments.filter((d) => d.worksite_id === ws.id);
                    const wsOpen = openWs[ws.id] ?? false;
                    const wsEditing = editing === `ws-${ws.id}`;
                    return (
                      <div key={ws.id}>
                        <Row
                          depth={2}
                          expanded={wsOpen}
                          onToggle={() => setOpenWs({ ...openWs, [ws.id]: !wsOpen })}
                          label={
                            wsEditing ? (
                              <InlineEdit
                                defaults={{ name: ws.name }}
                                onSave={(v) => {
                                  run(() => updateWorksiteAction({ id: ws.id, name: v.name }));
                                  setEditing(null);
                                }}
                                onCancel={() => setEditing(null)}
                              />
                            ) : (
                              <span>{ws.name}</span>
                            )
                          }
                          badge={`부서 ${wsDeps.length} · 재직 ${counts.byWorksite[ws.id] ?? 0}`}
                          actions={
                            !wsEditing && (
                              <>
                                <button className="btn !py-0.5 !px-2 !text-xs" onClick={() => setAdding(`ws-${ws.id}`)}>+부서</button>
                                <button className="btn !py-0.5 !px-2 !text-xs" onClick={() => setEditing(`ws-${ws.id}`)}>수정</button>
                                <button
                                  className="btn btn-danger !py-0.5 !px-2 !text-xs"
                                  disabled={pending}
                                  onClick={() => run(() => deleteWorksiteAction(ws.id))}
                                >
                                  삭제
                                </button>
                              </>
                            )
                          }
                        />
                        {adding === `ws-${ws.id}` && (
                          <div className="pl-20 py-2 bg-[var(--muted)]">
                            <InlineInput
                              value=""
                              placeholder="부서 이름"
                              onSave={(name) => {
                                if (name) run(() => createDepartmentAction({ company_id: co.id, worksite_id: ws.id, name }));
                                setAdding(null);
                              }}
                            />
                          </div>
                        )}
                        {wsOpen && wsDeps.map((d) => {
                          const isE = editing === `d-${d.id}`;
                          return (
                            <Row
                              key={d.id}
                              depth={3}
                              label={
                                isE ? (
                                  <InlineEdit
                                    defaults={{ name: d.name }}
                                    onSave={(v) => {
                                      run(() => updateDepartmentAction({ id: d.id, name: v.name }));
                                      setEditing(null);
                                    }}
                                    onCancel={() => setEditing(null)}
                                  />
                                ) : (
                                  <span>{d.name}</span>
                                )
                              }
                              badge={`재직 ${counts.byDepartment[d.id] ?? 0}`}
                              actions={
                                !isE && (
                                  <>
                                    <button className="btn !py-0.5 !px-2 !text-xs" onClick={() => setEditing(`d-${d.id}`)}>수정</button>
                                    <button
                                      className="btn btn-danger !py-0.5 !px-2 !text-xs"
                                      disabled={pending}
                                      onClick={() => run(() => deleteDepartmentAction(d.id))}
                                    >
                                      삭제
                                    </button>
                                  </>
                                )
                              }
                            />
                          );
                        })}
                      </div>
                    );
                  })}

                  {/* HQ divisions (no worksite) */}
                  {coOpen && coDepartments.filter((d) => !d.worksite_id && !d.parent_department_id).map((div) => {
                    const teams = coDepartments.filter((t) => t.parent_department_id === div.id);
                    const isE = editing === `d-${div.id}`;
                    return (
                      <div key={div.id}>
                        <Row
                          depth={2}
                          label={
                            isE ? (
                              <InlineEdit
                                defaults={{ name: div.name }}
                                onSave={(v) => {
                                  run(() => updateDepartmentAction({ id: div.id, name: v.name }));
                                  setEditing(null);
                                }}
                                onCancel={() => setEditing(null)}
                              />
                            ) : (
                              <span>
                                {div.name}{" "}
                                <span className="text-[var(--fg-subtle)] text-xs">({div.kind})</span>
                              </span>
                            )
                          }
                          badge={`팀 ${teams.length}`}
                          actions={
                            !isE && (
                              <>
                                <button className="btn !py-0.5 !px-2 !text-xs" onClick={() => setAdding(`d-${div.id}`)}>+팀</button>
                                <button className="btn !py-0.5 !px-2 !text-xs" onClick={() => setEditing(`d-${div.id}`)}>수정</button>
                                <button
                                  className="btn btn-danger !py-0.5 !px-2 !text-xs"
                                  disabled={pending}
                                  onClick={() => run(() => deleteDepartmentAction(div.id))}
                                >
                                  삭제
                                </button>
                              </>
                            )
                          }
                        />
                        {adding === `d-${div.id}` && (
                          <div className="pl-20 py-2 bg-[var(--muted)]">
                            <InlineInput
                              value=""
                              placeholder="팀 이름"
                              onSave={(name) => {
                                if (name) run(() => createDepartmentAction({
                                  company_id: co.id,
                                  parent_department_id: div.id,
                                  name,
                                  kind: "team",
                                }));
                                setAdding(null);
                              }}
                            />
                          </div>
                        )}
                        {teams.map((t) => {
                          const tE = editing === `d-${t.id}`;
                          return (
                            <Row
                              key={t.id}
                              depth={3}
                              label={
                                tE ? (
                                  <InlineEdit
                                    defaults={{ name: t.name }}
                                    onSave={(v) => {
                                      run(() => updateDepartmentAction({ id: t.id, name: v.name }));
                                      setEditing(null);
                                    }}
                                    onCancel={() => setEditing(null)}
                                  />
                                ) : (
                                  <span>{t.name}</span>
                                )
                              }
                              badge={`재직 ${counts.byDepartment[t.id] ?? 0}`}
                              actions={
                                !tE && (
                                  <>
                                    <button className="btn !py-0.5 !px-2 !text-xs" onClick={() => setEditing(`d-${t.id}`)}>수정</button>
                                    <button
                                      className="btn btn-danger !py-0.5 !px-2 !text-xs"
                                      disabled={pending}
                                      onClick={() => run(() => deleteDepartmentAction(t.id))}
                                    >
                                      삭제
                                    </button>
                                  </>
                                )
                              }
                            />
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function NewCategoryForm({ onCreate }: { onCreate: (code: string, name: string, is_hq: boolean) => void }) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [isHq, setIsHq] = useState(false);
  return (
    <div className="p-3 flex gap-2 items-center flex-wrap text-sm">
      <input placeholder="코드(예: Sorting)" value={code} onChange={(e) => setCode(e.target.value)}
        className="rounded-md border border-[var(--border)] px-2 py-1 w-40" />
      <input placeholder="이름" value={name} onChange={(e) => setName(e.target.value)}
        className="rounded-md border border-[var(--border)] px-2 py-1 w-40" />
      <label className="text-xs flex items-center gap-1">
        <input type="checkbox" checked={isHq} onChange={(e) => setIsHq(e.target.checked)} /> HQ
      </label>
      <button className="btn btn-primary !text-xs" onClick={() => onCreate(code, name, isHq)}>추가</button>
    </div>
  );
}

function InlineEdit({
  defaults,
  codeLabel,
  onSave,
  onCancel,
}: {
  defaults: { code?: string; name: string };
  codeLabel?: string;
  onSave: (v: { code: string; name: string }) => void;
  onCancel: () => void;
}) {
  const [code, setCode] = useState(defaults.code ?? "");
  const [name, setName] = useState(defaults.name);
  return (
    <span className="flex gap-1 items-center">
      {defaults.code !== undefined && (
        <input
          placeholder={codeLabel ?? "코드"}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="rounded-md border border-[var(--border)] px-2 py-0.5 w-28 text-sm"
        />
      )}
      <input
        placeholder="이름"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="rounded-md border border-[var(--border)] px-2 py-0.5 w-40 text-sm"
      />
      <button className="btn btn-primary !py-0.5 !px-2 !text-xs" onClick={() => onSave({ code, name })}>저장</button>
      <button className="btn !py-0.5 !px-2 !text-xs" onClick={onCancel}>취소</button>
    </span>
  );
}
