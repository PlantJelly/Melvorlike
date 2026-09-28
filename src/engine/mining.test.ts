import { describe, expect, it } from 'vitest';
import { advance, begin, SAVE_VERSION, unlockedGame as initial } from './model';
import { decodeSave, encodeSave } from './save';
import { CHANCE_SCALE, COAL_CHANCE, veinChance } from '../content/mining';

describe('채광: 광맥 발견', () => {
  it('확률은 채광 레벨에 비례해 오른다', () => {
    expect(veinChance(1)).toBeLessThan(veinChance(50));
    expect(veinChance(50)).toBeLessThan(veinChance(99));
  });

  it('산출 횟수 × 확률이 1회분을 넘을 때마다 상위 광물과 마나석을 1개씩 추가로 준다', () => {
    // 확률이 레벨에 따라 바뀌므로 레벨이 더 오르지 않는 만렙에서 확인한다.
    const s = initial(0);
    s.skills.mining.level = 99;
    begin(s, 'stone');
    const actions = Math.ceil(CHANCE_SCALE / veinChance(99));
    advance(s, actions * 4000);
    expect(s.inventory.stone).toBe(actions);
    expect(s.inventory.copper).toBe(1);
    expect(s.inventory.mana_stone).toBe(1);
    expect(s.veinProgress).toBe(actions * veinChance(99) - CHANCE_SCALE);
    expect(s.notice).toContain('광맥 발견');
  });

  it('광맥에 모자라면 아무것도 추가되지 않고 누적량만 남는다', () => {
    const s = initial(0);
    begin(s, 'stone');
    advance(s, 4000 * 3);
    expect(s.inventory.copper).toBeUndefined();
    expect(s.veinProgress).toBe(3 * veinChance(1));
  });

  it('채광이 아닌 작업은 광맥 누적량을 쌓지 않는다', () => {
    const s = initial(0);
    begin(s, 'wood');
    advance(s, 3000 * 500);
    expect(s.veinProgress).toBe(0);
    expect(s.inventory.mana_stone).toBeUndefined();
  });

  it('같은 레벨 구간에서는 긴 오프라인 정산과 짧은 틱 정산의 결과가 같다', () => {
    const setup = () => {
      const s = initial(0);
      s.skills.mining.level = 99;
      begin(s, 'iron');
      return s;
    };
    const a = setup(), b = setup();
    advance(a, 7000 * 400);
    for (let t = 1234; t < 7000 * 400; t += 1234) advance(b, t);
    advance(b, 7000 * 400);
    expect(b.inventory).toEqual(a.inventory);
    expect(b.veinProgress).toBe(a.veinProgress);
    expect(a.inventory.gold_ore).toBe(Math.floor(400 * veinChance(99) / CHANCE_SCALE));
  });

  it('광맥 누적량은 저장·복원되고, 범위를 벗어난 값은 거부한다', () => {
    const s = initial(0);
    s.veinProgress = 4321;
    expect(decodeSave(encodeSave(s)).veinProgress).toBe(4321);
    for (const veinProgress of [-1, 1.5, CHANCE_SCALE, '1', null]) {
      expect(() => decodeSave(JSON.stringify({...s, veinProgress}))).toThrow('광맥 정보 오류');
    }
  });
});

describe('채광: 석탄 부산물과 주괴 연료', () => {
  it('어떤 광물을 캐든 산출 2회마다 석탄 1개가 함께 나온다', () => {
    const s = initial(0);
    begin(s, 'stone');
    advance(s, 4000 * 4);
    expect(s.inventory.stone).toBe(4);
    expect(s.inventory.coal).toBe(2);
    const copper = initial(0);
    begin(copper, 'copper');
    advance(copper, 5000 * 3);
    expect(copper.inventory.coal).toBe(1);
    expect(copper.coalProgress).toBe(COAL_CHANCE);
  });

  it('석탄은 직접 캘 수 없다', () => {
    const s = initial(0);
    expect(begin(s, 'coal')).toBe(false);
    expect(s.currentAction).toBeNull();
    expect(() => decodeSave(JSON.stringify({...s, currentAction: {kind: 'production', resourceId: 'coal', progressMs: 0}}))).toThrow('작업 정보 오류');
  });

  it('구리·철 주괴는 나무 대신 석탄을 연료로 쓴다', () => {
    const s = initial(0);
    s.skills.blacksmithing.level = 10;
    s.inventory = {copper: 3, wood: 5};
    expect(begin(s, 'copper_ingot')).toBe(false); // 나무만으로는 제련 불가
    s.inventory = {copper: 3, coal: 1, iron: 3};
    expect(begin(s, 'copper_ingot')).toBe(true);
    advance(s, 6000);
    expect(s.inventory.copper_ingot).toBe(1);
    expect(s.inventory.coal).toBe(0);
    s.inventory.coal = 2;
    expect(begin(s, 'iron_ingot')).toBe(true);
    advance(s, 6000 + 8000);
    expect(s.inventory.iron_ingot).toBe(1);
    expect(s.inventory.coal).toBe(0);
  });

  it('석탄 누적량은 저장·복원되고, v25 저장은 0에서 시작한다', () => {
    const s = initial(0);
    s.coalProgress = 5000;
    expect(decodeSave(encodeSave(s)).coalProgress).toBe(5000);
    expect(() => decodeSave(JSON.stringify({...s, coalProgress: CHANCE_SCALE}))).toThrow('석탄 정보 오류');
    const raw = JSON.parse(encodeSave(s));
    delete raw.checksum;
    raw.version = 25;
    delete raw.coalProgress;
    const migrated = decodeSave(JSON.stringify(raw));
    expect(migrated.version).toBe(SAVE_VERSION);
    expect(migrated.coalProgress).toBe(0);
  });
});

describe('채광: 레벨이 오르는 구간의 정산 동일성', () => {
  it('레벨이 여러 번 오르는 긴 오프라인 정산도 짧은 틱 정산과 광맥·석탄 결과가 같다', () => {
    const setup = () => {
      const s = initial(0);
      begin(s, 'stone');
      return s;
    };
    const a = setup(), b = setup();
    advance(a, 4000 * 2000);
    for (let t = 1500; t < 4000 * 2000; t += 1500) advance(b, t);
    advance(b, 4000 * 2000);
    expect(a.skills.mining.level).toBeGreaterThan(20);
    expect(b.inventory).toEqual(a.inventory);
    expect(b.veinProgress).toBe(a.veinProgress);
    expect(b.coalProgress).toBe(a.coalProgress);
    expect(b.skills.mining).toEqual(a.skills.mining);
  });
});
