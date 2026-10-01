# Current handoff

- Current goal: 사용자 요청 "진행하고 다시 전체 밸런스 검토해줘"(2026-10-01) — 경제 밸런스 조정 추천안 5건 구현과 1년 시뮬레이션 재검토. 구현·검토 완료, 리뷰·병합은 사용자 지시 대기.
- Branch: `feature/economy-balance`(워크트리 `.worktrees/economy`), main `4389bfd`에서 분기. Known pre-checkpoint parent: `4389bfd`. Locate the snapshot commit with `git log -1 -- HANDOFF.md`.
- Checkpoint type: Stable.
- Implemented (D051): 제작품 판매가 하한 원가×1.1(30종), 경제 업적 100만/1,000만/1억 G, 일일 퀘스트(스킬별 상위 두 단계·10~30개·보상 ×3, 옛 퀘스트 저장 호환), 환전 구조(같은 스킬 1~3단계 아래, 새 단계 포함, 가치 90% 상한), 길드 100개 구매 버튼·구매 버튼 시설 조건 반영, 봇의 원재료 구매 정책(200만 G 초과분).
- Verification: `npm test` 257/257, `npm run build` PASS, `npm run playthrough -- 365` 멈춤 없음·저장 검증 통과(docs/playthrough_report.md). 브라우저(포트 5291 수동 dev 서버): 환전 수량(단단한 나무 4 → 참나무 10), 100개 구매(-39,500 G), 시설 조건 구매 비활성, 375px 폭 가로 스크롤 없음, 콘솔 오류 없음.
- Result: 전 스킬 Lv99 상시 205.6 → 157.7일, 1시간 확인 275.9 → 231.5일. 원재료 구매가 1년 수입의 약 70% 소모. 경제 업적 3·11·52일.
- Open (제안만): 제작 Lv80→95 약 2개월, 1시간 확인 체감·일일 퀘스트·환전 체감은 플레이테스트 필요.
- Exact next action: 사용자 지시 대기(리뷰·병합 요청 시 `feature/economy-balance` 리뷰).
