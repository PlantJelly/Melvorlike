export type AccessorySlotId = 'crown' | 'necklace' | 'ring';
export type AccessoryOptionId = 'speed' | 'experience' | 'sale';

export interface AccessoryState {
  tier: number;
  optionId: AccessoryOptionId | null;
  rarity: number | null;
}

export const accessorySlots: {id: AccessorySlotId; name: string; icon: string}[] = [
  {id: 'crown', name: '개척자의 왕관', icon: '👑'},
  {id: 'necklace', name: '장인의 목걸이', icon: '📿'},
  {id: 'ring', name: '풍요의 반지', icon: '💍'},
];

// 정확한 비용은 플레이테스트 전 임시값이다. 모든 슬롯은 같은 승급 비용표를 사용한다.
export const accessoryTiers: {
  name: string;
  reqLevel: number;
  goldCost: number;
  cost: Record<string, number>;
  maxRarity: number;
}[] = [
  {name: '스톤', reqLevel: 1, goldCost: 500, cost: {brick: 5}, maxRarity: 1},
  {name: '구리', reqLevel: 10, goldCost: 2000, cost: {copper_ingot: 5}, maxRarity: 2},
  {name: '철', reqLevel: 30, goldCost: 8000, cost: {iron_ingot: 5}, maxRarity: 3},
  {name: '금', reqLevel: 50, goldCost: 30000, cost: {gold_ingot: 5}, maxRarity: 4},
];

export const rarityNames = ['하급', '중급', '상급', '영웅', '전설'] as const;

export const accessoryOptions: Record<AccessoryOptionId, {
  name: string;
  description: string;
  values: readonly number[];
}> = {
  speed: {name: '신속', description: '전 스킬 작업 속도', values: [.02, .04, .06, .09, .12]},
  experience: {name: '지혜', description: '전 스킬 경험치 획득량', values: [.03, .06, .09, .13, .18]},
  sale: {name: '흥정', description: '아이템 판매가', values: [.05, .10, .15, .22, .30]},
};

export const accessoryOptionIds = Object.keys(accessoryOptions) as AccessoryOptionId[];

// content_spec.md §7 확률표. 장신구 상한을 넘는 열은 리롤 풀에서 제외한 뒤 남은 가중치를 재정규화한다.
export const enchantmentStones: {
  resourceId: string;
  tier: number;
  weights: readonly number[];
}[] = [
  {resourceId: 'enchant_stone_stone', tier: 0, weights: [70, 30, 0, 0, 0]},
  {resourceId: 'enchant_stone_copper', tier: 1, weights: [40, 35, 25, 0, 0]},
  {resourceId: 'enchant_stone_iron', tier: 2, weights: [25, 25, 25, 25, 0]},
  {resourceId: 'enchant_stone_gold', tier: 3, weights: [15, 20, 25, 25, 15]},
];

export const enchantmentStoneByResource = Object.fromEntries(
  enchantmentStones.map(stone => [stone.resourceId, stone]),
) as Record<string, (typeof enchantmentStones)[number]>;

export function emptyAccessories(): Record<AccessorySlotId, AccessoryState | null> {
  return {crown: null, necklace: null, ring: null};
}
