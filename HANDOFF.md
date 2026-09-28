# Current handoff

- Current goal: "스킬 개발 진행해야하는거 전부 진행시켜줘"(2026-09-28) — 남은 스킬 항목 5개를 `feature/skill-remaining`에서 순서대로 구현한다. 계획·범위·제외 항목은 PROGRESS.md "스킬 개발 잔여 항목 2차" 섹션.
- Branch: `feature/skill-remaining`, `origin/main` `3dfadd2`에서 분기. 병합 지시 없음 — main에 반영하지 않는다.
- Checkpoint type: Stable (항목 1·2 완료). Known pre-checkpoint parent: `3dfadd2`. Locate the snapshot commit with `git log -1 -- HANDOFF.md`.
- Done: 1 대장간 설비 이름(화로/용광로), 2 석탄(`dropOnly` 채광 부산물, 저장 v26, 구리·철 주괴 연료 교체 — D037).
- Verification: `npm test` 187/187, `npm run build` PASS. 브라우저(워크트리 전용 dev 서버 5231) — 석탄 획득·표시, 석탄 카드 비노출, 구리 주괴 새 재료로 제작 가능, 화로/용광로 표시.
- Remaining: 3 낚시 꽝(저장 v27) → 4 조제 보조재(접착제·염료·보존제 + 소비처) → 5 재봉 자재(밧줄·천 + 소비처).
- Open decision (사용자): 소 사료 적자, 패시브 경험치 재조정 — 이 브랜치 범위 밖.
- Caution: 워크트리 QA는 `npm run dev -- --port 5231 --strictPort`로 직접 띄워 URL로 붙일 것. 셸 인라인 스크립트 대신 스크래치 파일로 편집할 것(백틱·CRLF 문제).
- Exact next action: 항목 3(낚시 꽝) — 낚시터별 꽝 확률(레벨이 오를수록 감소), 꽝이어도 경험치는 지급, `Model.junkProgress`(정수 누적)와 저장 v27. v26 경계 테스트는 버전을 26으로 고정할 것.
