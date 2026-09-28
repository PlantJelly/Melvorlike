// 밭 확장과 자동 파종/수확(game_design §2.7 "업그레이드로 자동 파종/수확 해금").
// 시설 부품은 목공 산출물로 받는다(content_spec §10 "목공 → 시설 부품"). 수치는 플레이테스트 전 임시값.

export interface FarmUpgrade {
  reqLevel: number;
  goldCost: number;
  cost: Record<string, number>;
}

// 인덱스 i는 (i + 2)번째 밭을 여는 비용이다. 처음 1칸은 기본 제공.
export const plotUpgrades: FarmUpgrade[] = [
  {reqLevel: 15, goldCost: 5000, cost: {plank: 20}},
  {reqLevel: 35, goldCost: 25000, cost: {oak_plank: 20}},
];

export const MAX_FARM_PLOTS = 1 + plotUpgrades.length;

// 다 자란 작물을 자동으로 거두고, 같은 씨앗(묘목)이 있으면 곧바로 다시 심는다.
export const farmAutomation: FarmUpgrade = {reqLevel: 25, goldCost: 15000, cost: {oak_plank: 30}};
