// 상위 티어 원재료를 하위 티어로 환전한다. targetId는 항상 해당 스킬의 최하위(Lv1) 원재료이고,
// tierGap은 그 스킬 안에서 몇 단계 위인지를 나타낸다(환전 비율·길드 등급별 허용 깊이의 기준).
export interface ExchangeDef { targetId: string; tierGap: number }
export const ExchangeDB: Record<string, ExchangeDef> = {
  oak: {targetId: 'wood', tierGap: 1},
  hardwood: {targetId: 'wood', tierGap: 2},
  magic_wood: {targetId: 'wood', tierGap: 3},
  iron: {targetId: 'stone', tierGap: 1},
  fish_carp: {targetId: 'fish_small', tierGap: 1},
  fish_salmon: {targetId: 'fish_small', tierGap: 2},
};
// 환전 시 1개당 받는 수량 = tierGap 단계마다 이 배율씩 복리 적용(내림).
export const exchangeRate = 1.5;

// 길드 등급이 오를수록 더 깊은 티어 차이까지 환전할 수 있다(등급 인덱스 + 1 = 허용 tierGap).
export const guildTiers: {name: string; goldCost: number}[] = [
  {name: '초급 길드', goldCost: 0},
  {name: '중급 길드', goldCost: 3000},
  {name: '상급 길드', goldCost: 15000},
];
