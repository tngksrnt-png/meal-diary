"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

export type OrgCounts = { active: number; onLeave: number; retired: number };

export type OrgCategoryNode = {
  id: string;
  name: string;
  code: string;
  is_hq: boolean;
  counts: OrgCounts;
  companies: OrgCompanyNode[];
};

export type OrgCompanyNode = {
  id: string;
  name: string;
  ceo_name: string | null;
  counts: OrgCounts;
  worksites: OrgWorksiteNode[];
  hqDivisions: OrgDivisionNode[];
};

export type OrgWorksiteNode = {
  id: string;
  name: string;
  counts: OrgCounts;
  departments: OrgDeptNode[];
};

export type OrgDivisionNode = {
  id: string;
  name: string;
  counts: OrgCounts;
  teams: OrgDeptNode[];
};

export type OrgDeptNode = { id: string; name: string; counts: OrgCounts };

type Mode = "manual" | "collapse" | "categories" | "companies" | "all";

function CountBadges({ counts, dim = false }: { counts: OrgCounts; dim?: boolean }) {
  const baseCls = dim ? "opacity-50" : "";
  return (
    <div className={`flex items-center gap-1 ${baseCls}`}>
      <span
        className="inline-flex items-center rounded-full bg-[var(--brand-soft)] px-2 py-0.5 text-[11px] tabular-nums text-[var(--brand)] font-medium"
        title="재직"
      >
        재 {counts.active}
      </span>
      {counts.onLeave > 0 && (
        <span
          className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] tabular-nums text-[var(--warn)]"
          title="휴직"
        >
          휴 {counts.onLeave}
        </span>
      )}
      {counts.retired > 0 && (
        <span
          className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-[11px] tabular-nums text-[var(--danger)]"
          title="퇴직"
        >
          퇴 {counts.retired}
        </span>
      )}
    </div>
  );
}

function Chevron({ open, hidden }: { open: boolean; hidden?: boolean }) {
  if (hidden) return <span className="w-3 inline-block" />;
  return (
    <motion.span
      className="inline-block text-[var(--fg-subtle)] text-[10px] w-3"
      animate={{ rotate: open ? 90 : 0 }}
      transition={{ duration: 0.18 }}
    >
      ▶
    </motion.span>
  );
}

type RowKind = "category" | "company" | "worksite" | "division" | "leaf";

function rowStyle(kind: RowKind): string {
  switch (kind) {
    case "category":
      return "font-semibold text-[var(--fg)] bg-[var(--muted)]/60";
    case "company":
      return "font-medium text-[var(--fg)]";
    case "worksite":
    case "division":
      return "text-[var(--fg)]";
    case "leaf":
      return "text-[var(--fg-muted)] text-[13px]";
  }
}

function Row({
  depth,
  open,
  onToggle,
  hasChildren,
  kind,
  label,
  sub,
  counts,
  href,
  empty,
}: {
  depth: number;
  open: boolean;
  onToggle: () => void;
  hasChildren: boolean;
  kind: RowKind;
  label: string;
  sub?: string;
  counts: OrgCounts;
  href?: string;
  empty?: boolean;
}) {
  const inner = (
    <div
      className={`flex items-center gap-2 py-1.5 px-2 hover:bg-[var(--muted)] ${rowStyle(kind)} ${empty ? "opacity-50" : ""}`}
      style={{ paddingLeft: `${depth * 16 + 8}px` }}
    >
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (hasChildren) onToggle();
        }}
        className={`shrink-0 w-4 h-4 inline-flex items-center justify-center rounded ${
          hasChildren ? "hover:bg-[var(--border)] cursor-pointer" : "cursor-default"
        }`}
        aria-label={open ? "접기" : "펼치기"}
      >
        <Chevron open={open} hidden={!hasChildren} />
      </button>
      <span className="text-sm truncate">{label}</span>
      {sub ? <span className="text-xs text-[var(--fg-subtle)] truncate">· {sub}</span> : null}
      <span className="ml-auto flex items-center gap-2 shrink-0">
        <CountBadges counts={counts} dim={empty} />
        {href && (
          <span className="text-[11px] text-[var(--accent)] hidden md:inline">→</span>
        )}
      </span>
    </div>
  );
  if (href) {
    return (
      <Link href={href} className="block">
        {inner}
      </Link>
    );
  }
  return inner;
}

function isEmpty(counts: OrgCounts) {
  return counts.active === 0 && counts.onLeave === 0;
}

function nodeMatches(name: string, q: string) {
  if (!q) return true;
  return name.toLowerCase().includes(q.toLowerCase());
}

