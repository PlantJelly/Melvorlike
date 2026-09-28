import { describe, expect, it } from 'vitest';
import { SAVE_VERSION } from './model';
import { advance, automateFarm, begin, expandFarm, farmReady, farmRemainingMs, harvest, unlockedGame as initial, plant } from './model';
import { MAX_FARM_PLOTS, plotUpgrades } from '../content/farm';
import { decodeSave, encodeSave } from './save';
import { ResourceDB } from '../content/resources';
import { experienceToNextLevel } from './formulas';

// 한 번의 산출로 얻는 경험치가 커서 레벨업을 여러 번 유발할 수 있으므로, 엔진의 레벨업
// 누적 로직을 그대로 재현해 기대값을 계산한다(addExperience와 동일한 규칙).
function levelAfterExp(startExp: number) {
  let level = 1, exp = startExp, maxExp = experienceToNextLevel(1);
  while (exp >= maxExp) { exp -= maxExp; level++; maxExp = experienceToNextLevel(level); }
  return {level, exp};
}

describe('농사: 씨앗 구매 → 파종 → 성장 → 수확', () => {
  it('심으면 씨앗 1개를 소모하고, 이미 심었거나 레벨/재고 부족이면 막는다', () => {
    const s = initial(0);
    expect(plant(s, 'wheat')).toBe(false);
    s.inventory.wheat = 2;
    expect(plant(s, 'wheat')).toBe(true);
    expect(s.inventory.wheat).toBe(1);
    expect(s.farmPlots[0]).toEqual({cropId: 'wheat', progressMs: 0});
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
    const expected = levelAfterExp(ResourceDB.wheat.exp);
    expect(s.skills.farming.level).toBe(expected.level);
    expect(s.skills.farming.exp).toBe(expected.exp);
    expect(s.farmPlots[0]).toBeNull();
    expect(harvest(s)).toBe(false);
  });

  it('황금옥수수는 농사 Lv40부터 심을 수 있는 작물씨 4번째 티어다', () => {
    const s = initial(0);
    s.inventory.golden_corn = 1;
    s.skills.farming.level = 39;
    expect(plant(s, 'golden_corn')).toBe(false);
    s.skills.farming.level = 40;
    expect(plant(s, 'golden_corn')).toBe(true);
    advance(s, ResourceDB.golden_corn.baseDurationMs);
    expect(harvest(s)).toBe(true);
    expect(s.inventory.golden_corn).toBe(3);
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
    expect(s.farmPlots[0]?.progressMs).toBe(60000);
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
    expect(s.farmPlots[0]?.progressMs).toBe(180000);
  });

  it('접속하지 않아도 밭은 흐르고, 액티브 작업과 동시에 진행된다', () => {
    const s = initial(0);
    s.inventory.wheat = 1;
    plant(s, 'wheat');
    begin(s, 'wood');
    advance(s, 90000);
    expect(s.farmPlots[0]?.progressMs).toBe(90000);
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
    expect(a.farmPlots[0]).toEqual(b.farmPlots[0]);
    expect(a.farmPlots[0]?.progressMs).toBe(180000);
  });

  it('v3 저장을 불러오면 농사는 기본값으로 시작하고, v4 저장은 밭 상태를 복원한다', () => {
    const s = initial(0);
    const {farming: _skill, ...skills} = s.skills;
    const loaded = decodeSave(JSON.stringify({version: 3, gold: 500, skills, tools: s.tools, inventory: {}, currentAction: null, meal: null, lastSaveTime: 0}));
    expect(loaded.version).toBe(SAVE_VERSION);
    expect(loaded.skills.farming).toEqual({level: 1, exp: 0, maxExp: 100});
    expect(loaded.farmPlots[0]).toBeNull();

    const s2 = initial(0);
    s2.inventory.wheat = 1;
    plant(s2, 'wheat');
    advance(s2, 90000);
    const loaded2 = decodeSave(JSON.stringify(s2));
    expect(loaded2.farmPlots[0]).toEqual({cropId: 'wheat', progressMs: 90000});
  });

  it('손상된 밭 정보는 거부한다', () => {
    const s = initial(0);
    for (const farmPlot of [{cropId: 'wood', progressMs: 1}, {cropId: 'wheat', progressMs: -1}, {cropId: 'wheat', progressMs: 999999}, {cropId: 'constructor', progressMs: 1}, {}]) {
      expect(() => decodeSave(JSON.stringify({...s, farmPlots: [farmPlot]}))).toThrow();
    }
  });

  it('작업 슬롯에 농사 작물이 담긴 저장은 거부한다', () => {
    const s = initial(0);
    const currentAction = {resourceId: 'wheat', progressMs: 0};
    expect(() => decodeSave(JSON.stringify({...s, currentAction}))).toThrow();
  });
});

