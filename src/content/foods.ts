import type { SkillId } from './types';

export interface FoodDef {
  skills: SkillId[];
  speedBonus: number;
  durationMs: number;
  description: string;
}

// 농사 작물/목장 산출물을 아직 요리에 연결하지 않은 생선 중심 레시피. 수치는 플레이테스트용 초안.
export const FoodDB: Record<string, FoodDef> = {
  grilled_fish: {skills: ['fishing'], speedBonus: .1, durationMs: 600_000, description: '낚시 속도 +10%'},
  fish_soup: {skills: ['logging', 'mining', 'fishing'], speedBonus: .05, durationMs: 900_000, description: '벌목·채광·낚시 속도 +5%'},
  smoked_salmon: {skills: ['blacksmithing'], speedBonus: .15, durationMs: 900_000, description: '대장작업 속도 +15%'},
};
