"use client";
import { useMemo, useState, useTransition } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useRouter } from "next/navigation";
import type { Database } from "@/types/database";
import {
  createCategoryAction, updateCategoryAction, deleteCategoryAction,
  createCompanyAction, updateCompanyAction, deleteCompanyAction,
  createWorksiteAction, updateWorksiteAction, deleteWorksiteAction,
  createDepartmentAction, updateDepartmentAction, deleteDepartmentAction,
  reorderCategoryAction, reorderCompanyAction, reorderWorksiteAction, reorderDepartmentAction,
  moveCompanyAction, moveWorksiteAction, moveDepartmentAction,
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
  const router = useRouter();
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) => {
    setErr(null);
    start(async () => {
      const res = await fn();
      if (!res.ok) {
        setErr(res.error ?? "오류가 발생했습니다.");
        return;
      }
      router.refresh();
    });
  };
  return { pending, err, run, clearErr: () => setErr(null) };
}

function ReorderButtons({
  onUp,
  onDown,
  disabled,
}: {
  onUp: () => void;
  onDown: () => void;
  disabled?: boolean;
}) {
  const cls =
    "w-6 h-6 inline-flex items-center justify-center rounded text-[var(--fg-subtle)] hover:bg-[var(--muted)] hover:text-[var(--fg)] disabled:opacity-30 disabled:cursor-not-allowed";
  return (
    <span className="flex items-center gap-0.5">
      <button type="button" className={cls} disabled={disabled} onClick={onUp} title="위로 이동">
        ▲
      </button>
      <button type="button" className={cls} disabled={disabled} onClick={onDown} title="아래로 이동">
        ▼
      </button>
    </span>
  );
}

