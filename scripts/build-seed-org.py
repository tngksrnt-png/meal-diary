"""Parse 조직도 xlsx into seed JSON for Supabase insertion."""
import sys
import io
import json
import os

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

import openpyxl

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
XLSX = os.path.join(ROOT, "dashboard", "ReNA 그룹사_조직도_260416.xlsx")

seed = {"categories": [], "companies": [], "worksites": [], "departments": []}

# HQ
seed["categories"].append({"code": "HQ", "name": "HQ", "order_idx": 0, "is_hq": True})
seed["companies"].append({"cat_code": "HQ", "name": "ReNA HQ", "ceo_name": "이선종", "order_idx": 0})

hq_divisions = [
    ("전략기획부문", ["전략기획팀", "M&A팀"]),
    ("선별사업부문", ["선별사업팀"]),
    ("WtE사업부문", ["WtE사업팀"]),
    ("Recycle사업부문", ["국내영업팀"]),
    ("경영관리부문", ["재무회계팀", "재무기획팀"]),
    ("경영지원부문", ["인사총무팀", "구매팀", "IT팀"]),
]
for didx, (division, teams) in enumerate(hq_divisions):
    seed["departments"].append({
        "company": "ReNA HQ", "worksite": None, "parent": None,
        "name": division, "kind": "division", "order_idx": didx,
    })
    for tidx, team in enumerate(teams):
        seed["departments"].append({
            "company": "ReNA HQ", "worksite": None, "parent": division,
            "name": team, "kind": "team", "order_idx": tidx,
        })

# 자회사 카테고리
categories_detail = [
    {"code": "Sorting", "name": "Sorting", "order_idx": 1, "companies": [
        ("신풍자원", "유병석"), ("미주자원", "김대웅"), ("서울에코사이클", "김수광"),
        ("대영기업순환자원", "정대도"), ("제이에스자원환경", "김환진"), ("하이원리싸이클링", "이성원"),
    ]},
    {"code": "MR", "name": "MR", "order_idx": 2, "companies": [
        ("알엠오산/광명", "김택균"), ("알엠화성", "이선종(겸)"), ("에이치투", "이선종(겸)"),
    ]},
    {"code": "WtE", "name": "WtE", "order_idx": 3, "companies": [
        ("청송산업개발", "김현덕"), ("가나에너지", "김용진"), ("청경에너지", "류제형"),
    ]},
    {"code": "Shredding", "name": "Shredding", "order_idx": 4, "companies": [
        ("리에나", "박형남(겸)"), ("거단산업", "박형남"), ("경인에코텍", "정균"),
    ]},
    {"code": "Oil", "name": "Oil · Others", "order_idx": 5, "companies": [
        ("에코에너지코리아", "장태성"), ("신진유화", "장태성(겸)"),
        ("우리운수", "안기복(겸)"), ("용인실업", "김종오"),
    ]},
]
for cat in categories_detail:
    seed["categories"].append({
        "code": cat["code"], "name": cat["name"],
        "order_idx": cat["order_idx"], "is_hq": False,
    })
    for i, (cname, ceo) in enumerate(cat["companies"]):
        seed["companies"].append({
            "cat_code": cat["code"], "name": cname, "ceo_name": ceo, "order_idx": i,
        })

worksite_dept_map = {
    "신풍자원": [
        ("이천사업장", ["경영지원팀", "선별파트", "압축파트"]),
        ("용인사업장", ["경영지원팀", "공무팀", "선별파트", "압축파트", "전처리파트"]),
        ("하남사업장", ["경영지원팀", "공무팀", "운송팀", "생산팀"]),
    ],
    "미주자원": [("본점", ["운영부", "선별라인", "운송부", "홉바/현장", "압축"])],
    "서울에코사이클": [("본점", ["총괄이사", "경영관리부", "관리부", "금속캔재활용", "혼합재활용선별", "대형폐기물"])],
    "대영기업순환자원": [("본점", [
        "총괄사업본부", "총무팀", "현장관리팀", "공무팀", "물류팀",
        "생산1팀", "생산2팀", "생산3팀", "생산4팀", "생산5팀", "생산6팀",
    ])],
    "제이에스자원환경": [("본점", ["관리본부", "선별본부", "수집운반본부"])],
    "하이원리싸이클링": [("본점", ["총무팀", "생산팀", "선별", "압축", "야간", "운송", "투입"])],
    "알엠오산/광명": [
        ("오산공장", ["재경팀", "SCM팀", "구매사업부", "생산팀", "설비보전팀"]),
        ("광명공장", ["운영총괄본부", "관리팀", "선별팀", "생산1부", "생산2부"]),
    ],
    "알엠화성": [("화성공장", [
        "운영총괄", "SCM실", "경영관리실", "경영지원실", "재경실",
        "안전경영팀", "판매사업부", "품질보증팀", "소각파트", "수처리파트",
        "생산기술팀", "생산팀",
    ])],
    "에이치투": [("에이치투 공장", ["재경실", "생산팀", "설비보전팀"])],
    "청송산업개발": [("본점", [
        "경영지원부", "영업부", "환경안전부", "수송",
        "운영1팀", "운영2팀", "운영3팀", "운영4팀", "운영부", "지원팀",
    ])],
    "가나에너지": [("본점", [
        "경영지원부", "영업부", "환경안전부", "수송",
        "운영1조", "운영2조", "운영3조", "운영4조", "운영부", "지원조",
    ])],
    "청경에너지": [("본점", ["경영지원팀", "시설운영부문", "영업부문", "환경안전팀"])],
    "리에나": [
        ("화성사업부", ["경영지원부", "생산부", "영업부"]),
        ("정남사업부", ["경영지원부", "영업부", "운송부"]),
    ],
    "거단산업": [("본점", [
        "관리부", "식당", "영업부", "운송부", "환경안전실",
        "생산1팀", "생산2팀", "생산3팀", "생산부", "생산지원팀", "공무팀",
        "1-3암롤", "2-3암롤", "5톤 집게", "9.5톤 집게",
    ])],
    "경인에코텍": [("본점", ["관리본부", "총무팀", "특수폐기팀", "생산본부", "생산팀", "운송팀"])],
    "에코에너지코리아": [("본점", [
        "경영지원부", "물류팀", "생산팀", "영업1팀", "영업2팀(미군)",
        "영업부", "영업지원팀", "품질관리팀", "환경/안전",
    ])],
    "신진유화": [("본점", ["경영지원부", "영업1팀", "물류팀"])],
    "우리운수": [("본점", ["영업1팀", "영업지원팀"])],
    "용인실업": [("본점", ["관리부", "고객지원", "현장관리", "차량정비", "기동반", "재활용"])],
}

for cname, ws_list in worksite_dept_map.items():
    for widx, (wname, depts) in enumerate(ws_list):
        seed["worksites"].append({"company": cname, "name": wname, "order_idx": widx})
        for didx, dname in enumerate(depts):
            seed["departments"].append({
                "company": cname, "worksite": wname, "parent": None,
                "name": dname, "kind": "team", "order_idx": didx,
            })

out_path = os.path.join(HERE, "seed-org.json")
with open(out_path, "w", encoding="utf-8") as f:
    json.dump(seed, f, ensure_ascii=False, indent=2)

print(f"Categories: {len(seed['categories'])}")
print(f"Companies:  {len(seed['companies'])}")
print(f"Worksites:  {len(seed['worksites'])}")
print(f"Departments:{len(seed['departments'])}")
print(f"Written to {out_path}")
