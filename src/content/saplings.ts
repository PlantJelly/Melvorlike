// 나무묘목(game_design §2.1, content_spec §4): 벌목 중 확률적으로 그 나무의 묘목을 얻고,
// 밭에 심으면 같은 티어 원목을 대량으로 수확한다(벌목↔농사 순환). 묘목은 수확 시 돌려받지 않는다.

// 벌목 산출 1회당 묘목 확률(만분율). 수치는 플레이테스트 전 임시값.
export const SAPLING_CHANCE = 200;

export const saplingOf: Record<string, string> = {
  wood: 'sapling_wood',
  oak: 'sapling_oak',
  hardwood: 'sapling_hardwood',
  magic_wood: 'sapling_magic',
  pine: 'sapling_pine',
  birch: 'sapling_birch',
  moon_wood: 'sapling_moon',
  star_wood: 'sapling_star',
  world_branch: 'sapling_world',
};

// 수확량은 같은 티어 약초씨 수확물(3개)의 판매가와 원목 총 판매가가 같아지도록 정했다.
export const saplingHarvest: Record<string, {resourceId: string; count: number}> = {
  sapling_wood: {resourceId: 'wood', count: 300},
  sapling_oak: {resourceId: 'oak', count: 440},
  sapling_hardwood: {resourceId: 'hardwood', count: 355},
  sapling_magic: {resourceId: 'magic_wood', count: 237},
  sapling_pine: {resourceId: 'pine', count: 71},
  sapling_birch: {resourceId: 'birch', count: 47},
  sapling_moon: {resourceId: 'moon_wood', count: 25},
  sapling_star: {resourceId: 'star_wood', count: 26},
  sapling_world: {resourceId: 'world_branch', count: 27},
};
