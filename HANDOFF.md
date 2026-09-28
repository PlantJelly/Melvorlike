# Current handoff

- Current goal: "스킬 개발 마저 다 진행해줘"(2026-09-28) — 기획 문서에 있는데 아직 없는 스킬 항목 7개를 `feature/skill-completion`에서 순서대로 구현한다. 계획·범위·제외 항목은 PROGRESS.md "스킬 기획 잔여 항목 구현" 섹션.
- Branch: `feature/skill-completion`, `origin/main` `31661da`에서 분기. 병합 지시 없음 — main에 반영하지 않는다.
- Checkpoint type: Stable (항목 1~5 완료). Known pre-checkpoint parent: `dcf81db`. Locate the snapshot commit with `git log -1 -- HANDOFF.md`.
- Done: 1 달걀찜, 2 황금옥수수(스키마 변경 없음), 3 광맥 발견(저장 v21), 4 나무묘목(저장 v22), 5 다중 밭+자동 파종/수확(저장 v23, `farmPlots`/`farmAuto` — D035). 확률 누적은 공용 `CHANCE_SCALE`(D034). `SAVE_VERSION` 상수 도입.
- Verification: `npm test` 166/166, `npm run build` PASS. 브라우저(포트 5230) — 달걀찜·황금옥수수·광맥(돌 96회 → 구리+1·마나석+1)·묘목(벌목 50회 → 묘목, 심기 → 나무 300개 수확)·밭 확장/자동화(2칸 자동 수확·재파종) 확인, 콘솔 오류 없음.
- Remaining: 6 비료 3종(v24) → 7 목장 마릿수 확장(v25).
- Open decision (사용자): 소 사료 적자(당근 10개 13,300G > 우유 6,500G) 처리 방식 — 이 브랜치 범위 밖.
- Caution: 이름 기반 `preview_start`는 저장소 루트(옛 브랜치)를 띄운다. 워크트리에서 `npm run dev -- --port 5230 --strictPort`로 직접 띄우고 URL로 붙일 것.
- Exact next action: 항목 6(비료 3종) — 골드 구매형 소모품(`fertilizers` 재고), 파종 시 칸에 적용(속성=성장 속도, 배양=수확 2배 누적, 회수=씨앗 반환 누적), 저장 v24. v23 경계 테스트는 버전을 23으로 고정할 것.
