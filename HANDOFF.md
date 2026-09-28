# Current handoff

- Current goal: "스킬 개발 진행해야하는거 전부 진행시켜줘"(2026-09-28) — 남은 스킬 항목 5개를 `feature/skill-remaining`에서 모두 구현했다. 계획·범위·제외 항목·항목별 검증은 PROGRESS.md "스킬 개발 잔여 항목 2차" 섹션.
- Branch: `feature/skill-remaining`, `origin/main` `3dfadd2`에서 분기. 병합 지시 없음 — main에 반영하지 않았다.
- Checkpoint type: Stable (항목 1~5 모두 완료). Known pre-checkpoint parent: `47dec2f`. Locate the snapshot commit with `git log -1 -- HANDOFF.md`.
- Done: 1 대장간 설비 이름(화로/용광로), 2 석탄(채광 부산물, 구리·철 주괴 연료 교체, 저장 v26 — D037), 3 낚시 꽝(저장 v27, 레벨 구간별 정산 — D038), 4 조제 보조재(접착제·염료·보존제 + 보존 식량 — D039), 5 재봉 자재(밧줄·천 — D040).
- Verification: `npm test` 201/201, `npm run build` PASS(최종 상태). 항목마다 워크트리 전용 dev 서버(포트 5231)에서 브라우저 확인.
- Known risks: (1) 밭 확장·자동화·축사 강화에 조제·재봉 해금(열·열한 번째 구역)이 필요해져, 신규 저장에서 해당 레벨에 먼저 도달해도 설치가 늦어질 수 있다 — 플레이테스트 필요. (2) 낚시 꽝으로 초반 물고기 수급이 줄었다(경험치는 그대로). (3) 이전 브랜치에서 남은 패시브 경험치 최대 3배·소 사료 적자는 그대로.
- 제외(이유, PROGRESS 참고): 돛·깃발·침구(쓰일 시스템 없음), 목장 보조 아이템(기획 정의 없음), 조제 비료 제작(content_spec이 구매형으로 명시).
- Caution: 워크트리 QA는 `npm run dev -- --port 5231 --strictPort`로 직접 띄워 URL로 붙일 것. 셸 인라인 스크립트 대신 스크래치 파일로 편집할 것(백틱·CRLF 문제).
- Exact next action: 사용자 지시 대기. 병합을 원하면 이 브랜치 전체(`3dfadd2..HEAD`)를 독립 리뷰한 뒤 병합 게이트를 확인한다.
