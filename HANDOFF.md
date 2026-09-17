# Current handoff

- Current goal: implemented "전체 생산망 밸런스 조정" 2단계 — 요리/마법부여석/재봉 완제품의 판매가를 원재료 원가에 맞춰 재조정(사용자 명시 요청, 1단계가 범위 밖에 남겨뒀던 항목 중 하나).
- Branch: `fix/crafted-goods-pricing`, created from `origin/main` at `ece1f6d` (2026-09-17).
- Checkpoint type: Stable. Implementation complete and verified; not yet reviewed or merged.
- Implemented: `src/content/resources.ts`의 13개 가공품 `sell`만 변경 — `enchant_stone_stone/copper/iron/gold`, `wool_garment/trimmed_garment/reinforced_garment/enchanted_garment`, `vegetable_porridge/lumberjack_lunchbox/miners_stew/blacksmith_meal/festival_dish`. 레시피 재료·`reqLevel`·`baseDurationMs`·`exp`는 전혀 손대지 않았다. 마법부여석·재봉은 목공/조제와 같은 reqLevel 티어 구조(1/10/30/50)의 기존 판매가/원가 비율(2.0/1.8/1.2308/0.8642배)을 재사용했고, 요리는 자신의 미변경 라인(구운 생선 등)에서 나온 비율을 reqLevel에 선형 보간해 적용했다. 상세 근거·수치·방법론은 DECISIONS.md D033.
- Verification: `npm test` 142/142 PASS(사전 grep으로 이 13개 자원의 `sell`/`buy`를 하드코딩 단언하는 테스트가 전무함을 확인 — 수정 불필요), `npm run build` PASS. 브라우저 QA: 워크트리 전용 dev 서버(포트 5220, 아래 caution 참고)에서 요리/마법/재봉 Lv30 해금 후 `vegetable_porridge`/`enchant_stone_copper`/`trimmed_garment`를 제작→판매해, 획득 골드(91,194G)가 새 판매가 3종의 정확한 합과 엔진 결과·실제 게임 골드 양쪽에서 일치함을 확인. 콘솔 오류 없음.
- Docs updated: DECISIONS.md D033 추가, PROGRESS.md에 "전체 생산망 밸런스 조정 2단계" 섹션 추가, docs/implementation_status.md 캐비엇/미구현 목록 갱신(완제품 판매가 정합성 완료로 이동).
- Known risks: 없음. 범위 밖으로 남긴 것(이번에도): 골드 경제 전반(도구/길드 승급/장신구 비용 대비 전체 획득 속도) — 사용자 별도 지시 대기.
- Caution (신규 발견, 이 세션): `preview_start`의 이름 기반(`launch.json`) 서버는 현재 워크트리가 아니라 항상 저장소 루트(낡은 브랜치, 저장 v3)에서 실행된다. 워크트리 기반 브라우저 QA는 해당 워크트리 안에서 `npm run dev -- --port <다른 포트>`를 직접 실행한 뒤 `preview_start`/`navigate`를 `url`로 그 포트에 붙여야 한다.
- Exact next action: 사용자가 "리뷰하고 문제없으면 머지해줘"를 지시하면 독립 리뷰(PASS/FAIL/BLOCKED) 후 명시적 병합 게이트를 전부 확인하고 병합 진행. 그 전까지는 main에 반영하지 않는다.
