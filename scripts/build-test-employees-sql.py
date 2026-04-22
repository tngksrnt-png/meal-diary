"""Generate realistic test employees per company, matching the 조직도 headcount."""
import sys
import io
import os
import random

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

random.seed(42)

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "seed-test-employees.sql")

# 조직도 xlsx headcount (active + historical). We'll produce ~90% active, ~3% 휴직, ~7% 퇴직.
COMPANY_HEADCOUNT = {
    "ReNA HQ": 33,
    "신풍자원": 68,
    "미주자원": 43,
    "서울에코사이클": 62,
    "대영기업순환자원": 74,
    "제이에스자원환경": 11,
    "하이원리싸이클링": 41,
    "알엠오산/광명": 117,
    "알엠화성": 95,
    "에이치투": 27,
    "청송산업개발": 44,
    "가나에너지": 42,
    "청경에너지": 8,
    "리에나": 43,
    "거단산업": 52,
    "경인에코텍": 22,
    "에코에너지코리아": 21,
    "신진유화": 5,
    "우리운수": 2,
    "용인실업": 109,
}

# HQ is 판관/관리-heavy; production companies are 제조/생산-heavy.
HQ_COMPANIES = {"ReNA HQ"}

FAMILIES = [
    "김", "이", "박", "최", "정", "강", "조", "윤", "장", "임",
    "한", "오", "서", "신", "권", "황", "안", "송", "전", "홍",
]
GIVEN_M = [
    "민수", "준호", "태영", "상훈", "철수", "영민", "현우", "성민", "지훈",
    "도현", "재영", "동훈", "진우", "승현", "석준", "원석", "경호", "정호",
    "찬우", "병준", "기석", "종현", "상민", "대현", "기태", "우진", "영재",
    "형남", "건우", "승민", "지원", "현수",
]
GIVEN_F = [
    "미영", "수진", "은정", "지영", "혜진", "유진", "예림", "서연", "소영",
    "지혜", "하늘", "민지", "정연", "수현", "보람", "지은", "선영", "가영",
    "아름", "유빈", "혜원", "은지", "예원", "수빈", "나래",
]
FOREIGN_M = ["응오", "칸", "루안", "팜", "완", "띠엔", "타이", "샤", "빈", "아카시"]
FOREIGN_F = ["린", "티", "응옥", "마이", "홍", "사미", "팟", "닌", "트엉"]
FOREIGN_COUNTRIES = ["베트남", "우즈베키스탄", "네팔", "필리핀", "캄보디아", "태국", "미얀마"]

RANKS_MGMT = [
    ("대표이사", 0.01), ("전무", 0.02), ("상무", 0.03), ("이사", 0.05),
    ("부장", 0.07), ("차장", 0.1), ("과장", 0.12), ("대리", 0.15),
    ("주임", 0.05), ("사원", 0.40),
]
RANKS_PROD = [
    ("대표이사", 0.005), ("전무", 0.005), ("상무", 0.01), ("이사", 0.02),
    ("부장", 0.02), ("차장", 0.03), ("과장", 0.04), ("대리", 0.06),
    ("주임", 0.03), ("사원", 0.80),
]
EMP_TYPES_HQ = [("정규직", 0.92), ("임원", 0.05), ("계약직", 0.03)]
EMP_TYPES_PROD = [("정규직", 0.35), ("계약직", 0.62), ("임원", 0.02), ("고문", 0.01)]
HIRE_CHANNELS = [("직채용", 0.85), ("추천", 0.05), ("헤드헌터", 0.03), ("채용사이트", 0.02), ("기타", 0.05)]
EDUCATIONS = [("고졸", 0.35), ("전문학사", 0.15), ("학사", 0.35), ("석사", 0.05), ("박사", 0.01), ("미기재", 0.09)]
STATUS_DIST = [("재직", 0.90), ("휴직", 0.03), ("퇴직", 0.07)]
TERM_REASONS = [("자발", 0.8), ("권고사직", 0.1), ("계약만료", 0.07), ("기타", 0.03)]
GENDER_MGMT = [("남", 0.68), ("여", 0.32)]
GENDER_PROD = [("남", 0.78), ("여", 0.22)]


def weighted(choices):
    r = random.random()
    acc = 0.0
    for v, w in choices:
        acc += w
        if r <= acc:
            return v
    return choices[-1][0]


SALARY_BY_RANK = {
    "대표이사": (80_000_000, 150_000_000),
    "전무": (90_000_000, 140_000_000),
    "상무": (75_000_000, 110_000_000),
    "이사": (65_000_000, 95_000_000),
    "부장": (55_000_000, 80_000_000),
    "차장": (45_000_000, 62_000_000),
    "과장": (38_000_000, 55_000_000),
    "대리": (33_000_000, 45_000_000),
    "주임": (28_000_000, 35_000_000),
    "사원": (24_000_000, 32_000_000),
}


def esc(v):
    if v is None:
        return "NULL"
    if isinstance(v, (int, float)):
        return str(v)
    s = str(v).replace("'", "''")
    return f"'{s}'"


def make_name(is_foreign, is_female):
    if is_foreign:
        given = random.choice(FOREIGN_F if is_female else FOREIGN_M)
        return given
    fam = random.choice(FAMILIES)
    given = random.choice(GIVEN_F if is_female else GIVEN_M)
    return fam + given


def random_date(start_year, end_year):
    year = random.randint(start_year, end_year)
    month = random.randint(1, 12)
    day = random.randint(1, 28)
    return f"{year:04d}-{month:02d}-{day:02d}"


