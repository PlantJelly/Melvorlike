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
export const AnimalDB: Record<string, AnimalDef> = {
  chicken: {id: 'chicken', name: '닭', buyGold: 500, feedId: 'wheat', feedAmount: 5, productId: 'egg', icon: '🐔'},
  sheep: {id: 'sheep', name: '양', buyGold: 2000, feedId: 'wheat', feedAmount: 10, productId: 'wool', icon: '🐑'},
  cow: {id: 'cow', name: '소', buyGold: 5000, feedId: 'carrot', feedAmount: 10, productId: 'milk', icon: '🐄'},
};
