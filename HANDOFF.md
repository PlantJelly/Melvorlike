# Current handoff

- Current goal: "리뷰하고 문제없으면 머지 진행하고 버그들 수정해줘"(2026-09-29). 시뮬레이션 브랜치는 리뷰 PASS 후 main 병합 완료(`5d84a46`). 지금은 시뮬레이션이 찾은 버그 2건 수정 중.
- Branch: `fix/farm-auto-and-project-progress` (main `5d84a46`에서 분기).
- Checkpoint type: Stable (작업 1·2 완료). Known pre-checkpoint parent: `70f2430` (작업 1). Locate the snapshot commit with `git log -1 -- HANDOFF.md`.
- Done: 1 밭 비우기(엔진·UI) + 공사 진행량 보정, 테스트 7개, D045. 2 시뮬레이션 자동 파종 사용 + 보고서 재생성.
- Verification: `npm test` 236/236, `npm run build` PASS, 브라우저 밭 비우기 확인.
- Next: `5d84a46..HEAD` 리뷰 후 병합(사용자 지시 있음).
- Caution: 워크트리 `.worktrees/bugfix`, QA dev 서버는 `npm run dev -- --port 5240 --strictPort`.
