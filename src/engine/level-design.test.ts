import { describe, expect, it } from 'vitest';
import { begin, buyResource, duration, eat, facilityGateMet, generateDailyQuests, harvestOutput, plant, unlockedGame } from './model';
import { saplingOf } from '../content/saplings';
import { FoodDB } from '../content/foods';
import { decodeSave, encodeSave } from './save';
import { ResourceDB, toolTiers } from '../content/resources';
import { facilityRequirement } from '../content/facilities';
import type { SkillId } from '../content/types';

const GRID = [1, 10, 20, 30, 40, 50, 65, 80, 95];
const gathering: SkillId[] = ['logging', 'mining', 'fishing', 'foraging'];
const items = (skill: SkillId) => Object.values(ResourceDB).filter(r => r.skill === skill && !r.dropOnly);

describe('레벨 디자인 격자(D049)', () => {
  it('채집 스킬은 Lv1·10·20·30·40·50·65·80·95마다 새 재료가 열린다(낚시는 Lv50 포함)', () => {
    for (const skill of gathering) {
      const levels = new Set(items(skill).map(r => r.reqLevel));
      for (const level of GRID) expect(levels.has(level), `${skill} Lv${level}`).toBe(true);
    }
  });

  it('채집 스킬의 단계별 최고 초당 경험치는 레벨이 오를수록 커진다', () => {
    for (const skill of gathering) {
      let last = 0;
      for (const level of GRID) {
        const best = Math.max(...items(skill).filter(r => r.reqLevel === level).map(r => r.exp / r.baseDurationMs));
        expect(best, `${skill} Lv${level}`).toBeGreaterThan(last);
        last = best;
      }
    }
  });

  it('Lv65·80·95 재료는 해당 구역 시설 4·6·8단계가 있어야 채집·구매할 수 있다', () => {
    expect(facilityRequirement('logging', 50)).toBeNull();
    expect(facilityRequirement('logging', 65)).toEqual({projectId: 'ruined_sawmill', level: 4});
    expect(facilityRequirement('mining', 80)).toEqual({projectId: 'ruined_forge', level: 6});
    expect(facilityRequirement('fishing', 95)).toEqual({projectId: 'broken_bridge', level: 8});
    const s = unlockedGame(0);
    s.gold = 1e9;
    s.skills.logging.level = 99;
    expect(facilityGateMet(s, 'moon_wood')).toBe(false);
    expect(begin(s, 'moon_wood')).toBe(false);
    expect(buyResource(s, 'moon_wood', 1)).toBe(false);
    s.facilities.ruined_sawmill = 4;
    expect(begin(s, 'moon_wood')).toBe(true);
    expect(begin(s, 'star_wood')).toBe(false);
    expect(buyResource(s, 'moon_wood', 1)).toBe(true);
  });

  it('일일 퀘스트는 시설 조건을 만족하지 못한 재료를 고르지 않는다', () => {
    const s = unlockedGame(0);
    for (const skill of gathering) s.skills[skill].level = 99;
    for (let day = 0; day < 200; day++) {
      for (const quest of generateDailyQuests(s, day)) expect(facilityGateMet(s, quest.resourceId)).toBe(true);
    }
  });

  it('시설 조건이 걸린 작업은 저장·복원되고, 조건을 만족하지 못하면 손상으로 거부한다', () => {
    const s = unlockedGame(0);
    s.skills.logging.level = 99;
    s.skills.woodworking.level = 99;
    s.facilities.ruined_sawmill = 4;
    begin(s, 'moon_wood');
    expect(decodeSave(encodeSave(s)).currentAction).toMatchObject({resourceId: 'moon_wood'});
    const raw = JSON.parse(encodeSave(s));
    delete raw.checksum;
    raw.facilities.ruined_sawmill = 3;
    expect(() => decodeSave(JSON.stringify(raw))).toThrow();
  });

  it('농사 후반 작물·약초(Lv55·70·85)는 수확량이 3이고, Lv70·85는 밭 시설 4·6단계가 있어야 심는다', () => {
    const s = unlockedGame(0);
    s.skills.farming.level = 99;
    s.inventory = {pumpkin: 1, golden_wheat: 1, royal_grape: 1};
    s.farmPlots = [null, null, null];
    expect(plant(s, 'pumpkin')).toBe(true);
    expect(plant(s, 'golden_wheat')).toBe(false);
    s.facilities.abandoned_field = 4;
    expect(plant(s, 'golden_wheat')).toBe(true);
    expect(plant(s, 'royal_grape')).toBe(false);
    s.facilities.abandoned_field = 6;
    expect(plant(s, 'royal_grape')).toBe(true);
    for (const id of ['pumpkin', 'golden_wheat', 'royal_grape', 'moonpetal', 'flame_herb', 'world_leaf']) expect(harvestOutput(id)).toEqual({resourceId: id, count: 3});
    const raw = JSON.parse(encodeSave(s));
    delete raw.checksum;
    raw.facilities.abandoned_field = 3;
    expect(() => decodeSave(JSON.stringify(raw))).toThrow();
  });

  it('새 단계 나무도 묘목이 나오고, 묘목을 심으면 그 원목을 수확한다', () => {
    for (const log of ['pine', 'birch', 'moon_wood', 'star_wood', 'world_branch']) {
      const sapling = saplingOf[log];
      expect(ResourceDB[sapling].skill).toBe('farming');
      expect(harvestOutput(sapling).resourceId).toBe(log);
    }
  });

  it('새 생선 요리 6종은 음식 효과가 있고 먹으면 적용된다', () => {
    const dishes = ['catfish_stew', 'grilled_trout', 'eel_rice', 'sturgeon_soup', 'tuna_steak', 'golden_carp_feast'];
    for (const id of dishes) {
      expect(FoodDB[id], id).toBeDefined();
      const s = unlockedGame(0);
      s.inventory[id] = 1;
      expect(eat(s, id)).toBe(true);
      expect(s.meal).toEqual({foodId: id, remainingMs: FoodDB[id].durationMs});
    }
    const s = unlockedGame(0);
    s.inventory.tuna_steak = 1;
    const before = duration(s, 'wood');
    eat(s, 'tuna_steak');
    expect(duration(s, 'wood')).toBeCloseTo(before * (1 + toolTiers[s.tools.logging].bonus) / (1 + toolTiers[s.tools.logging].bonus + FoodDB.tuna_steak.speedBonus));
  });

  it('도구 단계는 재료 해금 사이에 있고, 보너스는 계속 오르며, 기존 세 단계 보너스는 그대로다', () => {
    expect(toolTiers.map(tier => tier.bonus).slice(0, 4)).toEqual([0, .15, .35, .65]);
    for (let i = 1; i < toolTiers.length; i++) {
      expect(toolTiers[i].level).toBeGreaterThanOrEqual(toolTiers[i - 1].level);
      expect(toolTiers[i].bonus).toBeGreaterThan(toolTiers[i - 1].bonus);
      if (toolTiers[i].level > 1) expect(GRID).not.toContain(toolTiers[i].level);
      for (const id of Object.keys(toolTiers[i].cost)) expect(ResourceDB[id], `${toolTiers[i].name} 재료 ${id}`).toBeDefined();
    }
  });

  it('제작 스킬도 같은 격자마다 새 레시피가 열리고, 상위 레시피는 해당 구역 시설이 필요하다', () => {
    const crafting: SkillId[] = ['blacksmithing', 'woodworking', 'apothecary', 'sewing', 'cooking', 'magic'];
    for (const skill of crafting) {
      const levels = new Set(items(skill).map(r => r.reqLevel));
      for (const level of GRID) expect(levels.has(level), `${skill} Lv${level}`).toBe(true);
      for (const r of items(skill)) for (const id of Object.keys(r.recipe ?? {})) expect(ResourceDB[id], `${r.id} 재료 ${id}`).toBeDefined();
    }
    const s = unlockedGame(0);
    s.skills.blacksmithing.level = 99;
    s.inventory = {lapis: 3, coal: 3};
    expect(begin(s, 'lapis_ingot')).toBe(false);
    s.facilities.ruined_forge = 4;
    expect(begin(s, 'lapis_ingot')).toBe(true);
  });
});
