// 비료 3종(content_spec §4, game_design §2.7): 골드로 사는 소모품. 파종할 때 한 칸에 하나를 쓰고,
// 그 칸의 작물이 수확될 때까지 효과가 유지된다. 확률 효과는 CHANCE_SCALE 누적으로 지급한다(D034).
// 수치는 플레이테스트 전 임시값. 가격은 작물 판매가 재조정(D047)과 같은 배율(0.1)로 낮췄다.
export type FertilizerId = 'speed' | 'bumper' | 'recovery';

export interface FertilizerDef {
  name: string;
  icon: string;
  goldCost: number;
  description: string;
  speedBonus?: number;
  // 만분율 확률
  doubleChance?: number;
  seedReturnChance?: number;
}

export const FertilizerDB: Record<FertilizerId, FertilizerDef> = {
  speed: {name: '속성비료', icon: '⚡', goldCost: 20, speedBonus: .25, description: '성장 속도 +25%'},
  bumper: {name: '배양비료', icon: '🌾', goldCost: 30, doubleChance: 2500, description: '수확량 2배 확률 25%'},
  recovery: {name: '회수비료', icon: '♻️', goldCost: 15, seedReturnChance: 5000, description: '씨앗(묘목)을 소모하지 않을 확률 50%'},
};

export const fertilizerIds = Object.keys(FertilizerDB) as FertilizerId[];
