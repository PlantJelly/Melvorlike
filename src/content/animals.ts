export interface AnimalDef {
  id: string;
  name: string;
  buyGold: number;
  feedId: string;
  feedAmount: number;
  productId: string;
  icon: string;
}

// 사육 주기/해금 레벨/경험치/판매가는 productId가 가리키는 ResourceDB 항목(예: egg)에 있다 —
// 농사 작물이 baseDurationMs를 성장 시간으로 재사용하는 것과 같은 패턴.
// 사료량은 산출물 판매가가 사료 원가보다 높고, 비싼 동물일수록 시간당 순이익이 크도록 정한다(D043).
export const AnimalDB: Record<string, AnimalDef> = {
  chicken: {id: 'chicken', name: '닭', buyGold: 500, feedId: 'wheat', feedAmount: 5, productId: 'egg', icon: '🐔'},
  sheep: {id: 'sheep', name: '양', buyGold: 2000, feedId: 'wheat', feedAmount: 10, productId: 'wool', icon: '🐑'},
  cow: {id: 'cow', name: '소', buyGold: 5000, feedId: 'carrot', feedAmount: 2, productId: 'milk', icon: '🐄'},
  // 후반 동물(D050): 시간당 순이익이 구매가 순으로 커지도록 사료를 정했다(D043 조건 유지).
  goat: {id: 'goat', name: '염소', buyGold: 10000, feedId: 'potato', feedAmount: 4, productId: 'goat_milk', icon: '🐐'},
  alpaca: {id: 'alpaca', name: '알파카', buyGold: 20000, feedId: 'potato', feedAmount: 4, productId: 'alpaca_wool', icon: '🦙'},
  bee: {id: 'bee', name: '꿀벌', buyGold: 40000, feedId: 'carrot', feedAmount: 2, productId: 'honey', icon: '🐝'},
  golden_goose: {id: 'golden_goose', name: '황금 거위', buyGold: 80000, feedId: 'carrot', feedAmount: 2, productId: 'golden_egg', icon: '🪿'},
};

// 축사 강화(content_spec §3 "목장 레벨업 시 최대 사육 마릿수 증가, 건물처럼 골드+재료 강화").
// 인덱스 i는 동물종당 최대 사육 수를 (i + 2)마리로 늘리는 비용. 수치는 플레이테스트 전 임시값.
export const barnUpgrades: {reqLevel: number; goldCost: number; cost: Record<string, number>}[] = [
  {reqLevel: 15, goldCost: 8000, cost: {plank: 30, rope: 5}},
  {reqLevel: 35, goldCost: 30000, cost: {oak_plank: 30, cloth: 5}},
];

export const MAX_ANIMALS_PER_SPECIES = 1 + barnUpgrades.length;
