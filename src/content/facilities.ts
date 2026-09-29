import type { ProjectId } from './projects';
import type { SkillId } from './types';

// 왕국 시설 강화(D048): 복원한 구역을 골드+재료로 단계별 강화하면 그 구역의 스킬 속도가 오른다.
// 비용은 content_spec §1 "기존 건물 강화 공식"(legacy 영지 건물)을 12단계에 맞춰 쓴다 —
// 골드 = baseGold × 1.3^현재단계, 재료 = 그 시설 산출물 라인에서 3단계마다 한 티어씩 올라가며
// 수량 = baseAmount × 1.5^(현재단계 % 3). 단계 n으로 올리려면 첫 번째 스킬이 Lv(8n) 이상이어야 한다.
// 수치는 플레이테스트 전 임시값.
export const FACILITY_MAX_LEVEL = 12;
export const FACILITY_SPEED_PER_LEVEL = .03;
export const FACILITY_LEVEL_STEP = 8;
export const FACILITY_BASE_GOLD = 60_000;
export const FACILITY_BASE_AMOUNT = 20;

export interface FacilityDef {
  // 속도 보너스를 받는 스킬. 첫 번째 스킬의 레벨로 강화 단계를 제한한다.
  skills: SkillId[];
  // 재료 티어(현재 단계 0~2 / 3~5 / 6~8 / 9~11).
  tiers: readonly [string, string, string, string];
}

// 길드 회관은 스킬을 열지 않아 강화 대상이 아니다. 벌목·채광은 시작 스킬이라 구역이 없어,
// 그 산출물을 가공하는 제재소·대장간이 함께 올린다.
export const FacilityDB: Partial<Record<ProjectId, FacilityDef>> = {
  ruined_forge: {skills: ['blacksmithing', 'mining'], tiers: ['brick', 'copper_ingot', 'iron_ingot', 'gold_ingot']},
  broken_bridge: {skills: ['fishing'], tiers: ['fish_small', 'fish_carp', 'fish_salmon', 'fish_salmon']},
  ruined_restaurant: {skills: ['cooking'], tiers: ['grilled_fish', 'fish_soup', 'smoked_salmon', 'festival_dish']},
  abandoned_field: {skills: ['farming'], tiers: ['wheat', 'potato', 'carrot', 'golden_corn']},
  worn_out_barn: {skills: ['ranching'], tiers: ['egg', 'wool', 'milk', 'milk']},
  fallen_tower: {skills: ['magic'], tiers: ['enchant_stone_stone', 'enchant_stone_copper', 'enchant_stone_iron', 'enchant_stone_gold']},
  overgrown_trail: {skills: ['foraging'], tiers: ['wild_berry', 'wild_mushroom', 'wild_herb', 'rare_mushroom']},
  ruined_sawmill: {skills: ['woodworking', 'logging'], tiers: ['plank', 'oak_plank', 'hardwood_beam', 'magic_frame']},
  ruined_apothecary: {skills: ['apothecary'], tiers: ['berry_tonic', 'mushroom_balm', 'herb_elixir', 'rare_remedy']},
  ruined_tailor: {skills: ['sewing'], tiers: ['rope', 'cloth', 'reinforced_garment', 'enchanted_garment']},
};

export const facilityIds = Object.keys(FacilityDB) as ProjectId[];

// 현재 단계(level)에서 다음 단계로 올리는 비용.
export function facilityCost(id: ProjectId, level: number) {
  const def = FacilityDB[id]!;
  const item = def.tiers[Math.min(3, Math.floor(level / 3))];
  return {
    level: level + 1,
    reqLevel: FACILITY_LEVEL_STEP * (level + 1),
    goldCost: Math.floor(FACILITY_BASE_GOLD * Math.pow(1.3, level)),
    cost: {[item]: Math.floor(FACILITY_BASE_AMOUNT * Math.pow(1.5, level % 3))},
  };
}
