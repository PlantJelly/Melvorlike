# Current handoff

- Current goal: 사용자 요청 "응 1~3 진행하고 다시 전체 밸런스 검토해줘"(2026-10-02) — 원재료 구매를 하위 단계 캐치업으로 제한(게임 규칙·봇)하고 재측정. 구현·검토 완료, 리뷰·병합은 사용자 지시 대기.
- Branch: `feature/economy-balance`(워크트리 `.worktrees/economy`), main `4389bfd`에서 분기. Known pre-checkpoint parent: `a152d3c`(경제 조정 첫 체크포인트). Locate the snapshot commit with `git log -1 -- HANDOFF.md`.
- Checkpoint type: Stable.
- Implemented (D051): 제작품 판매가 하한 원가×1.1, 경제 업적 100만/1,000만/1억 G, 일일 퀘스트(스킬별 상위 두 단계·10~30개·보상 ×3), 환전 구조(1~3단계 아래, 가치 90% 상한), 원재료 구매는 채집 스킬의 현재 최고 단계보다 낮은 것만(`purchasable`), 길드 100개 구매 버튼, 봇 따라잡기 구매(200만 G 초과분, 채집 재료만, 산 재료는 되팔지 않음).
- Verification: `npm test` 259/259, `npm run build` PASS, `npm run playthrough -- 365` 멈춤 없음·저장 검증 통과(docs/playthrough_report.md). 구매만 끈 비교 실행은 205.0일 / 275.9일로 main 기준선과 같음. 브라우저(포트 5291 수동 dev 서버): 최고 단계 구매 불가 표시·하위 단계 구매 가능, 콘솔 오류 없음.
- Result: 전 스킬 Lv99 상시 205.0 → 140.3일, 1시간 확인 275.9 → 230.2일. 구매 소모 2.1억 / 3.1억 G, 만렙 시점 보유 0.89억 / 0.82억 G. 경제 업적 3·11·69일 / 4·15·55일.
- Open (제안만): 1시간 확인 플레이의 제작 Lv80→95 약 100~110일, 일일 퀘스트·환전 체감은 플레이테스트 필요.
- Exact next action: 사용자 지시 대기(리뷰·병합 요청 시 `feature/economy-balance` 리뷰).
