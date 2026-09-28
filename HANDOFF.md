# Current handoff

- Current goal: "스킬 개발 진행해야하는거 전부 진행시켜줘"(2026-09-28) — 남은 스킬 항목 5개를 `feature/skill-remaining`에서 순서대로 구현한다. 계획·범위·제외 항목은 PROGRESS.md "스킬 개발 잔여 항목 2차" 섹션.
- Branch: `feature/skill-remaining`, `origin/main` `3dfadd2`에서 분기. 병합 지시 없음 — main에 반영하지 않는다.
- Checkpoint type: Stable (항목 1~3 완료). Known pre-checkpoint parent: `a56d640`. Locate the snapshot commit with `git log -1 -- HANDOFF.md`.
- Done: 1 대장간 설비 이름(화로/용광로), 2 석탄(`dropOnly` 채광 부산물, 저장 v26, 구리·철 주괴 연료 교체 — D037), 3 낚시 꽝(저장 v27, 레벨 구간별 정산으로 온라인/오프라인 동일성 유지 — D038).
- Verification: `npm test` 193/193, `npm run build` PASS. 브라우저(워크트리 전용 dev 서버 5231) — 석탄 획득·표시, 석탄 카드 비노출, 구리 주괴 새 재료로 제작 가능, 화로/용광로 표시, 낚시 카드 꽝 확률 표시·100번 중 88마리.
- Remaining: 4 조제 보조재(접착제·염료·보존제 + 소비처) → 5 재봉 자재(밧줄·천 + 소비처).
- Open decision (사용자): 소 사료 적자, 패시브 경험치 재조정 — 이 브랜치 범위 밖.
- Caution: 워크트리 QA는 `npm run dev -- --port 5231 --strictPort`로 직접 띄워 URL로 붙일 것. 셸 인라인 스크립트 대신 스크래치 파일로 편집할 것(백틱·CRLF 문제).
- Exact next action: 항목 4(조제 보조재) — 접착제(Lv1)·염료(Lv10)·보존제(Lv30) 레시피 추가, 소비처 연결: 접착제→밭 확장·자동화 비용, 염료→장신구 승급 비용, 보존제→새 요리 "보존 식량"(60분). 가격은 D033 비율 재사용. 저장 스키마 변경 없음.
