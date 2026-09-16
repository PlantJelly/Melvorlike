// 상위 티어 원재료를 하위 티어로 환전한다. targetId는 항상 해당 스킬의 최하위(Lv1) 원재료이고,
// tierGap은 그 스킬 안에서 몇 단계 위인지를 나타낸다(환전 비율·길드 등급별 허용 깊이의 기준).
export interface ExchangeDef { targetId: string; tierGap: number }
export const ExchangeDB: Record<string, ExchangeDef> = {
  oak: {targetId: 'wood', tierGap: 1},
  hardwood: {targetId: 'wood', tierGap: 2},
  magic_wood: {targetId: 'wood', tierGap: 3},
  iron: {targetId: 'stone', tierGap: 1},
  gold_ore: {targetId: 'stone', tierGap: 2},
  fish_carp: {targetId: 'fish_small', tierGap: 1},
  fish_salmon: {targetId: 'fish_small', tierGap: 2},
  wild_mushroom: {targetId: 'wild_berry', tierGap: 1},
  wild_herb: {targetId: 'wild_berry', tierGap: 2},
  rare_mushroom: {targetId: 'wild_berry', tierGap: 3},
};
// 환전 시 1개당 받는 수량 = tierGap 단계마다 이 배율씩 복리 적용(내림).
export const exchangeRate = 1.5;

// 길드 등급이 오를수록 더 깊은 티어 차이까지 환전할 수 있다(등급 인덱스 + 1 = 허용 tierGap).
export const guildTiers: {name: string; goldCost: number}[] = [
  {name: '초급 길드', goldCost: 0},
  {name: '중급 길드', goldCost: 3000},
  {name: '상급 길드', goldCost: 15000},
];

export type MilestoneId =
  | 'first_gather'
  | 'any_skill_10'
  | 'first_tool'
  | 'first_meal'
  | 'first_animal'
  | 'first_harvest'
  | 'first_exchange'
  | 'any_skill_50'
  | 'first_enchantment_stone';

export interface MilestoneDef {
  id: MilestoneId;
  name: string;
  description: string;
  reward: number;
  icon: string;
}

// 기획서의 온보딩 순서를 유지한다. 보상 골드는 플레이테스트 전 임시값이며,
// 미구현·미승인 시스템인 도감(정착민) 첫 등록 목표는 포함하지 않는다.
export const milestones: readonly MilestoneDef[] = [
  {id: 'first_gather', name: '왕국의 첫 자원', description: '벌목·채광·낚시 중 하나를 처음 완료하세요.', reward: 100, icon: '🧺'},
  {id: 'any_skill_10', name: '숙련의 시작', description: '아무 스킬이나 Lv.10을 달성하세요.', reward: 500, icon: '📈'},
  {id: 'first_tool', name: '첫 장비 제작', description: '아무 스킬의 돌 도구를 처음 제작하세요.', reward: 250, icon: '🛠️'},
  {id: 'first_meal', name: '첫 요리', description: '요리를 처음 완성하세요.', reward: 250, icon: '🍲'},
  {id: 'first_animal', name: '첫 입주 동물', description: '목장에 동물을 처음 입주시키세요.', reward: 500, icon: '🐣'},
  {id: 'first_harvest', name: '첫 수확', description: '농작물을 처음 수확하세요.', reward: 500, icon: '🌾'},
  {id: 'first_exchange', name: '첫 환전', description: '길드 환전소를 처음 이용하세요.', reward: 500, icon: '🔄'},
  {id: 'any_skill_50', name: '왕국의 전문가', description: '아무 스킬이나 Lv.50을 달성하세요.', reward: 5000, icon: '🏅'},
  {id: 'first_enchantment_stone', name: '마법의 시작', description: '마법부여석을 처음 제작하세요.', reward: 1000, icon: '🔮'},
];

export const milestoneIds = milestones.map(milestone => milestone.id);
export const milestoneById = Object.fromEntries(milestones.map(milestone => [milestone.id, milestone])) as Record<MilestoneId, MilestoneDef>;
