# Current handoff

- Current goal: "스킬 개발 마저 다 진행해줘"(2026-09-28) — 기획 문서에 있는데 아직 없는 스킬 항목 7개를 `feature/skill-completion`에서 순서대로 구현한다. 계획·범위·제외 항목은 PROGRESS.md "스킬 기획 잔여 항목 구현" 섹션.
- Branch: `feature/skill-completion`, `origin/main` `31661da`에서 분기. 병합 지시 없음 — main에 반영하지 않는다.
- Checkpoint type: Stable (항목 1~3 완료). Known pre-checkpoint parent: `b53552c`. Locate the snapshot commit with `git log -1 -- HANDOFF.md`.
- Done: 1 달걀찜, 2 황금옥수수(스키마 변경 없음), 3 광맥 발견(저장 v21, `veinProgress`, 결정론적 누적 — D034). `SAVE_VERSION` 상수 도입.
- Verification: `npm test` 152/152, `npm run build` PASS. 브라우저(포트 5230) — 달걀찜·황금옥수수·광맥(돌 96회 → 구리+1·마나석+1, 알림·확률 표시) 확인, 콘솔 오류 없음.
- Remaining: 4 나무묘목(v22) → 5 다중 밭+자동 파종/수확(v23) → 6 비료 3종(v24) → 7 목장 마릿수 확장(v25).
- Open decision (사용자): 소 사료 적자(당근 10개 13,300G > 우유 6,500G) 처리 방식 — 이 브랜치 범위 밖.
- Caution: 이름 기반 `preview_start`는 저장소 루트(옛 브랜치)를 띄운다. 워크트리에서 `npm run dev -- --port 5230 --strictPort`로 직접 띄우고 URL로 붙일 것.
- Exact next action: 항목 4(나무묘목) — 벌목 산출 시 정수 누적으로 티어별 묘목 지급(`saplingProgress`, 저장 v22), 밭에 심으면 해당 티어 원목 수확. v21 경계 테스트는 새 필드를 지우고 버전을 21로 고정할 것.
