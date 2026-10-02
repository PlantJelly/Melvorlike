import { playable } from './resources';
import type { SkillId } from './types';

export interface FoodDef {
  skills: SkillId[];
  speedBonus: number;
  expBonus?: number;
  durationMs: number;
  description: string;
}

// 수치는 플레이테스트용 초안. 낚시 중심 레시피(구운 생선/생선탕/훈제 연어)에
// 농사(밀/감자/당근)·목장(달걀/우유) 산출물을 재료로 쓰는 레시피를 더한 것.
export const FoodDB: Record<string, FoodDef> = {
  grilled_fish: {skills: ['fishing'], speedBonus: .1, durationMs: 600_000, description: '낚시 속도 +10%'},
  fish_soup: {skills: ['logging', 'mining', 'fishing'], speedBonus: .05, durationMs: 900_000, description: '벌목·채광·낚시 속도 +5%'},
  smoked_salmon: {skills: ['blacksmithing'], speedBonus: .15, durationMs: 900_000, description: '대장작업 속도 +15%'},
  steamed_egg: {skills: [...playable], speedBonus: 0, expBonus: .1, durationMs: 600_000, description: '전 스킬 경험치 +10%'},
  field_ration: {skills: [...playable], speedBonus: .05, durationMs: 3_600_000, description: '전 스킬 속도 +5%'},
  vegetable_porridge: {skills: [...playable], speedBonus: .05, durationMs: 900_000, description: '전 스킬 속도 +5%'},
  lumberjack_lunchbox: {skills: ['logging'], speedBonus: .15, durationMs: 900_000, description: '벌목 속도 +15%'},
  miners_stew: {skills: ['mining'], speedBonus: .15, durationMs: 900_000, description: '채광 속도 +15%'},
  blacksmith_meal: {skills: ['blacksmithing'], speedBonus: .15, durationMs: 900_000, description: '대장작업 속도 +15%'},
  festival_dish: {skills: [...playable], speedBonus: .1, durationMs: 1_200_000, description: '전 스킬 속도 +10%'},
  // 레벨 격자 생선 요리(D049·D050): 상위 단계일수록 대상이 넓거나 오래 간다. 수치는 플레이테스트 전 임시값.
  catfish_stew: {skills: ['mining', 'blacksmithing'], speedBonus: .1, durationMs: 900_000, description: '채광·대장작업 속도 +10%'},
  grilled_trout: {skills: ['fishing'], speedBonus: .2, durationMs: 900_000, description: '낚시 속도 +20%'},
  eel_rice: {skills: [...playable], speedBonus: 0, expBonus: .12, durationMs: 1_200_000, description: '전 스킬 경험치 +12%'},
  sturgeon_soup: {skills: ['woodworking', 'apothecary', 'sewing'], speedBonus: .15, durationMs: 1_800_000, description: '목공·조제·재봉 속도 +15%'},
  tuna_steak: {skills: ['logging', 'mining', 'fishing', 'foraging'], speedBonus: .15, durationMs: 1_800_000, description: '벌목·채광·낚시·채집 속도 +15%'},
  golden_carp_feast: {skills: [...playable], speedBonus: .12, durationMs: 3_600_000, description: '전 스킬 속도 +12%'},
  marlin_grill: {skills: ['blacksmithing', 'cooking', 'magic', 'woodworking', 'apothecary', 'sewing'], speedBonus: .15, durationMs: 2_700_000, description: '제작 6종 속도 +15%'},
};
