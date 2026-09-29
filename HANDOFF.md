# Current handoff

- Current goal: "전체 진행 경로 시뮬레이션 … 진행해줘"(2026-09-29) — 실제 엔진을 구동하는 봇으로 새 저장부터의 전체 진행을 측정한다. 계획·수용 기준은 PROGRESS.md "전체 진행 경로 시뮬레이션".
- Branch: `feature/progression-simulation` (main `47d7d23`에서 분기).
- Checkpoint type: Stable (작업 2 완료). Known pre-checkpoint parent: `ce3680b` (작업 1). Locate the snapshot commit with `git log -1 -- HANDOFF.md`.
- Done: 1 봇 핵심 + 왕국 구간, 2 왕국 이후 목표 + `npm run playthrough` 보고서.
- Verification: `npm test` 229/229, `npm run build` PASS, `npm run simulate`·`npm run playthrough -- 365` 실행 확인.
- Found (game-side, not fixed here): 자동 파종/수확 설치 후 작물 변경 불가, 왕국 공사 완료 판정 오차와 저장 검증 불일치(잠재). PROGRESS 참고.
- Next: 3 보고서 결과를 문서화(관찰된 병목·곡선과 조정 후보는 제안으로만 표기).
- Caution: 워크트리 `.worktrees/progression-sim`. 밸런스 수치는 이 브랜치에서 바꾸지 않는다.
