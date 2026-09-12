import { describe, expect, it } from 'vitest';
import { advance, begin, farmReady, farmRemainingMs, harvest, initial, plant } from './model';
import { decodeSave } from './save';

describe('농사: 씨앗 구매 → 파종 → 성장 → 수확', () => {
  it('심으면 씨앗 1개를 소모하고, 이미 심었거나 레벨/재고 부족이면 막는다', () => {
    const s = initial(0);
    expect(plant(s, 'wheat')).toBe(false);
    s.inventory.wheat = 2;
    expect(plant(s, 'wheat')).toBe(true);
    expect(s.inventory.wheat).toBe(1);
    expect(s.farmPlot).toEqual({cropId: 'wheat', progressMs: 0});
    expect(plant(s, 'wheat')).toBe(false);
    const locked = initial(0);
    locked.inventory.potato = 1;
    expect(plant(locked, 'potato')).toBe(false);
  });

  it('다 자라기 전에는 수확할 수 없고, 다 자란 뒤 수확하면 재료와 경험치를 얻는다', () => {
    const s = initial(0);
    s.inventory.wheat = 1;
    plant(s, 'wheat');
    advance(s, 179000);
    expect(harvest(s)).toBe(false);
    advance(s, 180000);
    expect(harvest(s)).toBe(true);
    expect(s.inventory.wheat).toBe(3);
    expect(s.skills.farming.exp).toBe(30);
    expect(s.farmPlot).toBeNull();
    expect(harvest(s)).toBe(false);
  });

  it('작물은 액티브 작업 슬롯으로 채집할 수 없다', () => {
    const s = initial(0);
    expect(begin(s, 'wheat')).toBe(false);
    expect(s.currentAction).toBeNull();
  });

  it('남은 시간은 도구 속도를 반영하고, 도구를 바꿔도 진행량은 보존된다', () => {
    const s = initial(0);
    s.inventory.wheat = 1;
    plant(s, 'wheat');
    advance(s, 60000);
    expect(farmRemainingMs(s)).toBe(120000);
    s.tools.farming = 1;
    expect(s.farmPlot?.progressMs).toBe(60000);
    expect(farmRemainingMs(s)).toBeCloseTo(120000 / 1.15);
    advance(s, 60000 + 120000 / 1.15);
    expect(farmReady(s)).toBe(true);
    expect(farmRemainingMs(s)).toBe(0);
  });

  it('다 자란 뒤에는 더 진행되지 않고 수확 전까지 기다린다', () => {
    const s = initial(0);
    s.inventory.wheat = 1;
    plant(s, 'wheat');
    advance(s, 500000);
    expect(s.farmPlot?.progressMs).toBe(180000);
  });

  it('접속하지 않아도 밭은 흐르고, 액티브 작업과 동시에 진행된다', () => {
    const s = initial(0);
    s.inventory.wheat = 1;
    plant(s, 'wheat');
    begin(s, 'wood');
    advance(s, 90000);
    expect(s.farmPlot?.progressMs).toBe(90000);
    expect(s.inventory.wood).toBe(30);
  });

  it('긴 오프라인 경과와 짧은 틱의 결과가 같다', () => {
    const setup = () => {
      const s = initial(0);
      s.inventory.wheat = 1;
      plant(s, 'wheat');
      return s;
    };
    const a = setup(), b = setup();
    advance(a, 400000);
    for (let t = 137; t < 400000; t += 137) advance(b, t);
    advance(b, 400000);
    expect(a.farmPlot).toEqual(b.farmPlot);
    expect(a.farmPlot?.progressMs).toBe(180000);
  });

  it('v3 저장을 불러오면 농사는 기본값으로 시작하고, v4 저장은 밭 상태를 복원한다', () => {
    const s = initial(0);
    const {farming: _skill, ...skills} = s.skills;
    const loaded = decodeSave(JSON.stringify({version: 3, gold: 500, skills, tools: s.tools, inventory: {}, currentAction: null, meal: null, lastSaveTime: 0}));
    expect(loaded.version).toBe(8);
    expect(loaded.skills.farming).toEqual({level: 1, exp: 0, maxExp: 100});
    expect(loaded.farmPlot).toBeNull();

    const s2 = initial(0);
    s2.inventory.wheat = 1;
    plant(s2, 'wheat');
    advance(s2, 90000);
    const loaded2 = decodeSave(JSON.stringify(s2));
    expect(loaded2.farmPlot).toEqual({cropId: 'wheat', progressMs: 90000});
  });

  it('손상된 밭 정보는 거부한다', () => {
    const s = initial(0);
    for (const farmPlot of [{cropId: 'wood', progressMs: 1}, {cropId: 'wheat', progressMs: -1}, {cropId: 'wheat', progressMs: 999999}, {cropId: 'constructor', progressMs: 1}, {}]) {
      expect(() => decodeSave(JSON.stringify({...s, farmPlot}))).toThrow();
    }
  });

  it('작업 슬롯에 농사 작물이 담긴 저장은 거부한다', () => {
    const s = initial(0);
    const currentAction = {resourceId: 'wheat', progressMs: 0};
    expect(() => decodeSave(JSON.stringify({...s, currentAction}))).toThrow();
  });
});
