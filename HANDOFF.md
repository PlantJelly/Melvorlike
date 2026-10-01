# Current handoff

- Current goal: "관찰도 마저 진행해줘"(2026-10-01) — 완료. 병합 지시 없음(main 미반영).
- Branch: `feature/level-design` (main `590c12b`에서 분기).
- Checkpoint type: Stable (레벨 격자 1~5 + 관찰 후속 6~10 완료). Known pre-checkpoint parent: `05c1df8` (작업 10a). Locate the snapshot commit with `git log -1 -- HANDOFF.md`.
- Done: D049 레벨 격자(채집 21·제작 32·도구 9단계·시설 조건·제작 경험치 공식), D050 관찰 후속(농사·목장 후반 단계, 새 나무 묘목, 새 요리 효과, 목장 진행량 음수 버그 수정), 시뮬레이터 봇 보정(가장 낮은 스킬 중심).
- Verification: `npm test` 255/255, `npm run build` PASS, `npm run playthrough -- 365` 멈춤 없음·저장 검증 통과, 브라우저 벌목·대장작업·도구·요리·농사·목장 화면 확인.
- Balance: 전 스킬 Lv99+시설 최대 상시 205.6일/1시간 275.9일, 1년 뒤 12/12. 상세 docs/playthrough_report.md.
- Open (제안만): 후반 골드 소모처, 제작 Lv80→95 구간 길이, 1시간 확인 체감.
- Exact next action: 사용자 지시 대기 — 병합 요청 시 `590c12b..HEAD` 리뷰 후 병합 게이트 확인.
