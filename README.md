# ReNA Group HR Dashboard

ReNA 그룹사(919명, 6개 카테고리, 17개 법인) 인사 데이터를 그룹 HR이 통합 조회·분석하는 웹 대시보드.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS v4
- Supabase (Auth, Database)
- Motion (Framer Motion)
- Zod (validation)
- recharts (차트)
- xlsx (Excel import)

## Features

- [x] Google 로그인 + 이메일 화이트리스트 (그룹 HR만)
- [x] Excel 업로드 (재직자/퇴직자) → 직원 데이터 업서트 + 이력
- [x] 조직 구조(BU/법인/사업장/부서) CRUD (`/admin/org`)
- [x] 드롭다운 소스(직급/고용형태/채용경로/…) CRUD (`/admin/settings`)
- [x] 화이트리스트 이메일 CRUD (`/admin/users`)
- [x] 그룹 전체 대시보드 (카테고리별·법인별 headcount)
- [x] 조직도 트리 뷰 (카테고리 → 법인 → 사업장 → 부서)
- [x] 법인 HR 대시보드 — 재직자 탭 (부서/직급/고용형태/경력/직군×회계/내외국인)
- [ ] 법인 HR 대시보드 — 퇴직자/사업장별/연봉/채용 탭 (P2)
- [ ] 직원 리스트 + 개인 상세 CRUD + 경력사항 (P2)

자세한 product contract: [`docs/product-contract.md`](docs/product-contract.md)

## Getting Started

```bash
npm install
cp .env.example .env.local  # Supabase URL, Anon Key 입력
npm run dev -- --host
```

## Project Structure

```
src/
├── app/
│   ├── (dashboard)/                    # requireAdmin 레이아웃
│   │   ├── page.tsx                    # / 그룹 대시보드
│   │   ├── org/                        # /org 조직도 트리
│   │   ├── companies/                  # /companies 목록
│   │   │   └── [id]/                   # /companies/:id 법인 HR (탭 기반)
│   │   └── admin/
│   │       ├── import/                 # Excel 업로드 + 이력
│   │       ├── org/                    # BU/법인/사업장/부서 CRUD
│   │       ├── settings/               # 드롭다운 소스 CRUD
│   │       └── users/                  # 화이트리스트 CRUD
│   ├── auth/
│   │   ├── callback/                   # Supabase OAuth 교환
│   │   └── logout/                     # POST signOut
│   ├── login/                          # Google 로그인
│   └── no-access/                      # 미허용 계정 차단
├── components/
│   ├── kpi/                            # KpiCard/KpiGrid
│   ├── charts/                         # BarList, DonutChart (recharts)
│   ├── company/                        # CompanyTabs, WorksiteFilter
│   ├── nav/                            # SideNav
│   ├── org/                            # OrgTree
│   └── ui/                             # SectionHeader 등
├── features/
│   ├── group/queries.ts
│   └── company/queries.ts
├── actions/                            # Server Actions
│   ├── import.ts                       # Excel → employees 업서트
│   ├── org.ts                          # 조직 CRUD
│   ├── lookups.ts                      # 드롭다운 CRUD
│   └── users.ts                        # 화이트리스트 CRUD
├── lib/
│   ├── supabase/{client,server,middleware,admin}.ts
│   ├── auth.ts                         # getSession/requireAdmin
│   ├── excel-import.ts                 # xlsx 파서
│   └── motionPresets.ts
├── utils/
│   ├── aggregations.ts                 # 이직률/경력구간/평균근속
│   └── format.ts                       # KRW/percent/개월 포맷
└── types/
    ├── database.ts                     # Supabase 생성 타입
    └── schema.ts                       # Zod + LOOKUP_TYPES
```

## Data Seed (조직도)

```bash
python scripts/build-seed-org.py   # 조직도 xlsx → scripts/seed-org.json
python scripts/build-seed-sql.py   # → scripts/seed-org.sql (참고용)
```

Supabase 마이그레이션은 MCP로 이미 적용되어 있습니다. 조직도 변경 후 재시드 필요 시
`scripts/seed-org.sql`을 Supabase SQL editor에 실행하거나 `/admin/org`에서 직접 편집.

## Data Model

`categories → companies → worksites → departments → employees`
+ `career_histories`, `profiles`, `import_logs`

모든 테이블에 RLS 적용. `group_admin` 역할만 read/write.
