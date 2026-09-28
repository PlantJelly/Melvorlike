# Current handoff

- Current goal: "그 전에 추가할만한것들 조사한다음 추가해줘"(2026-09-28) — 기획 문서 근거가 있는 미구현 항목을 조사해 편의 기능(목표 수량·다음 작업 예약)과 업적(성장·경제·제작 + 완주 목표 표시)을 구현했다. 조사 결과·범위·제외는 PROGRESS.md "편의 기능·업적" 섹션.
- Branch: `feature/convenience-achievements`, `feature/skill-remaining`(`1497d80`) 위에 쌓음. 두 브랜치 모두 병합 지시 없음 — main에 반영하지 않았다. 이 브랜치를 병합하면 `feature/skill-remaining`의 커밋도 함께 들어간다.
- Checkpoint type: Stable (항목 1·2 모두 완료). Known pre-checkpoint parent: `839c428`. Locate the snapshot commit with `git log -1 -- HANDOFF.md`.
- Done: 1 목표 수량 자동 정지 + 다음 작업 예약(저장 v28 — D041), 2 업적(저장 v29 — D042).
- Verification: `npm test` 218/218, `npm run build` PASS(최종 상태). 브라우저(워크트리 전용 dev 서버 5232) — 목표·예약 흐름, 판매 보너스 적용·표시, 업적 화면 진행도.
- Known risks: (1) 누적 골드는 v29부터 세므로 기존 플레이어는 경제형 업적을 처음부터 쌓는다. (2) 성장형 보상을 기획의 "소량 영구 보너스" 해석으로 판매가 +2%/단계로 정했다 — 속도 보너스가 더 낫다고 판단되면 조정 가능. (3) `feature/skill-remaining`의 위험(시설 업그레이드에 조제·재봉 해금 필요, 낚시 초반 수급 감소)과 이전부터 남은 패시브 경험치·소 사료 적자는 그대로.
- 제외(이유): 프리셋(장비 한 벌뿐), 도감·수집형 업적(기획 미정), 완주형 보상(기획 미정).
- Caution: 워크트리 QA는 `npm run dev -- --port 5232 --strictPort`로 직접 띄워 URL로 붙일 것. 셸 인라인 스크립트 대신 스크래치 파일로 편집할 것.
- Exact next action: 사용자 지시 대기. 병합을 원하면 `3dfadd2..HEAD`(두 브랜치 합계)를 독립 리뷰한 뒤 병합 게이트를 확인한다.