function MoveDropdown({
  options,
  onMove,
  label = "📂 이동",
}: {
  options: { id: string; label: string }[];
  onMove: (id: string) => void;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  if (options.length === 0) return null;
  return (
    <div className="relative inline-block">
      <button
        type="button"
        className="btn !py-0.5 !px-2 !text-xs"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        {label}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-20 w-56 max-h-64 overflow-auto rounded-md border border-[var(--border)] bg-[var(--surface)] shadow-md text-xs">
            {options.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => {
                  setOpen(false);
                  onMove(o.id);
                }}
                className="block w-full text-left px-3 py-1.5 hover:bg-[var(--muted)] truncate"
              >
                {o.label}
              </button>
            ))}
          </div>
        </>
      )}
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
  onDoubleClick,
  highlighted,
}: {
  depth: number;
  expanded?: boolean;
  onToggle?: () => void;
  label: React.ReactNode;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  onDoubleClick?: () => void;
  highlighted?: boolean;
}) {
  return (
    <div
      className={`group flex items-center gap-2 py-2 px-2 border-b border-[var(--border)] hover:bg-[var(--muted)]/40 ${
        highlighted ? "bg-[var(--brand-soft)]/40" : ""
      }`}
      style={{ paddingLeft: `${depth * 16 + 8}px` }}
      onDoubleClick={onDoubleClick}
    >
      {onToggle ? (
        <button onClick={onToggle} className="w-4 text-xs text-[var(--fg-subtle)]">
          {expanded ? "▼" : "▶"}
        </button>
      ) : (
        <span className="w-4" />
      )}
      <div className="min-w-0 flex-1 text-sm flex items-center gap-2 truncate">{label}</div>
      {badge ? <span className="text-[11px] text-[var(--fg-muted)] shrink-0">{badge}</span> : null}
      <div className="flex items-center gap-1 shrink-0 opacity-50 group-hover:opacity-100 transition-opacity">
        {actions}
      </div>
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
  const [query, setQuery] = useState("");
  const { pending, err, run } = useAction();

  const { categories, companies, worksites, departments, counts } = data;

  // For search: any descendant matches?
  const matchesSubtree = useMemo(() => {
    if (!query) return null;
    const q = query.toLowerCase();
    const m = (s: string) => s.toLowerCase().includes(q);
    const result = new Set<string>();
    for (const cat of categories) {
      const catCompanies = companies.filter((c) => c.category_id === cat.id);
      let catHas = m(cat.name) || m(cat.code);
      for (const co of catCompanies) {
        let coHas = m(co.name) || m(co.ceo_name ?? "");
        const coWs = worksites.filter((w) => w.company_id === co.id);
        const coDeps = departments.filter((d) => d.company_id === co.id);
        for (const ws of coWs) {
          let wsHas = m(ws.name);
          for (const d of coDeps.filter((d) => d.worksite_id === ws.id)) {
            if (m(d.name)) {
              wsHas = true;
              result.add(d.id);
            }
          }
          if (wsHas) {
            result.add(ws.id);
            coHas = true;
          }
        }
        for (const div of coDeps.filter((d) => !d.worksite_id && !d.parent_department_id)) {
          let divHas = m(div.name);
          for (const t of coDeps.filter((t) => t.parent_department_id === div.id)) {
            if (m(t.name)) {
              divHas = true;
              result.add(t.id);
            }
          }
          if (divHas) {
            result.add(div.id);
            coHas = true;
          }
        }
        if (coHas) {
          result.add(co.id);
          catHas = true;
        }
      }
      if (catHas) result.add(cat.id);
    }
    return result;
  }, [query, categories, companies, worksites, departments]);

  const isVisible = (id: string) => !matchesSubtree || matchesSubtree.has(id);
  const isMatch = (id: string, name: string) => {
    if (!query) return false;
    return name.toLowerCase().includes(query.toLowerCase()) && (matchesSubtree?.has(id) ?? false);
  };

  // Sibling indices for ↑↓ enable/disable
  function siblingIndex<T extends { id: string }>(list: T[], id: string) {
    const idx = list.findIndex((x) => x.id === id);
    return { idx, isFirst: idx <= 0, isLast: idx === list.length - 1 || idx === -1 };
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Search + add toolbar */}
      <div className="card p-3 flex flex-col md:flex-row gap-2 md:items-center">
        <div className="relative flex-1">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="BU·법인·사업장·부서 검색"
            className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm pr-8"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--fg-subtle)] hover:text-[var(--fg)]"
            >
              ✕
            </button>
          )}
        </div>
        <button
          className="btn !py-1.5 !px-3 !text-sm"
          onClick={() => setNewCatOpen((v) => !v)}
        >
          + BU(카테고리) 추가
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="px-3 py-2 border-b border-[var(--border)] text-[11px] text-[var(--fg-muted)] flex items-center justify-between">
          <span>조직 트리 · 행 더블클릭 = 빠른 수정</span>
          <span>호버 시 작업 버튼 표시</span>
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
                onCancel={() => setNewCatOpen(false)}
              />
            </motion.div>
          )}
        </AnimatePresence>
        {err && <div className="px-3 py-2 text-xs text-[var(--danger)] bg-red-50 border-b border-red-100">{err}</div>}

        {categories.map((cat) => {
          const catCompanies = companies.filter((c) => c.category_id === cat.id);
          const isOpen = openCat[cat.id] ?? !!query;
          const isEditing = editing === `cat-${cat.id}`;
          if (!isVisible(cat.id)) return null;
          const ci = siblingIndex(categories, cat.id);
          return (
            <div key={cat.id}>
              <Row
                depth={0}
                expanded={isOpen}
                onToggle={() => setOpenCat({ ...openCat, [cat.id]: !isOpen })}
                onDoubleClick={() => setEditing(`cat-${cat.id}`)}
                highlighted={isMatch(cat.id, cat.name)}
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
                      <ReorderButtons
                        disabled={pending}
                        onUp={() => !ci.isFirst && run(() => reorderCategoryAction(cat.id, "up"))}
                        onDown={() => !ci.isLast && run(() => reorderCategoryAction(cat.id, "down"))}
                      />
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
                    placeholder="법인 이름"
                    onSave={(name) => {
                      if (name) run(() => createCompanyAction({ category_id: cat.id, name }));
                      setAdding(null);
                    }}
                    onCancel={() => setAdding(null)}
                  />
                </div>
              )}

              {isOpen && catCompanies.map((co) => {
                if (!isVisible(co.id)) return null;
                const coWorksites = worksites.filter((w) => w.company_id === co.id);
                const coDepartments = departments.filter((d) => d.company_id === co.id);
                const coOpen = openCo[co.id] ?? !!query;
                const coEditing = editing === `co-${co.id}`;
                const cI = siblingIndex(catCompanies, co.id);
                const moveOptions = categories
                  .filter((c) => c.id !== cat.id)
                  .map((c) => ({ id: c.id, label: c.name }));
                return (
                  <div key={co.id}>
                    <Row
                      depth={1}
                      expanded={coOpen}
                      onToggle={() => setOpenCo({ ...openCo, [co.id]: !coOpen })}
                      onDoubleClick={() => setEditing(`co-${co.id}`)}
                      highlighted={isMatch(co.id, co.name)}
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
                            <span className="text-[var(--fg-subtle)] text-xs">({co.ceo_name ?? "대표자 미지정"})</span>
                          </span>
                        )
                      }
                      badge={`재직 ${counts.byCompany[co.id] ?? 0}`}
                      actions={
                        !coEditing && (
                          <>
                            <ReorderButtons
                              disabled={pending}
                              onUp={() => !cI.isFirst && run(() => reorderCompanyAction(co.id, "up"))}
                              onDown={() => !cI.isLast && run(() => reorderCompanyAction(co.id, "down"))}
                            />
                            <MoveDropdown
                              label="↗ BU 이동"
                              options={moveOptions}
                              onMove={(newCatId) =>
                                run(() => moveCompanyAction({ id: co.id, new_category_id: newCatId }))
                              }
                            />
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
                          placeholder="사업장 이름"
                          onSave={(name) => {
                            if (name) run(() => createWorksiteAction({ company_id: co.id, name }));
                            setAdding(null);
                          }}
                          onCancel={() => setAdding(null)}
                        />
                      </div>
                    )}

                    {coOpen && coWorksites.map((ws) => {
                      if (!isVisible(ws.id)) return null;
                      const wsDeps = coDepartments.filter((d) => d.worksite_id === ws.id);
                      const wsOpen = openWs[ws.id] ?? !!query;
                      const wsEditing = editing === `ws-${ws.id}`;
                      const wI = siblingIndex(coWorksites, ws.id);
                      const wsMoveOptions = companies
                        .filter((c) => c.id !== co.id)
                        .map((c) => ({ id: c.id, label: c.name }));
                      return (
                        <div key={ws.id}>
                          <Row
                            depth={2}
                            expanded={wsOpen}
                            onToggle={() => setOpenWs({ ...openWs, [ws.id]: !wsOpen })}
                            onDoubleClick={() => setEditing(`ws-${ws.id}`)}
                            highlighted={isMatch(ws.id, ws.name)}
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
                                  <ReorderButtons
                                    disabled={pending}
                                    onUp={() => !wI.isFirst && run(() => reorderWorksiteAction(ws.id, "up"))}
                                    onDown={() => !wI.isLast && run(() => reorderWorksiteAction(ws.id, "down"))}
                                  />
                                  <MoveDropdown
                                    label="↗ 법인 이동"
                                    options={wsMoveOptions}
                                    onMove={(newCoId) =>
                                      run(() => moveWorksiteAction({ id: ws.id, new_company_id: newCoId }))
                                    }
                                  />
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
                                placeholder="부서 이름"
                                onSave={(name) => {
                                  if (name) run(() => createDepartmentAction({ company_id: co.id, worksite_id: ws.id, name }));
                                  setAdding(null);
                                }}
                                onCancel={() => setAdding(null)}
                              />
                            </div>
                          )}
                          {wsOpen && wsDeps.map((d) => {
                            if (!isVisible(d.id)) return null;
                            const isE = editing === `d-${d.id}`;
                            const dI = siblingIndex(wsDeps, d.id);
                            const deptMoveOptions = coWorksites
                              .filter((w) => w.id !== ws.id)
                              .map((w) => ({ id: w.id, label: `${co.name} › ${w.name}` }));
                            return (
                              <Row
                                key={d.id}
                                depth={3}
                                onDoubleClick={() => setEditing(`d-${d.id}`)}
                                highlighted={isMatch(d.id, d.name)}
                                label={
                                  isE ? (
                                    <InlineEdit
                                      defaults={{ name: d.name, kind: d.kind ?? undefined }}
                                      kindEditable
                                      onSave={(v) => {
                                        run(() => updateDepartmentAction({
                                          id: d.id,
                                          name: v.name,
                                          kind: v.kind as "division" | "team" | "part" | undefined,
                                        }));
                                        setEditing(null);
                                      }}
                                      onCancel={() => setEditing(null)}
                                    />
                                  ) : (
                                    <span>
                                      {d.name}
                                      {d.kind && d.kind !== "team" ? (
                                        <span className="text-[var(--fg-subtle)] text-xs ml-1">({d.kind})</span>
                                      ) : null}
                                    </span>
                                  )
                                }
                                badge={`재직 ${counts.byDepartment[d.id] ?? 0}`}
                                actions={
                                  !isE && (
                                    <>
                                      <ReorderButtons
                                        disabled={pending}
                                        onUp={() => !dI.isFirst && run(() => reorderDepartmentAction(d.id, "up"))}
                                        onDown={() => !dI.isLast && run(() => reorderDepartmentAction(d.id, "down"))}
                                      />
                                      <MoveDropdown
                                        label="↗ 사업장 이동"
                                        options={deptMoveOptions}
                                        onMove={(newWsId) =>
                                          run(() => moveDepartmentAction({ id: d.id, new_worksite_id: newWsId }))
                                        }
                                      />
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

                    {/* HQ divisions (no worksite, no parent) */}
                    {coOpen && coDepartments.filter((d) => !d.worksite_id && !d.parent_department_id).map((div) => {
                      if (!isVisible(div.id)) return null;
                      const teams = coDepartments.filter((t) => t.parent_department_id === div.id);
                      const isE = editing === `d-${div.id}`;
                      const divisionsList = coDepartments.filter((d) => !d.worksite_id && !d.parent_department_id);
                      const dI = siblingIndex(divisionsList, div.id);
                      return (
                        <div key={div.id}>
                          <Row
                            depth={2}
                            onDoubleClick={() => setEditing(`d-${div.id}`)}
                            highlighted={isMatch(div.id, div.name)}
                            label={
                              isE ? (
                                <InlineEdit
                                  defaults={{ name: div.name, kind: div.kind ?? "division" }}
                                  kindEditable
                                  onSave={(v) => {
                                    run(() => updateDepartmentAction({
                                      id: div.id,
                                      name: v.name,
                                      kind: v.kind as "division" | "team" | "part" | undefined,
                                    }));
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
                                  <ReorderButtons
                                    disabled={pending}
                                    onUp={() => !dI.isFirst && run(() => reorderDepartmentAction(div.id, "up"))}
                                    onDown={() => !dI.isLast && run(() => reorderDepartmentAction(div.id, "down"))}
                                  />
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
                                onCancel={() => setAdding(null)}
                              />
                            </div>
                          )}
                          {teams.map((t) => {
                            if (!isVisible(t.id)) return null;
                            const tE = editing === `d-${t.id}`;
                            const tI = siblingIndex(teams, t.id);
                            const teamMoveOptions = coDepartments
                              .filter((d) => !d.worksite_id && !d.parent_department_id && d.id !== div.id)
                              .map((d) => ({ id: d.id, label: `${co.name} › ${d.name}` }));
                            return (
                              <Row
                                key={t.id}
                                depth={3}
                                onDoubleClick={() => setEditing(`d-${t.id}`)}
                                highlighted={isMatch(t.id, t.name)}
                                label={
                                  tE ? (
                                    <InlineEdit
                                      defaults={{ name: t.name, kind: t.kind ?? "team" }}
                                      kindEditable
                                      onSave={(v) => {
                                        run(() => updateDepartmentAction({
                                          id: t.id,
                                          name: v.name,
                                          kind: v.kind as "division" | "team" | "part" | undefined,
                                        }));
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
                                      <ReorderButtons
                                        disabled={pending}
                                        onUp={() => !tI.isFirst && run(() => reorderDepartmentAction(t.id, "up"))}
                                        onDown={() => !tI.isLast && run(() => reorderDepartmentAction(t.id, "down"))}
                                      />
                                      <MoveDropdown
                                        label="↗ 부문 이동"
                                        options={teamMoveOptions}
                                        onMove={(newParentId) =>
                                          run(() => moveDepartmentAction({ id: t.id, new_parent_department_id: newParentId }))
                                        }
                                      />
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
    </div>
  );
}

function NewCategoryForm({
  onCreate,
  onCancel,
}: {
  onCreate: (code: string, name: string, is_hq: boolean) => void;
  onCancel: () => void;
}) {
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
      <button className="btn btn-primary !text-xs" onClick={() => onCreate(code, name, isHq)} disabled={!code || !name}>추가</button>
      <button className="btn !text-xs" onClick={onCancel}>취소</button>
    </div>
  );
}

function InlineInput({
  placeholder,
  onSave,
  onCancel,
}: {
  placeholder?: string;
  onSave: (v: string) => void;
  onCancel: () => void;
}) {
  const [v, setV] = useState("");
  return (
    <div className="flex gap-1 items-center">
      <input
        autoFocus
        value={v}
        placeholder={placeholder}
        onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSave(v);
          else if (e.key === "Escape") onCancel();
        }}
        className="rounded-md border border-[var(--border)] px-2 py-1 text-sm w-48"
      />
      <button type="button" onClick={() => onSave(v)} className="btn btn-primary !px-2 !py-1 !text-xs">저장</button>
      <button type="button" onClick={onCancel} className="btn !px-2 !py-1 !text-xs">취소</button>
    </div>
  );
}

function InlineEdit({
  defaults,
  codeLabel,
  kindEditable,
  onSave,
  onCancel,
}: {
  defaults: { code?: string; name: string; kind?: string };
  codeLabel?: string;
  kindEditable?: boolean;
  onSave: (v: { code: string; name: string; kind?: string }) => void;
  onCancel: () => void;
}) {
  const [code, setCode] = useState(defaults.code ?? "");
  const [name, setName] = useState(defaults.name);
  const [kind, setKind] = useState(defaults.kind ?? "team");
  return (
    <span className="flex gap-1 items-center flex-wrap">
      {defaults.code !== undefined && (
        <input
          placeholder={codeLabel ?? "코드"}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="rounded-md border border-[var(--border)] px-2 py-0.5 w-28 text-sm"
        />
      )}
      <input
        autoFocus
        placeholder="이름"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSave({ code, name, kind: kindEditable ? kind : undefined });
          else if (e.key === "Escape") onCancel();
        }}
        className="rounded-md border border-[var(--border)] px-2 py-0.5 w-40 text-sm"
      />
      {kindEditable && (
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value)}
          className="rounded-md border border-[var(--border)] px-1 py-0.5 text-xs"
          title="부서 종류"
        >
          <option value="division">부문</option>
          <option value="team">팀</option>
          <option value="part">파트</option>
        </select>
      )}
      <button
        className="btn btn-primary !py-0.5 !px-2 !text-xs"
        onClick={() => onSave({ code, name, kind: kindEditable ? kind : undefined })}
      >
        저장
      </button>
      <button className="btn !py-0.5 !px-2 !text-xs" onClick={onCancel}>취소</button>
    </span>
  );
}
