import {describe, expect, it} from 'vitest';
import { SAVE_VERSION } from './model';
import {accessoryTiers, emptyAccessories} from '../content/accessories';
import { ResourceDB } from '../content/resources';
import {
  advance,
  begin,
  craftAccessory,
  duration,
  unlockedGame as initial,
  rerollAccessory,
  rollAccessoryRarity,
  sell,
  upgradeAccessory,
} from './model';
import {decodeSave, encodeSave} from './save';

describe('마법부여·장신구', () => {
  it('장신구를 슬롯당 한 번만 제작하고 비용을 정확히 차감한다', () => {
    const s = initial(0);
    s.inventory.brick = 5;
    expect(craftAccessory(s, 'crown')).toBe(true);
    expect(s.gold).toBe(500);
    expect(s.inventory.brick).toBe(0);
    expect(s.accessories.crown).toEqual({tier: 0, optionId: null, rarity: null});
    expect(craftAccessory(s, 'crown')).toBe(false);
  });

  it('승급은 레벨/비용을 검증하고 기존 옵션과 희귀도를 보존한다', () => {
    const s = initial(0);
    s.inventory.brick = 5;
    expect(craftAccessory(s, 'necklace')).toBe(true);
    s.inventory.enchant_stone_stone = 1;
    expect(rerollAccessory(s, 'necklace', 'enchant_stone_stone', sequence(0.9, 0))).toBe(true);
    const optionBefore = s.accessories.necklace!.optionId;
    const rarityBefore = s.accessories.necklace!.rarity;
    s.gold = accessoryTiers[1].goldCost;
    s.inventory.copper_ingot = 5;
    s.inventory.dye = 2;
    expect(upgradeAccessory(s, 'necklace')).toBe(false);
    s.skills.blacksmithing.level = 10;
    expect(upgradeAccessory(s, 'necklace')).toBe(true);
    expect(s.gold).toBe(0);
    expect(s.inventory.copper_ingot).toBe(0);
    expect(s.accessories.necklace).toEqual({tier: 1, optionId: optionBefore, rarity: rarityBefore});
  });

  it('장신구보다 낮은 등급의 마법부여석은 사용하지 않고 상태도 바꾸지 않는다', () => {
    const s = initial(0);
    s.accessories.ring = {tier: 1, optionId: 'speed', rarity: 1};
    s.inventory.enchant_stone_stone = 1;
    const before = structuredClone(s);
    expect(rerollAccessory(s, 'ring', 'enchant_stone_stone', sequence(0, 0))).toBe(false);
    expect(s).toEqual(before);
  });

  it('재질 상한 밖 희귀도를 풀에서 제외하고 남은 확률을 재정규화한다', () => {
    const boundary = 15 / 35;
    expect(rollAccessoryRarity(0, 3, boundary - 1e-8)).toBe(0);
    expect(rollAccessoryRarity(0, 3, boundary)).toBe(1);
    expect(rollAccessoryRarity(0, 3, .999999)).toBe(1);
    expect(rollAccessoryRarity(3, 3, .14)).toBe(0);
    expect(rollAccessoryRarity(3, 3, .15)).toBe(1);
    expect(rollAccessoryRarity(3, 3, .99)).toBe(4);
  });

  it('리롤은 마법부여석 하나만 소비하고 RNG 경계 오류에는 아무것도 소비하지 않는다', () => {
    const s = initial(0);
    s.accessories.crown = {tier: 0, optionId: null, rarity: null};
    s.inventory.enchant_stone_stone = 2;
    expect(rerollAccessory(s, 'crown', 'enchant_stone_stone', sequence(.9, .34))).toBe(true);
    expect(s.inventory.enchant_stone_stone).toBe(1);
    expect(s.accessories.crown).toEqual({tier: 0, optionId: 'experience', rarity: 1});
    const before = structuredClone(s);
    expect(rerollAccessory(s, 'crown', 'enchant_stone_stone', sequence(1, 0))).toBe(false);
    expect(s).toEqual(before);
  });

  it('속도와 경험치 옵션은 같은 엔진 경로에서 온라인/오프라인 정산이 일치한다', () => {
    const online = initial(0);
    online.accessories.crown = {tier: 0, optionId: 'speed', rarity: 0};
    online.accessories.ring = {tier: 0, optionId: 'experience', rarity: 0};
    expect(duration(online, 'wood')).toBeCloseTo(3000 / 1.02);
    begin(online, 'wood');
    const offline = structuredClone(online);
    for (let time = 1000; time <= 12000; time += 1000) advance(online, time);
    advance(offline, 12000);
    expect(online).toEqual(offline);
    expect(online.inventory.wood).toBe(4);
    expect(online.skills.logging.level).toBe(2);
    expect(online.skills.logging.exp).toBeCloseTo(3);
  });

  it('판매 옵션은 총액에 적용한 뒤 골드를 내림 처리한다', () => {
    const s = initial(0);
    s.accessories.ring = {tier: 0, optionId: 'sale', rarity: 0};
    s.inventory.oak = 10;
    expect(sell(s, 'oak', 10)).toBe(true);
    expect(s.gold).toBe(1031);
  });

  it('마법부여석은 기존 액티브 제작 경로에서 재료를 소비하고 경험치를 준다', () => {
    const s = initial(0);
    s.inventory.chamomile = 2;
    s.inventory.mana_stone = 1;
    expect(begin(s, 'enchant_stone_stone')).toBe(true);
    advance(s, 10000);
    expect(s.inventory.chamomile).toBe(0);
    expect(s.inventory.mana_stone).toBe(0);
    expect(s.inventory.enchant_stone_stone).toBe(1);
    // 경험치는 제작 공식(D049) 값이다. Lv2 요구치(100)를 넘으면 한 번 레벨업한다.
    const gained = ResourceDB.enchant_stone_stone.exp;
    expect(s.skills.magic.level * 1000 + s.skills.magic.exp).toBe(gained >= 100 ? 2000 + gained - 100 : 1000 + gained);
  });

  it('v6 저장은 마법/장신구 기본값을 추가해 v7로 이전한다', () => {
    const current = initial(123);
    const {magic: _magicSkill, ...skills} = current.skills;
    const {magic: _magicTool, ...tools} = current.tools;
    const {accessories: _accessories, ...withoutAccessories} = current;
    const loaded = decodeSave(JSON.stringify({...withoutAccessories, version: 6, skills, tools}));
    expect(loaded.version).toBe(SAVE_VERSION);
    expect(loaded.skills.magic.level).toBe(1);
    expect(loaded.tools.magic).toBe(0);
    expect(loaded.accessories).toEqual(emptyAccessories());
  });

  it('v7 장신구는 왕복 저장되고 손상·상한 초과 상태는 거부된다', () => {
    const s = initial(0);
    s.skills.blacksmithing.level = 50;
    s.accessories.crown = {tier: 3, optionId: 'speed', rarity: 4};
    s.legendaryRolled = true; // 전설 희귀도는 리롤로만 얻으므로 저장에도 달성 표시가 함께 있어야 한다
    expect(decodeSave(JSON.stringify(s)).accessories.crown).toEqual(s.accessories.crown);
    expect(() => decodeSave(JSON.stringify({...s, accessories: {...s.accessories, crown: {tier: 0, optionId: 'speed', rarity: 2}}}))).toThrow();
    expect(() => decodeSave(JSON.stringify({...s, accessories: {...s.accessories, crown: {tier: 0, optionId: 'speed', rarity: null}}}))).toThrow();
    expect(() => decodeSave(JSON.stringify({...s, accessories: {...s.accessories, unknown: null}}))).toThrow();
  });
});

