# Current handoff

- Current goal: "전체 진행 경로 시뮬레이션 … 진행해줘"(2026-09-29) — 실제 엔진을 구동하는 봇으로 새 저장부터의 전체 진행을 측정한다. 계획·수용 기준은 PROGRESS.md "전체 진행 경로 시뮬레이션".
- Branch: `feature/progression-simulation` (main `47d7d23`에서 분기).
- Checkpoint type: Stable (작업 1 완료). Known pre-checkpoint parent: `47d7d23`. Locate the snapshot commit with `git log -1 -- HANDOFF.md`.
- Done: 1 봇 핵심 + 왕국 복원 구간(`src/engine/playthrough.ts`, 테스트 5개, D044).
- Verification: `npm test` 225/225, `npm run build` PASS.
- Next: 2 왕국 이후 목표(도구 티어·밭/축사·동물·길드·장신구·전 스킬 Lv99) + `npm run playthrough` 보고서, 3 결과 문서화.
- Caution: 워크트리 `.worktrees/progression-sim`. `scripts/_try.ts`는 로컬 실험 파일(커밋하지 않음). 밸런스 수치는 이 브랜치에서 바꾸지 않는다.
