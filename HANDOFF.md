# Current handoff

- Current goal: completed the independent review and main integration of `feature/skill-completion` ("리뷰하고 문제없으면 머지해줘"). 기획 문서에 남아 있던 스킬 항목 7개(달걀찜·황금옥수수·광맥 발견·나무묘목·다중 밭과 자동 파종/수확·비료 3종·목장 마릿수 확장)가 main에 반영됐다. 저장 형식 v25.
- Branch: `main`. `feature/skill-completion`과 `origin/main` 모두 `e3f4f666c111c4ccac74787aae1fc42701571cbe`에서 확인(2026-09-28, fast-forward). 이어서 병합 기록 문서 커밋 `4aba0db`(PROGRESS·implementation_status)를 푸시했다.
- Checkpoint type: Stable integration record. Known pre-checkpoint parent: `4aba0db`. Locate the snapshot commit with `git log -1 -- HANDOFF.md`.
- Review: merge-base(`31661da`)~HEAD 전체 diff 독립 리뷰. 블로킹 결함 1건(성장 시뮬레이터가 묘목 수확을 "묘목 1개"로 계산해 시간당 판매가를 1/3로 보고)을 찾아 `e3f4f66`에서 수정한 뒤 최종 HEAD에서 PASS. 보고서는 `.git/worktrees/skill-completion/development-workflow-review.md`(워크트리 밖).
- Verification: `npm test` 182/182, `npm run build`, `git diff --check`, `git merge-tree`(충돌 없음) PASS — 리뷰 HEAD와 병합 후 main에서 모두 재확인. 추가로 main(`31661da`) 코드로 만든 실제 v20 저장을 새 코드로 열어 v25 이전·1시간 정산·재저장 왕복이 정상임을 확인. CI는 구성돼 있지 않음(GitHub Actions 0건).
- Design records: D034(확률 요소의 결정론적 누적, `SAVE_VERSION` 상수), D035(다중 밭·자동화), D036(축사 강화).
- Known risks / open items: (1) 밭 3칸·목장 3마리를 채우면 패시브 시간당 경험치가 최대 3배 — 플레이테스트 후 재조정 필요. (2) 소 사료 적자(당근 10개 13,300G > 우유 6,500G), 마릿수만큼 커짐 — 사용자 결정 대기(우유값 인상 / 사료량 축소 / 보류). (3) 묘목·황금옥수수가 길드 일일 퀘스트 대상이 될 수 있음(기존 원재료 규칙과 동일, 변경 안 함). (4) 제외 항목: 석탄·주괴 레시피 개편, 낚시 꽝 확률, 후반 편의 기능.
- Caution: 이름 기반 `preview_start`는 저장소 루트(옛 브랜치)를 띄운다 — 워크트리에서 `npm run dev -- --port <포트> --strictPort`로 직접 띄워 URL로 붙일 것.
- Exact next action: **none pending — awaiting explicit user direction.** 소 사료 적자 처리 방식 결정, 또는 다음 작업(업적·도감, 편의 기능, 밸런스 플레이테스트 등) 지시 필요.
