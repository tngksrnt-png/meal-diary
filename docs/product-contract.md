# ReNA Group HR Dashboard — Product Contract

## Overview

ReNA 그룹사(919명, 6개 카테고리, 17개 법인)의 인사 데이터를 그룹 HR이 단일 시점에서 통합 조회하고 분석할 수 있는 웹 대시보드.

- 사용자: **그룹 HR (단일 역할, 로그인 허용 이메일 화이트리스트)**
- 데이터 입력: **Excel 업로드(월 마감) + 화면 내 CRUD** 두 방식 모두 지원
- 모바일 우선 디자인 (그룹 HR이 외부에서도 조회)
- 차트: `recharts` 허용

## Core Features

1. **Authentication** — Supabase Google OAuth + 허용 이메일 화이트리스트
2. **Excel Import** — 재직자/퇴직자 시트 업로드 → 직원 테이블 업서트 (매월 마감 동기화)
3. **Employee CRUD** — 개별 직원 추가/수정/퇴직처리/삭제 (화면에서)
4. **Group Dashboard** — 그룹 전체 KPI, 카테고리별·법인별 headcount 비교
5. **Organization Tree** — 조직도 xlsx 기반 카테고리 → 법인 → 사업장 → 부서 트리 뷰
6. **Per-Company HR Dashboard** — 법인 선택 후 5개 분석 탭
   - 재직자 대시보드 (부서·직급·고용형태·경력·직군별)
   - 퇴직자 대시보드 (부서·직급 이탈률·월별 추이·퇴직사유)
   - 사업장별 현황 비교
   - 부서·연봉 분석 (부서별/직급별/직군별 연봉 분포)
   - 채용현황 (채용경로·연도별 추이·고용형태·직급별)
7. **Employee List & Detail** — 재직/퇴직 토글 리스트 + 개인 상세 + 경력사항

## Data Model (Supabase / PostgreSQL)

```
categories (HQ / Sorting / MR / WtE / Shredding / Oil·Others)
companies (id, category_id, name, ceo_name, order_idx)
worksites (id, company_id, name)
departments (id, company_id, worksite_id, name, parent_department_id)
employees (
  id, employee_no, name, company_id, worksite_id, department_id,
  rank,              -- 대표이사/전무/상무/이사/부장/차장/과장/대리/주임/사원
  birth_date, hire_date, termination_date,
  gender,            -- 남/여
  employment_type,   -- 정규직/임원/계약직/고문
  nationality_type,  -- 내국인/외국인
  nationality,
  accounting_type,   -- 제조/판관
  job_family,        -- 관리/생산
  annual_salary,     -- KRW
  hire_channel,      -- 직채용/헤드헌터/채용사이트/추천/기타
  final_education,
  career_before_join_years,
  total_career_years,
  status,            -- 재직/휴직/퇴직
  termination_reason,-- 자발/권고사직/구조조정/계약만료/기타
  memo
)
career_histories (id, employee_id, company, role, start_date, end_date, memo)
profiles (id → auth.users, role='group_admin', email)
import_logs (id, file_name, sheet_type, upserted_count, uploaded_at, uploaded_by)
```

**RLS**: 모든 테이블은 `profiles.role='group_admin'`인 인증된 사용자만 read/write. 퍼블릭 접근 없음.

**PostgreSQL Trigger**: Supabase Auth 가입 시 `public.profiles` 자동 생성 (이메일 화이트리스트 체크).

## Admin Editing (메타 데이터 관리)

### /admin/org — 조직 구조 CRUD
- `BU(카테고리) / 법인 / 사업장 / 부서` 트리 뷰에서 추가/수정/삭제/순서 변경
- 속성: 이름, 대표자(법인), 표시순서, 부모 노드
- 삭제 정책: 소속 직원 또는 하위 노드가 있으면 **삭제 차단**, 빈 노드는 즉시 삭제
- 이동/병합 액션으로 정리 후 삭제 가능

### /admin/settings — 드롭다운 소스 CRUD (엑셀 `⚙️ 설정` 대체)
- 탭: 직급 / 고용형태 / 채용경로 / 최종학력 / 재직상태 / 퇴직사유 / 회계구분 / 직군
- 필드: `code`, `label`, `order_idx`, `is_active`
- 사용 중인 값은 **삭제 차단, is_active=false로 숨김만 허용**

