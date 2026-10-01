import { describe, expect, it } from 'vitest';
import { advance, begin, buyResource, claimMilestone, dailyQuestReward, economyAchievements, exchangeRateFor, exchangeResource, exchangeYield, growthAchievements, recipeFor, rerollAccessory, SAVE_VERSION, sell, unlockedGame as initial } from './model';
import { decodeSave, encodeSave } from './save';
import { ResourceDB } from '../content/resources';
import { ExchangeDB, exchangeRate } from '../content/guild';
import { ECONOMY_EXCHANGE_BONUS, economyThresholds, GROWTH_SALE_BONUS, growthLevels } from '../content/achievements';

describe('업적', () => {
  it('성장형: 스킬 레벨 단계마다 그 스킬 산출물 판매가가 오른다', () => {
    const s = initial(0);
    s.inventory.wood = 300;
    sell(s, 'wood', 100);
    expect(s.gold).toBe(1000 + 100);
    s.skills.logging.level = 30;
    expect(growthAchievements(s, 'logging')).toBe(2);
    sell(s, 'wood', 100);
    expect(s.gold).toBe(1100 + Math.floor(100 * (1 + 2 * GROWTH_SALE_BONUS)));
    s.skills.logging.level = 99;
    expect(growthAchievements(s, 'logging')).toBe(growthLevels.length);
    s.inventory.stone = 100;
    const before = s.gold;
    sell(s, 'stone', 100); // 채광은 Lv1 — 벌목 업적은 돌 판매가에 붙지 않는다
    expect(s.gold).toBe(before + 100);
  });

  it('성장형 판매가 보너스는 일일 퀘스트 보상에도 적용된다', () => {
    const s = initial(0);
    const quest = {resourceId: 'wood', amount: 10, done: false};
    const base = dailyQuestReward(s, quest);
    s.skills.logging.level = 99;
    expect(dailyQuestReward(s, quest)).toBe(Math.floor(10 * ResourceDB.wood.sell * 3 * (1 + growthLevels.length * GROWTH_SALE_BONUS)));
    expect(dailyQuestReward(s, quest)).toBeGreaterThan(base);
  });

  it('경제형: 판매·마일스톤으로 번 골드만 누계에 쌓이고, 단계마다 환전 배율이 오른다', () => {
    const s = initial(0);
    s.gold = 1_000_000;
    s.skills.logging.level = 10;
    buyResource(s, 'wood', 10); // 지출은 누계에 영향 없음
    expect(s.goldEarned).toBe(0);
    s.inventory.oak = 400_000;
    sell(s, 'oak', 333_334);
    expect(s.goldEarned).toBe(Math.floor(333_334 * ResourceDB.oak.sell * (1 + GROWTH_SALE_BONUS)));
    expect(economyAchievements(s)).toBe(1);
    expect(exchangeRateFor(s)).toBeCloseTo(exchangeRate + ECONOMY_EXCHANGE_BONUS);
    const wood = s.inventory.wood ?? 0;
    exchangeResource(s, 'oak', 'wood', 100);
    expect(s.inventory.wood).toBe(wood + Math.floor(100 * (exchangeRate + ECONOMY_EXCHANGE_BONUS)));
    claimMilestone(s, 'any_skill_10');
    expect(s.goldEarned).toBeGreaterThan(1_000_000);
  });

  it('최대 환전 배율에서도 환전 후 되팔기가 직접 팔기보다 항상 손해다', () => {
    const s = initial(0);
    s.goldEarned = economyThresholds[economyThresholds.length - 1];
    expect(exchangeRateFor(s)).toBeCloseTo(exchangeRate + ECONOMY_EXCHANGE_BONUS * economyThresholds.length);
    for (const [id, targets] of Object.entries(ExchangeDB)) {
      for (const ex of targets) expect(exchangeYield(s, id, ex) * ResourceDB[ex.targetId].sell, `${id} → ${ex.targetId}`).toBeLessThan(ResourceDB[id].sell);
    }
  });

  it('제작형: 첫 전설 리롤 뒤 마법부여석의 농사 약초 재료가 1개 줄어든다', () => {
    const s = initial(0);
    s.skills.blacksmithing.level = 50;
    s.accessories.crown = {tier: 3, optionId: null, rarity: null};
    s.inventory.enchant_stone_gold = 1;
    expect(recipeFor(s, 'enchant_stone_stone')).toEqual({chamomile: 2, mana_stone: 1});
    expect(rerollAccessory(s, 'crown', 'enchant_stone_gold', () => 0.999)).toBe(true);
    expect(s.accessories.crown?.rarity).toBe(4);
    expect(s.legendaryRolled).toBe(true);
    expect(recipeFor(s, 'enchant_stone_stone')).toEqual({chamomile: 1, mana_stone: 1});
    expect(recipeFor(s, 'enchant_stone_gold')).toEqual({mystic_herb: 1, mana_stone: 5, gold_ingot: 1});
    expect(recipeFor(s, 'copper_ingot')).toEqual(ResourceDB.copper_ingot.recipe); // 다른 제작은 그대로
    s.inventory = {chamomile: 1, mana_stone: 1};
    expect(begin(s, 'enchant_stone_stone')).toBe(true);
    advance(s, ResourceDB.enchant_stone_stone.baseDurationMs);
    expect(s.inventory.enchant_stone_stone).toBe(1);
    expect(s.inventory.chamomile).toBe(0);
  });

  it('누적 골드·전설 리롤 여부는 저장되고, v28 저장은 누계 0·지금 장신구에서 전설 여부를 추론한다', () => {
    const s = initial(0);
    s.goldEarned = 12345;
    s.legendaryRolled = true;
    const restored = decodeSave(encodeSave(s));
    expect(restored.goldEarned).toBe(12345);
    expect(restored.legendaryRolled).toBe(true);

    const old = initial(0);
    old.skills.blacksmithing.level = 50;
    old.accessories.ring = {tier: 3, optionId: 'sale', rarity: 4};
    const raw = JSON.parse(encodeSave(old));
    delete raw.checksum;
    raw.version = 28;
    delete raw.goldEarned;
    delete raw.legendaryRolled;
    const migrated = decodeSave(JSON.stringify(raw));
    expect(migrated.version).toBe(SAVE_VERSION);
    expect(migrated.goldEarned).toBe(0);
    expect(migrated.legendaryRolled).toBe(true);
  });

  it('잘못된 업적 정보는 거부한다', () => {
    const s = initial(0);
    expect(() => decodeSave(JSON.stringify({...s, goldEarned: -1}))).toThrow('업적 정보 오류');
    expect(() => decodeSave(JSON.stringify({...s, legendaryRolled: 'yes'}))).toThrow('업적 정보 오류');
    s.skills.blacksmithing.level = 50;
    s.accessories.crown = {tier: 3, optionId: 'speed', rarity: 4};
    expect(() => decodeSave(JSON.stringify({...s, legendaryRolled: false}))).toThrow('업적 정보 오류');
  });
});
