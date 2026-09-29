# Current handoff

- Current goal: "전체 진행 경로 시뮬레이션 … 진행해줘"(2026-09-29) — 완료. 병합 지시 없음(main 미반영).
- Branch: `feature/progression-simulation` (main `47d7d23`에서 분기).
- Checkpoint type: Stable (작업 1~3 완료). Known pre-checkpoint parent: `c68fc53` (작업 2). Locate the snapshot commit with `git log -1 -- HANDOFF.md`.
- Done: 1 봇 핵심 + 왕국 구간, 2 왕국 이후 목표 + `npm run playthrough`, 3 결과 문서 `docs/playthrough_report.md`.
- Verification: `npm test` 229/229, `npm run build` PASS, `npm run playthrough -- 365` 실행 확인.
- Findings: 재봉 Lv99 사실상 불가(양털), 패시브 만렙이 액티브보다 10배 이상 빠름, 골드 인플레이션, 왕국·장비 구간이 짧음(상시 9일). 게임 쪽 문제: 자동 파종 설치 후 작물 변경 불가, 공사 완료 판정 오차와 저장 검증 불일치(잠재). 조정은 사용자 결정 대기.
- Exact next action: 사용자 지시 대기 — 병합 요청 시 `47d7d23..HEAD` 리뷰 후 병합 게이트 확인. 조정 요청 시 새 브랜치에서 진행.