### /admin/users — 화이트리스트 CRUD
- 허용 이메일 목록 (초기: `tngksrnt@gmail.com`)
- 미허용 이메일 로그인 시 `/no-access` 리다이렉트

## Primary User Flows

### Flow 1: Login
1. 로그인 페이지 → "Google로 로그인"
2. 이메일이 화이트리스트에 있으면 `/`(그룹 대시보드) 진입, 아니면 차단 페이지
- **Acceptance**: 승인 이메일만 진입, `profiles` 행 생성됨

### Flow 2: Excel Upload
1. `/admin/import` → Excel 파일 선택 → 시트 타입 선택(재직자/퇴직자) → 대상 법인 선택
2. 미리보기에서 매칭 결과 확인 (신규/업데이트/미매칭)
3. "가져오기" 확정 → `employees` 업서트, `import_logs` 기록
- **Acceptance**: 사번 기준 업서트, 업로드 이력이 `/admin/import`에서 조회 가능

### Flow 3: Group Dashboard
1. `/` 진입 → 그룹 전체 KPI (총 재직/휴직/퇴직, 평균 연봉, 이직률)
2. 카테고리별 headcount bar (HQ/Sorting/MR/WtE/Shredding/Oil)
3. 법인별 headcount 비교 + 카테고리 필터
4. 법인 카드 클릭 → `/companies/[id]`
- **Acceptance**: 조직도 xlsx 총인원(919명)과 DB 합계 일치

### Flow 4: Company HR Dashboard
1. `/companies/[id]` → 기본 탭 `재직자`
2. 탭 전환: 재직자 / 퇴직자 / 사업장별 / 연봉 / 채용
3. 사업장 필터 적용 시 모든 위젯이 재계산
- **Acceptance**: 하이원리싸이클링 엑셀의 지표와 수치가 일치

### Flow 5: Organization Tree
1. `/org` → 카테고리 6개 루트, 펼치면 법인 → 사업장 → 부서
2. 각 노드에 현재 재직자 수 배지
- **Acceptance**: 조직도 xlsx의 계층·이름·인원과 일치

### Flow 6: Employee CRUD
1. `/companies/[id]/employees` → 재직/퇴직 토글 + 검색/필터
2. "+ 추가" → 모달/페이지에서 Zod 검증 후 저장
3. 행 클릭 → 상세 페이지 → 수정/퇴직처리/삭제
- **Acceptance**: 수정 즉시 해당 법인 대시보드 수치 반영 (revalidatePath)

## Core E2E Scenarios (must pass)

1. 로그인 → 그룹 대시보드에서 919명 확인 → Sorting 카테고리 → 하이원리싸이클링 → 재직자 탭에서 38명 확인
2. `/admin/import`에 하이원 엑셀 업로드 → `employees` 38행 생성 → 대시보드 자동 반영
3. 직원 추가(사번 충돌 없음) → 해당 법인 재직자 수 +1 + 그룹 합계 +1
4. 재직자 → 퇴직처리(퇴사일, 사유 입력) → 퇴직자 대시보드로 이동 + 이직률 재계산
5. 사업장 필터(본점) 적용 시 부서·직급·연봉 위젯 모두 필터링
6. 비승인 이메일로 로그인 시도 → 차단 페이지
7. 조직도 트리에서 카테고리 펼침 → 법인별 인원 배지가 DB 수치와 일치

## Non-Goals (v1)

- 급여 계산/산정 로직 (표시만)
- 근태 관리
- 평가/성과 관리
- 다국어 (한국어 전용)
- 모바일 네이티브 앱 (웹 PWA만)

## Priority / Phase Plan

- **P1 (필수)**: 스키마 + RLS, Auth(화이트리스트), Excel 업로드, 조직도 시드, 법인 HR 대시보드(재직자 탭), 그룹 대시보드, 조직도 트리
- **P2**: 퇴직자 · 사업장별 · 연봉 · 채용 탭 완성, 직원 리스트/상세, CRUD
- **P3**: 경력사항 시트, Import 미리보기/이력, 필터 조합, 모바일 최적화 튜닝
