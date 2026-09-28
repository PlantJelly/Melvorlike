import { describe, expect, it } from 'vitest';
import { advance, begin, SAVE_VERSION, unlockedGame as initial } from './model';
import { decodeSave, encodeSave } from './save';
import { junkBase, junkChance } from '../content/fishing';
import { CHANCE_SCALE } from '../content/chance';

describe('낚시: 꽝 확률', () => {
  it('낚시터마다 꽝 확률이 다르고, 낚시 레벨이 오를수록 줄어 0이 된다', () => {
    expect(junkChance('fish_small', 1, 1)).toBe(junkBase.fish_small);
    expect(junkChance('fish_carp', 10, 10)).toBe(junkBase.fish_carp);
    expect(junkChance('fish_small', 1, 21)).toBeLessThan(junkChance('fish_small', 1, 1));
    expect(junkChance('fish_small', 1, 99)).toBe(0);
    expect(junkChance('fish_salmon', 30, 99)).toBe(0);
  });

  it('꽝이 나온 만큼 물고기는 줄지만 경험치는 모든 시도에 대해 받는다', () => {
    const s = initial(0);
    s.skills.fishing.level = 30;
    s.skills.fishing.maxExp = 1_000_000; // 이 테스트 동안 레벨이 오르지 않게 고정
    begin(s, 'fish_salmon');
    advance(s, 8500 * 5);
    const junk = Math.floor(5 * junkChance('fish_salmon', 30, 30) / CHANCE_SCALE);
    expect(junk).toBe(1);
    expect(s.inventory.fish_salmon).toBe(5 - junk);
    expect(s.skills.fishing.exp).toBe(5 * 150);
  });

  it('만렙 근처에서는 꽝이 없다', () => {
    const s = initial(0);
    s.skills.fishing.level = 99;
    begin(s, 'fish_small');
    advance(s, 3500 * 100);
    expect(s.inventory.fish_small).toBe(100);
  });

  it('레벨이 오르는 구간을 지나도 긴 오프라인 정산과 짧은 틱 정산의 결과가 같다', () => {
    const setup = () => {
      const s = initial(0);
      begin(s, 'fish_small');
      return s;
    };
    const a = setup(), b = setup();
    advance(a, 3500 * 1500);
    for (let t = 1000; t < 3500 * 1500; t += 1000) advance(b, t);
    advance(b, 3500 * 1500);
    expect(a.skills.fishing.level).toBeGreaterThan(20);
    expect(b.inventory).toEqual(a.inventory);
    expect(b.junkProgress).toBe(a.junkProgress);
    expect(b.skills.fishing).toEqual(a.skills.fishing);
  });

  it('꽝 누적량은 저장·복원되고, v26 저장은 0에서 시작한다', () => {
    const s = initial(0);
    s.junkProgress = 3333;
    expect(decodeSave(encodeSave(s)).junkProgress).toBe(3333);
    expect(() => decodeSave(JSON.stringify({...s, junkProgress: -1}))).toThrow('낚시 정보 오류');
    const raw = JSON.parse(encodeSave(s));
    delete raw.checksum;
    raw.version = 26;
    delete raw.junkProgress;
    const migrated = decodeSave(JSON.stringify(raw));
    expect(migrated.version).toBe(SAVE_VERSION);
    expect(migrated.junkProgress).toBe(0);
  });
});
