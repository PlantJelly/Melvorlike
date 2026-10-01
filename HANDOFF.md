# Current handoff

- Current goal: "진행해보고 전체 검토해서 밸런스 괜찮은지 확인해줘"(2026-10-01) — 레벨 디자인 세분화. 계획·수용 기준은 PROGRESS.md "레벨 디자인 세분화".
- Branch: `feature/level-design` (main `590c12b`에서 분기).
- Checkpoint type: Stable (작업 1·2 완료). Known pre-checkpoint parent: `f5a4523` (작업 1). Locate the snapshot commit with `git log -1 -- HANDOFF.md`.
- Done: 1 채집 새 단계 21종 + 채광 경험치 정렬 + 시설 조건 체계. 2 제작 새 레시피 32종 + 제작 경험치 공식.
- Verification: `npm test` 248/248, `npm run build` PASS, 브라우저 벌목·대장작업 화면 확인.
- Next: 3 도구 9단계, 4 시뮬레이션 검토·보정, 5 문서(D049).
- Caution: 워크트리 `.worktrees/level-design`, QA dev 서버 포트 5242. 경험치 곡선은 바꾸지 않는다.