describe('농사: 밭 확장과 자동 파종/수확', () => {
  const ready = (level: number) => {
    const s = initial(0);
    s.skills.farming.level = level;
    s.gold = 1_000_000;
    s.inventory = {plank: 100, oak_plank: 100, glue: 100};
    return s;
  };

  it('밭 확장은 레벨·골드·목공 자재가 모두 있어야 하고, 최대 칸 수를 넘을 수 없다', () => {
    const low = ready(14);
    expect(expandFarm(low)).toBe(false);
    const s = ready(40);
    expect(expandFarm(s)).toBe(true);
    expect(s.farmPlots).toEqual([null, null]);
    expect(s.gold).toBe(1_000_000 - plotUpgrades[0].goldCost);
    expect(s.inventory.plank).toBe(100 - plotUpgrades[0].cost.plank);
    expect(expandFarm(s)).toBe(true);
    expect(s.farmPlots).toHaveLength(MAX_FARM_PLOTS);
    expect(expandFarm(s)).toBe(false);
  });

  it('여러 칸에 따로 심고, 수확하면 다 자란 칸을 한꺼번에 거둔다', () => {
    const s = ready(40);
    expandFarm(s);
    s.inventory.wheat = 1;
    s.inventory.chamomile = 1;
    expect(plant(s, 'wheat')).toBe(true);
    expect(plant(s, 'chamomile')).toBe(true);
    s.inventory.potato = 1;
    expect(plant(s, 'potato')).toBe(false); // 빈 칸 없음
    advance(s, ResourceDB.chamomile.baseDurationMs);
    expect(harvest(s)).toBe(true);
    expect(s.inventory.wheat).toBe(3);
    expect(s.inventory.chamomile).toBe(3);
    expect(s.farmPlots).toEqual([null, null]);
  });

  it('자동화가 있으면 다 자랄 때마다 거두고 같은 씨앗으로 다시 심는다', () => {
    const s = ready(25);
    expect(automateFarm(s)).toBe(true);
    expect(automateFarm(s)).toBe(false);
    s.inventory.wheat = 1;
    plant(s, 'wheat');
    advance(s, 180000 * 3 + 1000);
    // 수확 3회(+3씩) 뒤 매번 1개를 다시 심는다: 3×3 − 3 = 6
    expect(s.inventory.wheat).toBe(6);
    expect(s.farmPlots[0]).toEqual({cropId: 'wheat', progressMs: 1000});
  });

  it('자동화 중 다시 심을 씨앗(묘목)이 없으면 거둔 뒤 칸을 비운다', () => {
    const s = ready(25);
    automateFarm(s);
    s.inventory.sapling_wood = 1;
    plant(s, 'sapling_wood');
    advance(s, ResourceDB.sapling_wood.baseDurationMs * 2);
    expect(s.inventory.wood).toBe(300);
    expect(s.farmPlots[0]).toBeNull();
  });

  it('자동화 정산은 긴 오프라인과 짧은 틱의 결과가 같다', () => {
    const setup = () => {
      const s = ready(40);
      expandFarm(s);
      automateFarm(s);
      s.inventory.wheat = 1;
      s.inventory.potato = 1;
      plant(s, 'wheat');
      plant(s, 'potato');
      return s;
    };
    const a = setup(), b = setup();
    advance(a, 3_000_000);
    for (let t = 7000; t < 3_000_000; t += 7000) advance(b, t);
    advance(b, 3_000_000);
    expect(b.inventory).toEqual(a.inventory);
    expect(b.farmPlots).toEqual(a.farmPlots);
    expect(b.skills.farming).toEqual(a.skills.farming);
  });

  it('밭 배열과 자동화 여부는 저장·복원되고, v22 저장의 밭 1칸은 첫 칸으로 이전된다', () => {
    const s = ready(40);
    expandFarm(s);
    automateFarm(s);
    s.inventory.wheat = 1;
    plant(s, 'wheat');
    const restored = decodeSave(encodeSave(s));
    expect(restored.farmPlots).toEqual(s.farmPlots);
    expect(restored.farmAuto).toBe(true);

    const raw = JSON.parse(encodeSave(initial(0)));
    delete raw.checksum;
    raw.version = 22;
    delete raw.farmPlots;
    delete raw.farmAuto;
    raw.farmPlot = {cropId: 'wheat', progressMs: 1234};
    const migrated = decodeSave(JSON.stringify(raw));
    expect(migrated.version).toBe(SAVE_VERSION);
    expect(migrated.farmPlots).toEqual([{cropId: 'wheat', progressMs: 1234}]);
    expect(migrated.farmAuto).toBe(false);
  });

  it('칸 수·자동화가 레벨 조건이나 최대치를 어긴 저장은 거부한다', () => {
    const s = initial(0);
    s.skills.farming.level = 10;
    for (const patch of [
      {farmPlots: []},
      {farmPlots: [null, null]}, // Lv15 미만인데 2칸
      {farmPlots: Array(MAX_FARM_PLOTS + 1).fill(null)},
      {farmAuto: true}, // Lv25 미만인데 자동화
      {farmAuto: 'yes'},
    ]) {
      expect(() => decodeSave(JSON.stringify({...s, ...patch}))).toThrow('농사밭 정보 오류');
    }
  });
});
