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
  // 승급 시 조제 산출물인 염료로 새 재질을 채색한다.
  {name: '구리', reqLevel: 10, goldCost: 2000, cost: {copper_ingot: 5, dye: 2}, maxRarity: 2},
  {name: '철', reqLevel: 30, goldCost: 8000, cost: {iron_ingot: 5, dye: 5}, maxRarity: 3},
  {name: '금', reqLevel: 50, goldCost: 30000, cost: {gold_ingot: 5, dye: 10}, maxRarity: 4},
  // 후반 재질(D054): 레벨 격자의 Lv65·80·95 단계 주괴와 조제·재봉 후반 제작품을 쓰고, 재질마다 등급 상한이 한 칸씩 오른다.
  {name: '청금', reqLevel: 65, goldCost: 100000, cost: {lapis_ingot: 5, moss_essence: 5}, maxRarity: 5},
  {name: '별철', reqLevel: 80, goldCost: 300000, cost: {star_ingot: 5, silk_cloth: 5}, maxRarity: 6},
  {name: '태양', reqLevel: 95, goldCost: 1000000, cost: {sun_ingot: 5, fairy_elixir: 5}, maxRarity: 7},
];

export const rarityNames = ['하급', '중급', '상급', '영웅', '전설', '신화', '고대', '태초'] as const;

export const accessoryOptions: Record<AccessoryOptionId, {
  name: string;
  description: string;
  values: readonly number[];
}> = {
  // 신화·고대·태초(D054)는 전설 위로 완만하게 늘린다 — 신속·지혜를 모두 최고로 맞춰도 전체 진행이 약 10% 빨라지는 정도.
  speed: {name: '신속', description: '전 스킬 작업 속도', values: [.02, .04, .06, .09, .12, .14, .16, .18]},
  experience: {name: '지혜', description: '전 스킬 경험치 획득량', values: [.03, .06, .09, .13, .18, .21, .24, .27]},
  sale: {name: '흥정', description: '아이템 판매가', values: [.05, .10, .15, .22, .30, .35, .40, .45]},
};

export const accessoryOptionIds = Object.keys(accessoryOptions) as AccessoryOptionId[];

// content_spec.md §7 확률표. 장신구 상한을 넘는 열은 리롤 풀에서 제외한 뒤 남은 가중치를 재정규화한다.
export const enchantmentStones: {
  resourceId: string;
  tier: number;
  weights: readonly number[];
}[] = [
  {resourceId: 'enchant_stone_stone', tier: 0, weights: [70, 30, 0, 0, 0, 0, 0, 0]},
  {resourceId: 'enchant_stone_copper', tier: 1, weights: [40, 35, 25, 0, 0, 0, 0, 0]},
  {resourceId: 'enchant_stone_iron', tier: 2, weights: [25, 25, 25, 25, 0, 0, 0, 0]},
  {resourceId: 'enchant_stone_gold', tier: 3, weights: [15, 20, 25, 25, 15, 0, 0, 0]},
  // 후반 부여석(D054): 최상위 등급은 10% 이하로 두어, 원하는 옵션을 최고 등급으로 맞추는 것이 후반 내내 이어지는 목표가 되게 한다.
  {resourceId: 'enchant_stone_lapis', tier: 4, weights: [10, 15, 20, 25, 20, 10, 0, 0]},
  {resourceId: 'enchant_stone_star', tier: 5, weights: [5, 10, 15, 20, 20, 20, 10, 0]},
  {resourceId: 'enchant_stone_sun', tier: 6, weights: [5, 10, 15, 20, 20, 15, 10, 5]},
];

export const enchantmentStoneByResource = Object.fromEntries(
  enchantmentStones.map(stone => [stone.resourceId, stone]),
) as Record<string, (typeof enchantmentStones)[number]>;

export function emptyAccessories(): Record<AccessorySlotId, AccessoryState | null> {
  return {crown: null, necklace: null, ring: null};
}
