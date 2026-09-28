import { describe, expect, it } from 'vitest';
import { advance, begin, unlockedGame as initial } from './model';
import { decodeSave, encodeSave } from './save';
import { CHANCE_SCALE, veinChance } from '../content/mining';

describe('채광: 광맥 발견', () => {
  it('확률은 채광 레벨에 비례해 오른다', () => {
    expect(veinChance(1)).toBeLessThan(veinChance(50));
    expect(veinChance(50)).toBeLessThan(veinChance(99));
  });

  it('산출 횟수 × 확률이 1회분을 넘을 때마다 상위 광물과 마나석을 1개씩 추가로 준다', () => {
    const s = initial(0);
    begin(s, 'stone');
    const actions = Math.ceil(CHANCE_SCALE / veinChance(1));
    advance(s, actions * 4000);
    expect(s.inventory.stone).toBe(actions);
    expect(s.inventory.copper).toBe(1);
    expect(s.inventory.mana_stone).toBe(1);
    expect(s.veinProgress).toBe(actions * veinChance(1) - CHANCE_SCALE);
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
