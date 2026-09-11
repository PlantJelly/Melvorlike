# 8차 마일스톤 작업 목록

- `[x]` 1. 수식 점근선(Asymptotic) 캡 적용
  - `[x]` `getDurationMultiplier` 공식을 `1 / (1 + 속도증가량)`으로 변경
  - `[x]` `startAction` 및 `finishAction`에서 최종 소요 시간 최소값을 100ms(0.1초)로 하드캡 설정
  - `[x]` `opt_save_mat`, `opt_double`, `opt_cashback`, `opt_sub_res` 확률을 `Math.min(100, val)`로 최대 100% 제한
- `[x]` 2. 영지 건물 비용 및 표기 수정
  - `[x]` `BuildingDB`에 `costItem` 및 `baseCostAmt` 추가
  - `[x]` 업그레이드 시 골드 + 아이템 동시 요구 로직 적용
  - `[x]` UI 표기를 "작업 시간 -X%"에서 "작업 속도 +X% 상승"으로 변경
- `[x]` 3. 길드 상점 및 장비 선택 UI 개선
  - `[x]` 길드 상점 특가 상품을 구매 7줄, 판매 7줄로 완전히 분리 렌더링
  - `[x]` 확정 승급 선택 드롭다운에 "옵션 이름 - 상세 수명 (Lv.1 수치)" 표기 적용