export function OrgTree({ roots }: { roots: OrgCategoryNode[] }) {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<Mode>("categories");
  const [openSet, setOpenSet] = useState<Set<string>>(
    () => new Set(roots.map((r) => r.id)),
  );
  const [hideEmpty, setHideEmpty] = useState(false);

  // Effective open computation: search overrides; else mode + manual openSet
  const effectiveOpen = useMemo(() => {
    const set = new Set<string>();
    if (query) {
      // Auto-expand any ancestor whose subtree contains a name match
      for (const cat of roots) {
        let catHas = nodeMatches(cat.name, query);
        for (const co of cat.companies) {
          let coHas = nodeMatches(co.name, query);
          for (const w of co.worksites) {
            if (nodeMatches(w.name, query)) coHas = true;
            for (const d of w.departments) {
              if (nodeMatches(d.name, query)) {
                coHas = true;
                set.add(w.id);
              }
            }
          }
          for (const div of co.hqDivisions) {
            if (nodeMatches(div.name, query)) coHas = true;
            for (const t of div.teams) {
              if (nodeMatches(t.name, query)) {
                coHas = true;
                set.add(div.id);
              }
            }
          }
          if (coHas) {
            set.add(cat.id);
            set.add(co.id);
            catHas = true;
          }
        }
        if (catHas) set.add(cat.id);
      }
      return set;
    }
    if (mode === "manual") return openSet;
    if (mode === "collapse") return set;
    if (mode === "categories") {
      roots.forEach((r) => set.add(r.id));
      return set;
    }
    if (mode === "companies") {
      roots.forEach((r) => {
        set.add(r.id);
        r.companies.forEach((c) => set.add(c.id));
      });
      return set;
    }
    // all
    roots.forEach((r) => {
      set.add(r.id);
      r.companies.forEach((c) => {
        set.add(c.id);
        c.worksites.forEach((w) => set.add(w.id));
        c.hqDivisions.forEach((d) => set.add(d.id));
      });
    });
    return set;
  }, [query, mode, openSet, roots]);

  function toggle(id: string) {
    // Switch to manual mode and toggle the node
    setMode("manual");
    setOpenSet((prev) => {
      // Seed from current effective set first time we go manual
      const base = new Set(effectiveOpen);
      if (base.has(id)) base.delete(id);
      else base.add(id);
      // Use prev to satisfy React but result is base
      void prev;
      return base;
    });
  }

  // Filter empty if hideEmpty
  function visibleCompanies(co: OrgCompanyNode[]) {
    return hideEmpty ? co.filter((c) => !isEmpty(c.counts)) : co;
  }
  function visibleWorksites(ws: OrgWorksiteNode[]) {
    return hideEmpty ? ws.filter((w) => !isEmpty(w.counts)) : ws;
  }
  function visibleDivisions(divs: OrgDivisionNode[]) {
    return hideEmpty ? divs.filter((d) => !isEmpty(d.counts)) : divs;
  }
  function visibleLeaves(leaves: OrgDeptNode[]) {
    return hideEmpty ? leaves.filter((l) => !isEmpty(l.counts)) : leaves;
  }

  // Apply query filter at render: hide branches whose subtree has no match
  function hasMatchInSubtree(node: { name: string }, descendantNames: string[]): boolean {
    if (!query) return true;
    if (nodeMatches(node.name, query)) return true;
    return descendantNames.some((n) => nodeMatches(n, query));
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Controls */}
      <div className="card p-3 flex flex-col md:flex-row gap-2 md:items-center">
        <div className="relative flex-1">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="법인·사업장·부서 이름 검색"
            className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm pr-8"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--fg-subtle)] hover:text-[var(--fg)] text-sm"
              aria-label="검색 초기화"
            >
              ✕
            </button>
          )}
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[11px] text-[var(--fg-muted)] mr-1">펼침:</span>
          {(
            [
              { key: "collapse", label: "모두 접기" },
              { key: "categories", label: "BU" },
              { key: "companies", label: "법인" },
              { key: "all", label: "모두" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setMode(opt.key)}
              className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${
                mode === opt.key && !query
                  ? "bg-[var(--dark)] text-white border-[var(--dark)]"
                  : "bg-[var(--surface)] border-[var(--border)] hover:bg-[var(--muted)]"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-1.5 text-xs text-[var(--fg-muted)] cursor-pointer select-none">
          <input
            type="checkbox"
            checked={hideEmpty}
            onChange={(e) => setHideEmpty(e.target.checked)}
            className="rounded border-[var(--border)]"
          />
          빈 조직 숨김
        </label>
      </div>

      <div className="card divide-y divide-[var(--border)] overflow-hidden">
        {roots.map((cat) => {
          const catCompanies = visibleCompanies(cat.companies);
          const descendantNames: string[] = [];
          cat.companies.forEach((co) => {
            descendantNames.push(co.name);
            co.worksites.forEach((w) => {
              descendantNames.push(w.name);
              w.departments.forEach((d) => descendantNames.push(d.name));
            });
            co.hqDivisions.forEach((d) => {
              descendantNames.push(d.name);
              d.teams.forEach((t) => descendantNames.push(t.name));
            });
          });
          if (!hasMatchInSubtree(cat, descendantNames)) return null;
          const catOpen = effectiveOpen.has(cat.id);
          return (
            <div key={cat.id}>
              <Row
                depth={0}
                open={catOpen}
                onToggle={() => toggle(cat.id)}
                hasChildren={catCompanies.length > 0}
                kind="category"
                label={cat.name}
                sub={cat.is_hq ? "HQ" : "BU"}
                counts={cat.counts}
                empty={isEmpty(cat.counts)}
              />
              <AnimatePresence initial={false}>
                {catOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.18 }}
                  >
                    {catCompanies.map((co) => {
                      const coDesc: string[] = [];
                      co.worksites.forEach((w) => {
                        coDesc.push(w.name);
                        w.departments.forEach((d) => coDesc.push(d.name));
                      });
                      co.hqDivisions.forEach((d) => {
                        coDesc.push(d.name);
                        d.teams.forEach((t) => coDesc.push(t.name));
                      });
                      if (!hasMatchInSubtree(co, coDesc)) return null;
                      const coOpen = effectiveOpen.has(co.id);
                      const coWorksites = visibleWorksites(co.worksites);
                      const coDivisions = visibleDivisions(co.hqDivisions);
                      const hasChildren = coWorksites.length > 0 || coDivisions.length > 0;
                      return (
                        <div key={co.id}>
                          <Row
                            depth={1}
                            open={coOpen}
                            onToggle={() => toggle(co.id)}
                            hasChildren={hasChildren}
                            kind="company"
                            label={co.name}
                            sub={co.ceo_name ?? undefined}
                            counts={co.counts}
                            href={`/?company=${co.id}`}
                            empty={isEmpty(co.counts)}
                          />
                          <AnimatePresence initial={false}>
                            {coOpen && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.18 }}
                              >
                                {coDivisions.map((div) => {
                                  const divTeams = visibleLeaves(div.teams);
                                  if (!hasMatchInSubtree(div, divTeams.map((t) => t.name))) return null;
                                  const divOpen = effectiveOpen.has(div.id);
                                  return (
                                    <div key={div.id}>
                                      <Row
                                        depth={2}
                                        open={divOpen}
                                        onToggle={() => toggle(div.id)}
                                        hasChildren={divTeams.length > 0}
                                        kind="division"
                                        label={div.name}
                                        sub="부문"
                                        counts={div.counts}
                                        empty={isEmpty(div.counts)}
                                      />
                                      <AnimatePresence initial={false}>
                                        {divOpen && (
                                          <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.18 }}
                                          >
                                            {divTeams.map((t) => {
                                              if (!hasMatchInSubtree(t, [])) return null;
                                              return (
                                                <Row
                                                  key={t.id}
                                                  depth={3}
                                                  open={false}
                                                  onToggle={() => {}}
                                                  hasChildren={false}
                                                  kind="leaf"
                                                  label={t.name}
                                                  counts={t.counts}
                                                  empty={isEmpty(t.counts)}
                                                />
                                              );
                                            })}
                                          </motion.div>
                                        )}
                                      </AnimatePresence>
                                    </div>
                                  );
                                })}
                                {coWorksites.map((w) => {
                                  const wDepts = visibleLeaves(w.departments);
                                  if (!hasMatchInSubtree(w, wDepts.map((d) => d.name))) return null;
                                  const wOpen = effectiveOpen.has(w.id);
                                  return (
                                    <div key={w.id}>
                                      <Row
                                        depth={2}
                                        open={wOpen}
                                        onToggle={() => toggle(w.id)}
                                        hasChildren={wDepts.length > 0}
                                        kind="worksite"
                                        label={w.name}
                                        counts={w.counts}
                                        empty={isEmpty(w.counts)}
                                      />
                                      <AnimatePresence initial={false}>
                                        {wOpen && (
                                          <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.18 }}
                                          >
                                            {wDepts.map((d) => {
                                              if (!hasMatchInSubtree(d, [])) return null;
                                              return (
                                                <Row
                                                  key={d.id}
                                                  depth={3}
                                                  open={false}
                                                  onToggle={() => {}}
                                                  hasChildren={false}
                                                  kind="leaf"
                                                  label={d.name}
                                                  counts={d.counts}
                                                  empty={isEmpty(d.counts)}
                                                />
                                              );
                                            })}
                                          </motion.div>
                                        )}
                                      </AnimatePresence>
                                    </div>
                                  );
                                })}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
