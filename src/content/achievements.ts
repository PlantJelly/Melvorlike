// 업적(content_spec §9): 모든 업적은 실제 효과를 준다. 달성 여부는 기존 상태(스킬 레벨, 누적 골드,
// 첫 전설 리롤 여부)에서 계산하므로 업적 목록 자체는 저장하지 않는다. 수치는 플레이테스트 전 임시값.

// 성장형: 스킬마다 이 레벨에 도달할 때마다 그 스킬 산출물 판매가 +2%(Lv99에서 +10%).
export const growthLevels = [10, 30, 50, 70, 99] as const;
export const GROWTH_SALE_BONUS = 0.02;

// 경제형: 누적 획득 골드가 이 값을 넘을 때마다 길드 환전 배율 +0.05(최대 1.5 → 1.65). 기준은 후반 수입(시간당
// 수만 G)에 맞춰 며칠~두 달 간격으로 하나씩 오도록 정했다(D051, 시뮬레이션 상시 3·11·69일).
export const economyThresholds = [1_000_000, 10_000_000, 100_000_000] as const;
export const ECONOMY_EXCHANGE_BONUS = 0.05;

// 제작형: 장신구 리롤에서 처음으로 전설 이상(신화·고대·태초 포함, D054) 희귀도를 얻으면 마법부여석 제작에 드는 농사 약초가 1개 줄어든다(최소 1).
export const LEGENDARY_RARITY = 4;