def gen_employee_no(year, seq):
    return f"T{str(year)[-2:]}{seq:05d}"


lines = []
lines.append("-- Test employees (seeded with random realistic data)")
lines.append("-- WARNING: drops existing rows in public.employees first")
lines.append("DELETE FROM public.employees;")
lines.append("")

global_seq = 1

for company, target in COMPANY_HEADCOUNT.items():
    is_hq = company in HQ_COMPANIES
    rank_dist = RANKS_MGMT if is_hq else RANKS_PROD
    emp_dist = EMP_TYPES_HQ if is_hq else EMP_TYPES_PROD
    gender_dist = GENDER_MGMT if is_hq else GENDER_PROD

    # Foreign ratio higher in production-heavy Sorting/Shredding companies
    foreign_ratio = 0.05 if is_hq else 0.35

    lines.append(f"-- {company}: {target}명")
    lines.append(
        "WITH target_co AS (SELECT id FROM public.companies WHERE name = "
        f"{esc(company)}),"
    )
    lines.append(
        "     target_ws AS (SELECT id, name FROM public.worksites "
        "WHERE company_id = (SELECT id FROM target_co) ORDER BY order_idx),"
    )
    lines.append(
        "     target_dep AS (SELECT id, name, worksite_id FROM public.departments "
        "WHERE company_id = (SELECT id FROM target_co) AND parent_department_id IS NULL ORDER BY order_idx)"
    )
    lines.append("INSERT INTO public.employees (employee_no, name, company_id, worksite_id, department_id, rank_code, birth_date, hire_date, termination_date, gender, employment_type_code, nationality_type, nationality, accounting_type_code, job_family_code, annual_salary, hire_channel_code, education_code, career_before_join_years, total_career_years, status_code, termination_reason_code) VALUES")

    row_values = []

    for i in range(target):
        # Derive rank, type, etc.
        rank = weighted(rank_dist)
        emp_type = weighted(emp_dist)
        # 대표/전무/상무/이사 is always 임원
        if rank in ("대표이사", "전무", "상무", "이사"):
            emp_type = "임원"
        gender = weighted(gender_dist)
        is_foreign = (not is_hq) and rank == "사원" and random.random() < foreign_ratio
        if is_foreign:
            nationality_type = "외국인"
            nationality = random.choice(FOREIGN_COUNTRIES)
        else:
            nationality_type = "내국인"
            nationality = "대한민국"
        name = make_name(is_foreign, gender == "여")

        hire_year = random.choices(
            population=list(range(2014, 2027)),
            weights=[1, 1, 2, 2, 3, 4, 5, 6, 7, 9, 10, 12, 8],
            k=1,
        )[0]
        hire_date = random_date(hire_year, hire_year)
        # Birth date: age 22-62 at hire
        age_at_hire = random.randint(22, 62)
        birth_year = hire_year - age_at_hire
        birth_date = random_date(birth_year, birth_year)

        status = weighted(STATUS_DIST)
        termination_date = None
        term_reason = None
        if status == "퇴직":
            term_year = random.randint(hire_year, 2026)
            termination_date = random_date(term_year, term_year)
            term_reason = weighted(TERM_REASONS)

        accounting = "판관" if is_hq else ("제조" if rank == "사원" else random.choice(["제조", "판관"]))
        job_family = "관리" if is_hq else ("생산" if rank == "사원" else random.choice(["관리", "생산"]))

        low, high = SALARY_BY_RANK.get(rank, (24_000_000, 35_000_000))
        salary = random.randint(low // 10, high // 10) * 10  # multiples of 10

        hire_channel = weighted(HIRE_CHANNELS)
        education = weighted(EDUCATIONS)
        career_before = round(random.uniform(0, age_at_hire - 22), 1) if rank != "사원" else 0
        if birth_year < 1970:
            career_before = round(random.uniform(0, 10), 1)
        career_total = round(career_before + max(0, 2026 - hire_year), 1)

        emp_no = gen_employee_no(hire_year, global_seq)
        global_seq += 1

        # worksite assignment: random from this company's worksites (HQ has none)
        ws_expr = "(SELECT id FROM target_ws ORDER BY random() LIMIT 1)"
        dep_expr = (
            "(SELECT id FROM target_dep ORDER BY random() LIMIT 1)"
            if is_hq
            else "(SELECT id FROM target_dep WHERE worksite_id = (SELECT id FROM target_ws ORDER BY random() LIMIT 1) ORDER BY random() LIMIT 1)"
        )
        # For HQ, worksite_id = NULL
        ws_sql = "NULL" if is_hq else ws_expr

        row_values.append(
            "(" + ", ".join([
                esc(emp_no), esc(name), "(SELECT id FROM target_co)",
                ws_sql,
                dep_expr,
                esc(rank), esc(birth_date), esc(hire_date),
                esc(termination_date), esc(gender), esc(emp_type),
                esc(nationality_type), esc(nationality),
                esc(accounting), esc(job_family),
                str(salary),
                esc(hire_channel), esc(education),
                str(career_before), str(career_total),
                esc(status), esc(term_reason),
            ]) + ")"
        )

    # Chunk in batches of 100 per INSERT statement for readability (and single query size limit)
    lines.append(",\n".join(row_values) + ";")
    lines.append("")

with open(OUT, "w", encoding="utf-8") as f:
    f.write("\n".join(lines))

total = sum(COMPANY_HEADCOUNT.values())
print(f"Generated {total} test employees across {len(COMPANY_HEADCOUNT)} companies.")
print(f"Output: {OUT}")
