# Current handoff

- Current goal: "그렇게 진행하고 리뷰한다음 문제없으면 머지해줘"(2026-09-29) — 소 사료 적자를 사료 감소(당근 10 → 2)로 해결. 리뷰 후 병합 지시 있음.
- Branch: `fix/cow-feed` (main `319d4cf`에서 분기).
- Checkpoint type: Stable. Known pre-checkpoint parent: `319d4cf`. Locate the snapshot commit with `git log -1 -- HANDOFF.md`.
- Done: 소 feedAmount 2, 목장 경제성 테스트 2개, content_spec §3·DECISIONS D043·implementation_status 갱신.
- Verification: `npm test` 220/220, `npm run build` PASS.
- Known risks: 패시브 경험치 최대 3배(밭·동물 3칸), 시설 업그레이드에 조제·재봉 해금 필요, 낚시 초반 수급 감소, 누적 골드 v29부터 집계, 성장형 업적 보상 해석(판매가 +2%/단계). 이전 리뷰 비블로킹: 낚시 목표 수량은 꽝 포함 시도 횟수, 수동 중지는 예약 유지, 잘못된 목표 입력은 제한 없음 처리.
- Exact next action: 독립 리뷰(`319d4cf..HEAD`) 후 병합 게이트 확인·병합.
