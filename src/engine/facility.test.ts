import { describe, expect, it } from 'vitest';
import { SAVE_VERSION, duration, facilityBonus, initial, nextFacilityUpgrade, unlockedGame, upgradeFacility, type Model } from './model';
import { decodeSave, encodeSave } from './save';
import { FACILITY_BASE_AMOUNT, FACILITY_BASE_GOLD, FACILITY_MAX_LEVEL, FACILITY_SPEED_PER_LEVEL, FacilityDB, facilityCost } from '../content/facilities';
import { ResourceDB } from '../content/resources';

function stocked(): Model {
  const s = unlockedGame(0);
  s.gold = 1e9;
  s.skills.blacksmithing.level = 99;
  for (const item of FacilityDB.ruined_forge!.tiers) s.inventory[item] = 1e6;
  return s;
}

describe('왕국 시설 강화', () => {
  it('비용은 단계마다 골드 ×1.3, 재료는 3단계마다 한 티어 위로 ×1.5씩 오른다', () => {
    expect(facilityCost('ruined_forge', 0)).toEqual({level: 1, reqLevel: 8, goldCost: FACILITY_BASE_GOLD, cost: {brick: FACILITY_BASE_AMOUNT}});
    expect(facilityCost('ruined_forge', 2).cost).toEqual({brick: 45});
    expect(facilityCost('ruined_forge', 3).cost).toEqual({copper_ingot: 20});
    expect(facilityCost('ruined_forge', 11)).toMatchObject({level: 12, reqLevel: 96, goldCost: Math.floor(FACILITY_BASE_GOLD * 1.3 ** 11), cost: {gold_ingot: 45}});
  });

  it('강화하면 골드·재료를 쓰고 그 시설의 모든 스킬 속도가 오른다', () => {
    const s = stocked();
    const before = duration(s, 'stone');
    expect(upgradeFacility(s, 'ruined_forge')).toBe(true);
    expect(s.facilities.ruined_forge).toBe(1);
    expect(s.gold).toBe(1e9 - FACILITY_BASE_GOLD);
    expect(s.inventory.brick).toBe(1e6 - FACILITY_BASE_AMOUNT);
    expect(facilityBonus(s, 'blacksmithing')).toBeCloseTo(FACILITY_SPEED_PER_LEVEL);
    expect(facilityBonus(s, 'mining')).toBeCloseTo(FACILITY_SPEED_PER_LEVEL);
    expect(facilityBonus(s, 'logging')).toBe(0);
    expect(duration(s, 'stone')).toBeCloseTo(before / (1 + FACILITY_SPEED_PER_LEVEL));
  });

  it('스킬 레벨·골드·재료가 모자라거나 최대 단계면 강화하지 않는다', () => {
    const s = stocked();
    s.skills.blacksmithing.level = 7;
    expect(upgradeFacility(s, 'ruined_forge')).toBe(false);
    s.skills.blacksmithing.level = 99;
    s.gold = FACILITY_BASE_GOLD - 1;
    expect(upgradeFacility(s, 'ruined_forge')).toBe(false);
    s.gold = 1e9;
    s.inventory.brick = FACILITY_BASE_AMOUNT - 1;
    expect(upgradeFacility(s, 'ruined_forge')).toBe(false);
    s.inventory.brick = 1e6;
    for (let i = 0; i < FACILITY_MAX_LEVEL; i++) expect(upgradeFacility(s, 'ruined_forge')).toBe(true);
    expect(nextFacilityUpgrade(s, 'ruined_forge')).toBeNull();
    expect(upgradeFacility(s, 'ruined_forge')).toBe(false);
    expect(facilityBonus(s, 'blacksmithing')).toBeCloseTo(FACILITY_MAX_LEVEL * FACILITY_SPEED_PER_LEVEL);
  });

  it('복원하지 않은 구역과 강화 대상이 아닌 길드 회관은 강화할 수 없다', () => {
    const s = initial(0);
    s.gold = 1e9;
    s.inventory.brick = 1e6;
    expect(nextFacilityUpgrade(s, 'ruined_forge')).toBeNull();
    expect(upgradeFacility(s, 'ruined_forge')).toBe(false);
    expect(nextFacilityUpgrade(unlockedGame(0), 'guild_hall')).toBeNull();
    for (const def of Object.values(FacilityDB)) for (const item of def!.tiers) expect(ResourceDB[item]).toBeDefined();
  });

  it('강화 단계는 저장·복원되고, v29 저장은 모든 시설 0단계로 이전된다', () => {
    const s = stocked();
    upgradeFacility(s, 'ruined_forge');
    const restored = decodeSave(encodeSave(s));
    expect(restored.version).toBe(SAVE_VERSION);
    expect(restored.facilities.ruined_forge).toBe(1);
    const raw = JSON.parse(encodeSave(s));
    raw.version = 29;
    delete raw.facilities;
    delete raw.checksum;
    expect(decodeSave(JSON.stringify(raw)).facilities.ruined_forge).toBe(0);
  });

  it('잘못된 시설 정보는 거부한다', () => {
    const s = stocked();
    upgradeFacility(s, 'ruined_forge');
    const reject = (patch: (raw: any) => void) => {
      const raw = JSON.parse(encodeSave(s));
      delete raw.checksum;
      patch(raw);
      expect(() => decodeSave(JSON.stringify(raw))).toThrow();
    };
    reject(raw => { raw.facilities.ruined_forge = FACILITY_MAX_LEVEL + 1; });
    reject(raw => { raw.facilities.ruined_forge = 1.5; });
    reject(raw => { delete raw.facilities.broken_bridge; });
    reject(raw => { raw.facilities.guild_hall = 0; });
    reject(raw => { raw.skills.blacksmithing.level = 7; raw.skills.blacksmithing.maxExp = 197; raw.skills.blacksmithing.exp = 0; });
    reject(raw => { delete raw.facilities; });
  });
});
