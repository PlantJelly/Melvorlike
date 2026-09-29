import { describe, expect, it } from 'vitest';
import { advance, automateFarm, begin, craftAccessory, duration, eat, expandBarn, expandFarm, unlockedGame as initial, upgradeAccessory } from './model';
import { barnUpgrades } from '../content/animals';
import { ResourceDB } from '../content/resources';
import { FoodDB } from '../content/foods';
import { accessoryTiers } from '../content/accessories';
import { farmAutomation, plotUpgrades } from '../content/farm';

describe('조제 보조재와 소비처', () => {
  it('접착제·염료·보존제는 채집 재료로 조제에서 만든다', () => {
    const s = initial(0);
    s.skills.apothecary.level = 30;
    s.inventory = {wild_berry: 4, wood: 1, wild_mushroom: 4, wild_herb: 2};
    begin(s, 'glue');
    advance(s, 4000);
    expect(s.inventory.glue).toBe(1);
    begin(s, 'dye');
    advance(s, 4000 + 6500);
    expect(s.inventory.dye).toBe(1);
    begin(s, 'preservative');
    advance(s, 4000 + 6500 + 9500);
    expect(s.inventory.preservative).toBe(1);
    expect(s.inventory.wild_herb).toBe(0);
  });

  it('보조재 판매가는 원가보다 높고, 요구 레벨이 기존 조제 티어와 같다', () => {
    for (const id of ['glue', 'dye', 'preservative']) {
      const r = ResourceDB[id];
      const cost = Object.entries(r.recipe!).reduce((sum, [mid, n]) => sum + ResourceDB[mid].sell * n, 0);
      expect(r.sell).toBeGreaterThan(cost);
      expect([1, 10, 30]).toContain(r.reqLevel);
    }
  });

  it('밭 확장과 자동화는 접착제가 있어야 설치된다', () => {
    const s = initial(0);
    s.skills.farming.level = 40;
    s.gold = 1_000_000;
    s.inventory = {plank: 100, oak_plank: 100, rope: 100};
    expect(expandFarm(s)).toBe(false);
    expect(automateFarm(s)).toBe(false);
    s.inventory.glue = plotUpgrades[0].cost.glue + farmAutomation.cost.glue;
    expect(expandFarm(s)).toBe(true);
    expect(automateFarm(s)).toBe(true);
    expect(s.inventory.glue).toBe(0);
  });

  it('장신구 승급은 염료로 채색해야 한다', () => {
    const s = initial(0);
    s.skills.blacksmithing.level = 10;
    s.gold = accessoryTiers[0].goldCost + accessoryTiers[1].goldCost;
    s.inventory = {brick: 5, copper_ingot: 5};
    expect(craftAccessory(s, 'ring')).toBe(true); // 스톤 제작에는 염료가 필요 없다
    expect(upgradeAccessory(s, 'ring')).toBe(false);
    s.inventory.dye = accessoryTiers[1].cost.dye;
    expect(upgradeAccessory(s, 'ring')).toBe(true);
    expect(s.inventory.dye).toBe(0);
  });

  it('보존 식량은 보존제로 만들고 60분 동안 전 스킬 속도를 높인다', () => {
    const s = initial(0);
    s.skills.cooking.level = 30;
    s.inventory = {preservative: 1, potato: 2, egg: 1};
    begin(s, 'field_ration');
    advance(s, 10000);
    expect(s.inventory.field_ration).toBe(1);
    expect(eat(s, 'field_ration')).toBe(true);
    expect(s.meal?.remainingMs).toBe(FoodDB.field_ration.durationMs);
    expect(FoodDB.field_ration.durationMs).toBeGreaterThan(FoodDB.vegetable_porridge.durationMs * 3);
    expect(duration(s, 'wood')).toBeCloseTo(3000 / 1.05);
    expect(duration(s, 'wheat')).toBeCloseTo(180000 / 1.05);
  });
});

describe('재봉 자재와 소비처', () => {
  it('밧줄은 섬유로, 천은 섬유와 염료로 재봉에서 만든다', () => {
    const s = initial(0);
    s.skills.sewing.level = 10;
    s.inventory = {fiber: 7, dye: 1};
    begin(s, 'rope');
    advance(s, 4000);
    expect(s.inventory.rope).toBe(1);
    begin(s, 'cloth');
    advance(s, 4000 + 6500);
    expect(s.inventory.cloth).toBe(1);
    expect(s.inventory.fiber).toBe(0);
    expect(s.inventory.dye).toBe(0);
    for (const id of ['rope', 'cloth']) {
      const r = ResourceDB[id];
      const cost = Object.entries(r.recipe!).reduce((sum, [mid, n]) => sum + ResourceDB[mid].sell * n, 0);
      expect(r.sell).toBeGreaterThan(cost);
    }
  });

  it('축사 강화는 1단계에 밧줄, 2단계에 천이 있어야 한다', () => {
    const s = initial(0);
    s.skills.ranching.level = 40;
    s.gold = 1_000_000;
    s.inventory = {plank: 100, oak_plank: 100};
    expect(expandBarn(s)).toBe(false);
    s.inventory.rope = barnUpgrades[0].cost.rope;
    expect(expandBarn(s)).toBe(true);
    expect(expandBarn(s)).toBe(false);
    s.inventory.cloth = barnUpgrades[1].cost.cloth;
    expect(expandBarn(s)).toBe(true);
    expect(s.inventory.rope).toBe(0);
    expect(s.inventory.cloth).toBe(0);
  });

  it('밭 3칸째와 자동화는 밧줄이 있어야 한다', () => {
    const s = initial(0);
    s.skills.farming.level = 40;
    s.gold = 1_000_000;
    s.inventory = {plank: 100, oak_plank: 100, glue: 100};
    expect(expandFarm(s)).toBe(true); // 2칸째는 밧줄 불필요
    expect(expandFarm(s)).toBe(false);
    expect(automateFarm(s)).toBe(false);
    s.inventory.rope = plotUpgrades[1].cost.rope + farmAutomation.cost.rope;
    expect(expandFarm(s)).toBe(true);
    expect(automateFarm(s)).toBe(true);
    expect(s.inventory.rope).toBe(0);
  });
});
