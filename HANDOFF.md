# Current handoff

- Current goal: "스킬 개발 마저 다 진행해줘"(2026-09-28) — 기획 문서에 있는데 아직 없는 스킬 항목 7개를 `feature/skill-completion`에서 순서대로 구현한다. 계획·범위·제외 항목은 PROGRESS.md "스킬 기획 잔여 항목 구현" 섹션.
- Branch: `feature/skill-completion`, `origin/main` `31661da`에서 분기. 병합 지시 없음 — main에 반영하지 않는다.
- Checkpoint type: Stable (항목 1·2 완료). Known pre-checkpoint parent: `31661da`. Locate the snapshot commit with `git log -1 -- HANDOFF.md`.
- Done: 1 달걀찜(경험치 음식, `FoodDef.expBonus`), 2 황금옥수수(농사 Lv40 작물). 저장 스키마 변경 없음(v20 유지).
- Verification: `npm test` 146/146, `npm run build` PASS, 브라우저 확인(워크트리 전용 dev 서버 포트 5230) — 달걀찜 제작·섭취·음식 상태 표시, 황금옥수수 카드·심기, 콘솔 오류 없음.
- Remaining: 3 광맥 발견(v21) → 4 나무묘목(v22) → 5 다중 밭+자동 파종/수확(v23) → 6 비료 3종(v24) → 7 목장 마릿수 확장(v25).
- Open decision (사용자): 소 사료 적자(당근 10개 13,300G > 우유 6,500G) 처리 방식 — 이 브랜치 범위 밖.
- Caution: 이름 기반 `preview_start`는 저장소 루트(옛 브랜치)를 띄운다. 워크트리에서 `npm run dev -- --port 5230 --strictPort`로 직접 띄우고 URL로 붙일 것.
- Exact next action: 항목 3(광맥 발견) 구현 — 채광 산출 시 정수 누적으로 광맥을 판정, `Model.veinProgress` 추가와 저장 v21 이전.
