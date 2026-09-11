import { describe, expect, it } from 'vitest';
import { advance, begin, buyAnimal, initial, ranchRemainingMs, ranchStarved } from './model';
import { decodeSave } from './save';

describe('목장: 동물 구매 → 사료 소비 → 산출', () => {
  it('구매하면 골드가 줄고 사육 목록에 들어가며, 이미 있거나 레벨/골드 부족이면 막는다', () => {
    const s = initial(0);
    expect(buyAnimal(s, 'chicken')).toBe(true);
    expect(s.gold).toBe(1000 - 500);
    expect(s.ranch.chicken).toBe(0);
    expect(buyAnimal(s, 'chicken')).toBe(false);
    expect(buyAnimal(s, 'missing')).toBe(false);
    const poor = initial(0);
    poor.gold = 100;
    expect(buyAnimal(poor, 'chicken')).toBe(false);
    const locked = initial(0);
    locked.gold = 10000;
    expect(buyAnimal(locked, 'sheep')).toBe(false); // 목장 Lv15 필요
  });

  it('사료가 충분하면 시간이 지날 때마다 자동으로 산출하고 사료를 소비한다', () => {
    const s = initial(0);
    buyAnimal(s, 'chicken');
    s.inventory.wheat = 20;
    advance(s, 1800000); // 닭 주기 30분
    expect(s.inventory.egg).toBe(1);
    expect(s.inventory.wheat).toBe(15);
    expect(s.skills.ranching.exp).toBe(60);
    expect(s.ranch.chicken).toBe(0);
  });

  it('사료가 없으면 주기 1회분에서 대기하고, 더 쌓이지 않으며, 손해 없이 재개된다', () => {
    const s = initial(0);
    buyAnimal(s, 'chicken');
    advance(s, 5000000); // 사료 없이 오래 방치
    expect(s.inventory.egg).toBeUndefined();
    expect(ranchStarved(s, 'chicken')).toBe(true);
    expect(s.ranch.chicken).toBe(1800000);
    advance(s, 5100000); // 더 지나도 적체되지 않는다
    expect(s.ranch.chicken).toBe(1800000);
    s.inventory.wheat = 5;
    advance(s, 5100001); // 사료를 채우면 다음 정산에서 바로 재개
    expect(s.inventory.egg).toBe(1);
    expect(ranchStarved(s, 'chicken')).toBe(false);
  });

  it('경과한 주기 중 일부만 감당할 사료가 있으면 감당하는 만큼만 산출하고, 남은 진행은 한 주기 분에서 대기한다', () => {
    const s = initial(0);
    buyAnimal(s, 'chicken');
    s.inventory.wheat = 12; // 2주기 분(10개)만 감당 가능, 3주기 시간이 지남
    advance(s, 5400000);
    expect(s.inventory.egg).toBe(2);
    expect(s.inventory.wheat).toBe(2);
    expect(s.ranch.chicken).toBe(1800000); // 0도, 남은 소수 시간도 아닌 한 주기 분 대기
    expect(ranchStarved(s, 'chicken')).toBe(true);
  });

  it('사료를 공유하는 두 동물은 중복 소비 없이, 산 순서대로 감당하는 만큼만 소비한다', () => {
    const s = initial(0);
    s.gold = 10000;
    s.skills.ranching.level = 15;
    expect(buyAnimal(s, 'chicken')).toBe(true); // 밀 5개/주기, 30분
    expect(buyAnimal(s, 'sheep')).toBe(true); // 밀 10개/주기, 45분
    s.inventory.wheat = 12; // 둘을 동시에 감당하기엔 부족
    advance(s, 2700000); // 45분: 닭 1.5주기, 양 1주기
    expect(s.inventory.wheat).toBe(7); // 닭이 5개를 먼저 가져가고, 남은 7개로는 양(10개 필요)을 못 먹인다
    expect(s.inventory.egg).toBe(1);
    expect(s.inventory.wool).toBeUndefined();
    expect(ranchStarved(s, 'sheep')).toBe(true);
    expect(ranchStarved(s, 'chicken')).toBe(false);
  });

  it('여러 동물이 독립적으로 병행 진행된다', () => {
    const s = initial(0);
    s.gold = 10000;
    s.skills.ranching.level = 30;
    expect(buyAnimal(s, 'chicken')).toBe(true);
    expect(buyAnimal(s, 'cow')).toBe(true);
    s.inventory.wheat = 100;
    s.inventory.carrot = 100;
    advance(s, 3600000); // 소 주기 60분, 닭 주기 30분 → 닭은 2회
    expect(s.inventory.egg).toBe(2);
    expect(s.inventory.milk).toBe(1);
    expect(s.inventory.wheat).toBe(90);
    expect(s.inventory.carrot).toBe(90);
  });

  it('남은 시간은 목장 도구 속도를 반영한다', () => {
    const s = initial(0);
    buyAnimal(s, 'chicken');
    s.inventory.wheat = 5;
    advance(s, 900000);
    expect(ranchRemainingMs(s, 'chicken')).toBe(900000);
    s.tools.ranching = 1;
    expect(ranchRemainingMs(s, 'chicken')).toBeCloseTo(900000 / 1.15);
  });

  it('긴 오프라인 경과와 짧은 틱의 결과가 같다', () => {
    const setup = () => {
      const s = initial(0);
      buyAnimal(s, 'chicken');
      s.inventory.wheat = 100;
      return s;
    };
    const a = setup(), b = setup();
    advance(a, 4000000);
    for (let t = 137; t < 4000000; t += 137) advance(b, t);
    advance(b, 4000000);
    expect(a.ranch).toEqual(b.ranch);
    expect(a.inventory).toEqual(b.inventory);
    expect(a.skills.ranching).toEqual(b.skills.ranching);
  });

  it('동물은 액티브 작업 슬롯으로 채집할 수 없다', () => {
    const s = initial(0);
    expect(begin(s, 'egg')).toBe(false);
    expect(s.currentAction).toBeNull();
  });

  it('v4 저장을 불러오면 목장은 빈 상태로 시작하고, v5 저장은 사육 상태를 복원한다', () => {
    const s = initial(0);
    const {ranching: _skill, ...skills} = s.skills;
    const loaded = decodeSave(JSON.stringify({version: 4, gold: 500, skills, tools: s.tools, inventory: {}, currentAction: null, meal: null, farmPlot: null, lastSaveTime: 0}));
    expect(loaded.version).toBe(6);
    expect(loaded.skills.ranching).toEqual({level: 1, exp: 0, maxExp: 100});
    expect(loaded.ranch).toEqual({});

    const s2 = initial(0);
    buyAnimal(s2, 'chicken');
    s2.inventory.wheat = 5;
    advance(s2, 900000);
    const loaded2 = decodeSave(JSON.stringify(s2));
    expect(loaded2.ranch).toEqual({chicken: 900000});
  });

  it('손상된 목장 정보와 작업 슬롯에 담긴 산출물은 거부한다', () => {
    const s = initial(0);
    for (const ranch of [{chicken: -1}, {chicken: 9999999}, {missing: 1}, {chicken: 'x'}]) {
      expect(() => decodeSave(JSON.stringify({...s, ranch}))).toThrow();
    }
    const currentAction = {resourceId: 'egg', progressMs: 0};
    expect(() => decodeSave(JSON.stringify({...s, currentAction}))).toThrow();
  });
});
