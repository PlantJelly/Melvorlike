import { describe, expect, it } from 'vitest';
import { advance, animalCount, buyAnimal, expandBarn, ranchStarved, SAVE_VERSION, unlockedGame as initial } from './model';
import { decodeSave, encodeSave } from './save';
import { AnimalDB, barnUpgrades, MAX_ANIMALS_PER_SPECIES } from '../content/animals';

const setup = (level = 40) => {
  const s = initial(0);
  s.skills.ranching.level = level;
  s.gold = 1_000_000;
  s.inventory = {plank: 100, oak_plank: 100, glue: 100};
  return s;
};

describe('목장: 축사 강화와 마릿수', () => {
  it('축사 강화는 레벨·골드·목공 자재가 있어야 하고 최대 단계를 넘을 수 없다', () => {
    expect(expandBarn(setup(14))).toBe(false);
    const s = setup();
    expect(expandBarn(s)).toBe(true);
    expect(s.barnLevel).toBe(1);
    expect(s.gold).toBe(1_000_000 - barnUpgrades[0].goldCost);
    expect(s.inventory.plank).toBe(100 - barnUpgrades[0].cost.plank);
    expect(expandBarn(s)).toBe(true);
    expect(expandBarn(s)).toBe(false);
    expect(1 + s.barnLevel).toBe(MAX_ANIMALS_PER_SPECIES);
  });

  it('이미 키우는 종은 축사 수용량까지 한 마리씩 더 살 수 있다', () => {
    const s = setup();
    expect(buyAnimal(s, 'chicken')).toBe(true);
    expect(buyAnimal(s, 'chicken')).toBe(false); // 강화 전 수용량 1
    expandBarn(s);
    expect(buyAnimal(s, 'chicken')).toBe(true);
    expect(animalCount(s, 'chicken')).toBe(2);
    expect(s.gold).toBe(1_000_000 - barnUpgrades[0].goldCost - AnimalDB.chicken.buyGold * 2);
    expect(buyAnimal(s, 'chicken')).toBe(false); // 수용량 2
  });

  it('여러 마리는 주기마다 마릿수만큼 사료를 먹고 마릿수만큼 산출한다', () => {
    const s = setup();
    expandBarn(s);
    buyAnimal(s, 'chicken');
    buyAnimal(s, 'chicken');
    s.inventory.wheat = 20;
    advance(s, 1800000 * 2);
    expect(s.inventory.egg).toBe(4);
    expect(s.inventory.wheat).toBe(0);
  });

  it('한 주기에 필요한 사료가 모자라면 그 종 전체가 손해 없이 대기한다', () => {
    const s = setup();
    expandBarn(s);
    buyAnimal(s, 'chicken');
    buyAnimal(s, 'chicken');
    s.inventory.wheat = AnimalDB.chicken.feedAmount; // 1마리분만 있음
    advance(s, 1800000);
    expect(s.inventory.egg).toBeUndefined();
    expect(ranchStarved(s, 'chicken')).toBe(true);
    s.inventory.wheat = AnimalDB.chicken.feedAmount * 2;
    advance(s, 1800001);
    expect(s.inventory.egg).toBe(2);
  });

  it('긴 오프라인 정산과 짧은 틱 정산의 결과가 같다', () => {
    const make = () => {
      const s = setup();
      expandBarn(s);
      buyAnimal(s, 'chicken');
      buyAnimal(s, 'chicken');
      s.inventory.wheat = 55;
      return s;
    };
    const a = make(), b = make();
    advance(a, 1800000 * 8);
    for (let t = 60000; t < 1800000 * 8; t += 60000) advance(b, t);
    advance(b, 1800000 * 8);
    expect(b.inventory).toEqual(a.inventory);
    expect(b.ranch).toEqual(a.ranch);
    expect(a.inventory.egg).toBe(10);
  });

  it('축사 단계와 마릿수는 저장·복원되고, v24 저장은 1마리·강화 없음으로 이전된다', () => {
    const s = setup();
    expandBarn(s);
    buyAnimal(s, 'sheep');
    buyAnimal(s, 'sheep');
    const restored = decodeSave(encodeSave(s));
    expect(restored.barnLevel).toBe(1);
    expect(restored.ranchCounts).toEqual({sheep: 2});

    const old = setup();
    buyAnimal(old, 'chicken');
    const raw = JSON.parse(encodeSave(old));
    delete raw.checksum;
    raw.version = 24;
    delete raw.barnLevel;
    delete raw.ranchCounts;
    const migrated = decodeSave(JSON.stringify(raw));
    expect(migrated.version).toBe(SAVE_VERSION);
    expect(migrated.barnLevel).toBe(0);
    expect(animalCount(migrated, 'chicken')).toBe(1);
  });

  it('수용량을 넘는 마릿수, 키우지 않는 종의 마릿수, 레벨이 모자란 강화 단계는 거부한다', () => {
    const s = setup();
    buyAnimal(s, 'chicken');
    for (const patch of [
      {ranchCounts: {chicken: 2}}, // 강화 전 수용량 1
      {ranchCounts: {cow: 1}},
      {barnLevel: barnUpgrades.length + 1},
      {barnLevel: 1, skills: {...s.skills, ranching: {level: 1, exp: 0, maxExp: 100}}},
    ]) {
      expect(() => decodeSave(JSON.stringify({...s, ...patch}))).toThrow();
    }
  });
});
