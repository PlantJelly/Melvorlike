# Current handoff

- Current goal: "진행해보고 전체 검토해서 밸런스 괜찮은지 확인해줘"(2026-10-01) — 레벨 디자인 세분화 완료. 병합 지시 없음(main 미반영).
- Branch: `feature/level-design` (main `590c12b`에서 분기).
- Checkpoint type: Stable (작업 1~5 완료). Known pre-checkpoint parent: `539d2d4` (작업 4). Locate the snapshot commit with `git log -1 -- HANDOFF.md`.
- Done: 채집 새 재료 21종·제작 새 레시피 32종·도구 9단계·시설 조건(D049), 제작 경험치 공식(배율 0.2), 시뮬레이터 반영, 보고서·문서.
- Verification: `npm test` 249/249, `npm run build` PASS, `npm run playthrough -- 365` 멈춤 없음·저장 검증 통과, 브라우저 벌목·대장작업·도구 화면 확인.
- Balance: 전 스킬 Lv99+시설 최대 상시 173.8일/1시간 259.5일, 해금 스킬당 17회. 상세 docs/playthrough_report.md.
- Open (제안만): 패시브 후반 해금, 1시간 확인 시 일부 제작 중반 지연(봇 정책), 새 요리 음식 효과, 새 나무 묘목.
- Exact next action: 사용자 지시 대기 — 병합 요청 시 `590c12b..HEAD` 리뷰 후 병합 게이트 확인.
