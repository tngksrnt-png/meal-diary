"""Generate SQL from seed-org.json for Supabase."""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "seed-org.json")
OUT = os.path.join(HERE, "seed-org.sql")


def esc(v):
    if v is None:
        return "NULL"
    s = str(v).replace("'", "''")
    return f"'{s}'"


with open(SRC, "r", encoding="utf-8") as f:
    seed = json.load(f)

lines = []

# 1. Categories
lines.append("-- Categories")
for c in seed["categories"]:
    lines.append(
        f"INSERT INTO public.categories (code, name, order_idx, is_hq) "
        f"VALUES ({esc(c['code'])}, {esc(c['name'])}, {c['order_idx']}, {str(c['is_hq']).lower()}) "
        f"ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, order_idx = EXCLUDED.order_idx, is_hq = EXCLUDED.is_hq;"
    )

# 2. Companies
lines.append("")
lines.append("-- Companies")
for c in seed["companies"]:
    lines.append(
        f"INSERT INTO public.companies (category_id, name, ceo_name, order_idx) "
        f"SELECT id, {esc(c['name'])}, {esc(c['ceo_name'])}, {c['order_idx']} "
        f"FROM public.categories WHERE code = {esc(c['cat_code'])} "
        f"ON CONFLICT DO NOTHING;"
    )

# 3. Worksites
lines.append("")
lines.append("-- Worksites")
for w in seed["worksites"]:
    lines.append(
        f"INSERT INTO public.worksites (company_id, name, order_idx) "
        f"SELECT id, {esc(w['name'])}, {w['order_idx']} "
        f"FROM public.companies WHERE name = {esc(w['company'])};"
    )

# 4. Departments - two passes: divisions first, then teams with parent
lines.append("")
lines.append("-- Departments (pass 1: divisions + teams without parent)")
for d in seed["departments"]:
    if d.get("parent"):
        continue
    # worksite is nullable
    ws_sql = f"(SELECT id FROM public.worksites WHERE name = {esc(d['worksite'])} AND company_id = (SELECT id FROM public.companies WHERE name = {esc(d['company'])}))" if d["worksite"] else "NULL"
    lines.append(
        f"INSERT INTO public.departments (company_id, worksite_id, name, kind, order_idx) "
        f"SELECT id, {ws_sql}, {esc(d['name'])}, {esc(d['kind'])}, {d['order_idx']} "
        f"FROM public.companies WHERE name = {esc(d['company'])};"
    )

lines.append("")
lines.append("-- Departments (pass 2: teams with parent)")
for d in seed["departments"]:
    if not d.get("parent"):
        continue
    parent_sql = (
        f"(SELECT id FROM public.departments WHERE name = {esc(d['parent'])} "
        f"AND company_id = (SELECT id FROM public.companies WHERE name = {esc(d['company'])}) "
        f"AND kind = 'division' LIMIT 1)"
    )
    lines.append(
        f"INSERT INTO public.departments (company_id, worksite_id, parent_department_id, name, kind, order_idx) "
        f"SELECT id, NULL, {parent_sql}, {esc(d['name'])}, {esc(d['kind'])}, {d['order_idx']} "
        f"FROM public.companies WHERE name = {esc(d['company'])};"
    )

# 5. Lookups (설정 시트 기본값)
lookups = {
    "rank": ["대표이사", "전무", "상무", "이사", "부장", "차장", "과장", "대리", "주임", "사원"],
    "employment_type": ["정규직", "임원", "계약직", "고문"],
    "hire_channel": ["직채용", "헤드헌터", "채용사이트", "추천", "기타"],
    "education": ["고졸", "전문학사", "학사", "석사", "박사", "미기재"],
    "employee_status": ["재직", "휴직", "퇴직"],
    "termination_reason": ["자발", "권고사직", "구조조정", "계약만료", "기타"],
    "accounting_type": ["제조", "판관"],
    "job_family": ["관리", "생산"],
}
lines.append("")
lines.append("-- Lookups")
for ltype, labels in lookups.items():
    for idx, label in enumerate(labels):
        lines.append(
            f"INSERT INTO public.lookups (type, code, label, order_idx) "
            f"VALUES ({esc(ltype)}, {esc(label)}, {esc(label)}, {idx}) "
            f"ON CONFLICT (type, code) DO NOTHING;"
        )

# 6. Initial whitelist email
lines.append("")
lines.append("-- Initial admin whitelist")
lines.append(
    "INSERT INTO public.profiles (email, role) VALUES ('tngksrnt@gmail.com', 'group_admin') "
    "ON CONFLICT (email) DO NOTHING;"
)

with open(OUT, "w", encoding="utf-8") as f:
    f.write("\n".join(lines))

print(f"SQL lines: {len(lines)}")
print(f"Written to {OUT}")
