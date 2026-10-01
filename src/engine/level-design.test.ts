import { describe, expect, it } from 'vitest';
import { begin, buyResource, facilityGateMet, generateDailyQuests, unlockedGame } from './model';
import { decodeSave, encodeSave } from './save';
import { ResourceDB } from '../content/resources';
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