function sequence(...values: number[]) {
  let index = 0;
  return () => values[index++];
}

describe('장신구 후반 재질·등급(D054)', () => {
  it('청금·별철·태양 재질은 대장작업 Lv65·80·95가 필요하고 등급 상한이 신화·고대·태초로 오른다', () => {
    expect(accessoryTiers.slice(4).map(tier => [tier.name, tier.reqLevel, tier.maxRarity])).toEqual([['청금', 65, 5], ['별철', 80, 6], ['태양', 95, 7]]);
    const s = initial(0);
    s.gold = 1e9;
    s.skills.blacksmithing.level = 64;
    s.accessories.crown = {tier: 3, optionId: 'speed', rarity: 4};
    s.inventory = {lapis_ingot: 5, moss_essence: 5};
    expect(upgradeAccessory(s, 'crown')).toBe(false);
    s.skills.blacksmithing.level = 65;
    expect(upgradeAccessory(s, 'crown')).toBe(true);
    expect(s.accessories.crown).toEqual({tier: 4, optionId: 'speed', rarity: 4}); // 승급해도 옵션·등급 유지
  });

  it('후반 부여석은 그 재질 이상에만 쓰이고, 재질 상한을 넘는 등급은 나오지 않는다', () => {
    expect(rollAccessoryRarity(4, 6, 0.999)).toBe(5); // 청금 장신구에 태양급 부여석: 신화까지만
    expect(rollAccessoryRarity(6, 6, 0.999)).toBe(7); // 태양 장신구에 태양급 부여석: 태초 가능
    expect(rollAccessoryRarity(5, 4, 0.5)).toBeNull(); // 별철 장신구에 청금급 부여석은 사용 불가
    const s = initial(0);
    s.skills.blacksmithing.level = 99;
    s.accessories.ring = {tier: 6, optionId: null, rarity: null};
    s.inventory.enchant_stone_sun = 1;
    expect(rerollAccessory(s, 'ring', 'enchant_stone_sun', () => 0.999)).toBe(true);
    expect(s.accessories.ring?.rarity).toBe(7);
    expect(s.legendaryRolled).toBe(true); // 전설 이상이면 첫 전설 업적 인정
  });

  it('신화 이상 장신구는 저장·복원되고, 재질 상한을 넘는 등급은 손상으로 거부한다', () => {
    const s = initial(0);
    s.skills.blacksmithing.level = 80;
    s.accessories.necklace = {tier: 5, optionId: 'experience', rarity: 6};
    s.legendaryRolled = true;
    expect(decodeSave(encodeSave(s)).accessories.necklace).toEqual({tier: 5, optionId: 'experience', rarity: 6});
    const raw = JSON.parse(encodeSave(s));
    delete raw.checksum;
    raw.accessories.necklace.rarity = 7;
    expect(() => decodeSave(JSON.stringify(raw))).toThrow('장신구 정보 오류');
    raw.accessories.necklace.rarity = 6;
    raw.legendaryRolled = false; // 신화 장신구가 있으면 첫 전설 업적도 달성 상태여야 한다
    expect(() => decodeSave(JSON.stringify(raw))).toThrow('업적 정보 오류');
  });
});
