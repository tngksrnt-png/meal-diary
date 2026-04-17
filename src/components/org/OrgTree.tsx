"use client";
import Link from "next/link";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";

export type OrgCategoryNode = {
  id: string;
  name: string;
  code: string;
  is_hq: boolean;
  headcount: number;
  companies: OrgCompanyNode[];
};

export type OrgCompanyNode = {
  id: string;
  name: string;
  ceo_name: string | null;
  headcount: number;
  worksites: OrgWorksiteNode[];
  hqDivisions: OrgDivisionNode[];
};

export type OrgWorksiteNode = {
  id: string;
  name: string;
  headcount: number;
  departments: { id: string; name: string; headcount: number }[];
};

export type OrgDivisionNode = {
  id: string;
  name: string;
  headcount: number;
  teams: { id: string; name: string; headcount: number }[];
};

function Chevron({ open }: { open: boolean }) {
  return (
    <motion.span
      className="inline-block text-[var(--fg-subtle)]"
      animate={{ rotate: open ? 90 : 0 }}
      transition={{ duration: 0.2 }}
    >
      ▶
    </motion.span>
  );
}

function Badge({ n }: { n: number }) {
  return (
    <span className="inline-flex items-center rounded-full bg-[var(--muted)] px-2 py-0.5 text-[11px] tabular-nums text-[var(--fg-muted)]">
      {n}명
    </span>
  );
}

function Row({
  depth,
  onClick,
  open,
  label,
  sub,
  right,
  leafLink,
}: {
  depth: number;
  onClick?: () => void;
  open?: boolean;
  label: string;
  sub?: string;
  right?: React.ReactNode;
  leafLink?: string;
}) {
  const content = (
    <div
      className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-[var(--muted)] cursor-pointer"
      style={{ paddingLeft: `${depth * 16 + 8}px` }}
      onClick={onClick}
    >
      {onClick ? <Chevron open={!!open} /> : <span className="w-3" />}
      <span className="text-sm text-[var(--fg)] truncate">{label}</span>
      {sub ? <span className="text-xs text-[var(--fg-subtle)] truncate">· {sub}</span> : null}
      <span className="ml-auto">{right}</span>
    </div>
  );
  if (leafLink) {
    return <Link href={leafLink}>{content}</Link>;
  }
  return content;
}

function CompanyBranch({ node, depth }: { node: OrgCompanyNode; depth: number }) {
  const [open, setOpen] = useState(false);
  const hasChildren = node.worksites.length > 0 || node.hqDivisions.length > 0;
  return (
    <div>
      <Row
        depth={depth}
        onClick={hasChildren ? () => setOpen((v) => !v) : undefined}
        open={open}
        label={node.name}
        sub={node.ceo_name ?? undefined}
        right={
          <div className="flex items-center gap-2">
            <Badge n={node.headcount} />
            <Link
              href={`/companies/${node.id}`}
              className="text-xs text-[var(--accent)] hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              대시보드 →
            </Link>
          </div>
        }
      />
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            {node.hqDivisions.map((div) => (
              <DivisionBranch key={div.id} node={div} depth={depth + 1} />
            ))}
            {node.worksites.map((ws) => (
              <WorksiteBranch key={ws.id} node={ws} depth={depth + 1} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function WorksiteBranch({ node, depth }: { node: OrgWorksiteNode; depth: number }) {
  const [open, setOpen] = useState(false);
  const hasChildren = node.departments.length > 0;
  return (
    <div>
      <Row
        depth={depth}
        onClick={hasChildren ? () => setOpen((v) => !v) : undefined}
        open={open}
        label={node.name}
        right={<Badge n={node.headcount} />}
      />
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            {node.departments.map((d) => (
              <Row key={d.id} depth={depth + 1} label={d.name} right={<Badge n={d.headcount} />} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DivisionBranch({ node, depth }: { node: OrgDivisionNode; depth: number }) {
  const [open, setOpen] = useState(false);
  const hasChildren = node.teams.length > 0;
  return (
    <div>
      <Row
        depth={depth}
        onClick={hasChildren ? () => setOpen((v) => !v) : undefined}
        open={open}
        label={node.name}
        sub="부문"
        right={<Badge n={node.headcount} />}
      />
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            {node.teams.map((t) => (
              <Row key={t.id} depth={depth + 1} label={t.name} right={<Badge n={t.headcount} />} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CategoryBranch({ node }: { node: OrgCategoryNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border-b border-[var(--border)] last:border-0">
      <Row
        depth={0}
        onClick={() => setOpen((v) => !v)}
        open={open}
        label={node.name}
        sub={node.is_hq ? "HQ" : "BU"}
        right={<Badge n={node.headcount} />}
      />
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            {node.companies.map((co) => (
              <CompanyBranch key={co.id} node={co} depth={1} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function OrgTree({ roots }: { roots: OrgCategoryNode[] }) {
  return (
    <div className="card divide-y divide-[var(--border)]">
      {roots.map((r) => (
        <CategoryBranch key={r.id} node={r} />
      ))}
    </div>
  );
}
