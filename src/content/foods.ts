import { playable } from './resources';
import type { SkillId } from './types';

export interface FoodDef {
  skills: SkillId[];
  speedBonus: number;
  durationMs: number;
  description: string;
}

// 수치는 플레이테스트용 초안. 낚시 중심 레시피(구운 생선/생선탕/훈제 연어)에
// 농사(밀/감자/당근)·목장(달걀/우유) 산출물을 재료로 쓰는 레시피를 더한 것.
export const FoodDB: Record<string, FoodDef> = {
  grilled_fish: {skills: ['fishing'], speedBonus: .1, durationMs: 600_000, description: '낚시 속도 +10%'},
  fish_soup: {skills: ['logging', 'mining', 'fishing'], speedBonus: .05, durationMs: 900_000, description: '벌목·채광·낚시 속도 +5%'},
  smoked_salmon: {skills: ['blacksmithing'], speedBonus: .15, durationMs: 900_000, description: '대장작업 속도 +15%'},
  vegetable_porridge: {skills: playable, speedBonus: .05, durationMs: 900_000, description: '전 스킬 속도 +5%'},
  lumberjack_lunchbox: {skills: ['logging'], speedBonus: .15, durationMs: 900_000, description: '벌목 속도 +15%'},
  miners_stew: {skills: ['mining'], speedBonus: .15, durationMs: 900_000, description: '채광 속도 +15%'},
  blacksmith_meal: {skills: ['blacksmithing'], speedBonus: .15, durationMs: 900_000, description: '대장작업 속도 +15%'},
  festival_dish: {skills: playable, speedBonus: .1, durationMs: 1_200_000, description: '전 스킬 속도 +10%'},
};
