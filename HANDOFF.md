# Current handoff

- Current goal: "그 전에 추가할만한것들 조사한다음 추가해줘"(2026-09-28) — 기획 문서 근거가 있는 미구현 편의 기능·업적을 `feature/convenience-achievements`에서 구현한다(`feature/skill-remaining` 위에 쌓음). 조사 결과·범위·제외는 PROGRESS.md "편의 기능·업적" 섹션.
- Branch: `feature/convenience-achievements`, `feature/skill-remaining`(`1497d80`)에서 분기. 병합 지시 없음.
- Checkpoint type: Stable (항목 1 완료). Known pre-checkpoint parent: `1497d80`. Locate the snapshot commit with `git log -1 -- HANDOFF.md`.
- Done: 1 목표 수량 자동 정지 + 다음 작업 예약(저장 v28 — D041).
- Verification: `npm test` 211/211, `npm run build` PASS. 브라우저(포트 5232) 목표·예약 흐름 확인.
- Remaining: 2 업적(성장형·경제형·제작형 + 완주형 진행도, 저장 v29).
- Caution: 워크트리 QA는 `npm run dev -- --port 5232 --strictPort`로 직접 띄워 URL로 붙일 것. 셸 인라인 스크립트 대신 스크래치 파일로 편집할 것.
- Exact next action: 항목 2(업적) — `src/content/achievements.ts` 정의, 누적 골드(`goldEarned`)·첫 전설 리롤(`legendaryRolled`) 저장, 스킬 속도 보너스·환전 배율·마법부여석 약초 할인 연결, 업적 화면 추가.
