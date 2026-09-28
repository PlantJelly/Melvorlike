import { describe, expect, it } from 'vitest';
import { advance, automateFarm, buyFertilizer, farmReady, harvest, plant, SAVE_VERSION, unlockedGame as initial } from './model';
import { decodeSave, encodeSave } from './save';
import { FertilizerDB } from '../content/fertilizers';

const setup = () => {
  const s = initial(0);
  s.gold = 100_000;
  s.inventory.wheat = 10;
  return s;
};

describe('농사: 비료 3종', () => {
  it('비료는 골드로 사고, 골드가 모자라면 살 수 없다', () => {
    const s = setup();
    expect(buyFertilizer(s, 'speed', 3)).toBe(true);
    expect(s.fertilizers.speed).toBe(3);
    expect(s.gold).toBe(100_000 - FertilizerDB.speed.goldCost * 3);
    s.gold = 0;
    expect(buyFertilizer(s, 'bumper', 1)).toBe(false);
    expect(buyFertilizer(s, 'speed', 0)).toBe(false);
  });

  it('파종할 때 고른 비료를 1개 쓰고, 재고가 없으면 심지 않는다', () => {
    const s = setup();
    expect(plant(s, 'wheat', 'speed')).toBe(false);
    expect(s.inventory.wheat).toBe(10);
    buyFertilizer(s, 'speed', 1);
    expect(plant(s, 'wheat', 'speed')).toBe(true);
    expect(s.fertilizers.speed).toBe(0);
    expect(s.farmPlots[0]).toEqual({cropId: 'wheat', progressMs: 0, fertilizer: 'speed'});
  });

  it('속성비료를 쓴 칸은 성장 속도가 25% 빠르다', () => {
    const s = setup();
    buyFertilizer(s, 'speed', 1);
    plant(s, 'wheat', 'speed');
    advance(s, 180000 / 1.25 - 1000);
    expect(farmReady(s)).toBe(false);
    advance(s, 180000 / 1.25);
    expect(farmReady(s)).toBe(true);
  });

  it('배양비료는 확률(25%)만큼 누적돼 4번째 수확마다 수확량이 2배가 된다', () => {
    const s = setup();
    buyFertilizer(s, 'bumper', 4);
    const yields: number[] = [];
    let t = 0;
    for (let i = 0; i < 4; i++) {
      plant(s, 'wheat', 'bumper');
      t += 180000;
      advance(s, t);
      const before = s.inventory.wheat;
      harvest(s);
      yields.push(s.inventory.wheat - before);
    }
    expect(yields).toEqual([3, 3, 3, 6]);
    expect(s.bumperProgress).toBe(0);
  });

  it('회수비료는 확률(50%)만큼 누적돼 두 번째 파종마다 씨앗을 소모하지 않는다', () => {
    const s = setup();
    buyFertilizer(s, 'recovery', 2);
    plant(s, 'wheat', 'recovery');
    expect(s.inventory.wheat).toBe(9);
    advance(s, 180000);
    harvest(s);
    const before = s.inventory.wheat;
    plant(s, 'wheat', 'recovery');
    expect(s.inventory.wheat).toBe(before);
  });

  it('자동 재파종은 같은 비료를 재고가 있는 동안 다시 쓰고, 떨어지면 비료 없이 심는다', () => {
    const s = setup();
    s.skills.farming.level = 25;
    s.inventory.oak_plank = 30;
    s.inventory.glue = 15;
    automateFarm(s);
    buyFertilizer(s, 'speed', 2);
    plant(s, 'wheat', 'speed');
    advance(s, 180000 / 1.25);
    expect(s.fertilizers.speed).toBe(0);
    expect(s.farmPlots[0]?.fertilizer).toBe('speed');
    advance(s, 180000 / 1.25 * 2);
    expect(s.farmPlots[0]?.fertilizer).toBeUndefined();
    expect(s.farmPlots[0]?.progressMs).toBe(0);
  });

  it('비료 재고·칸별 비료·누적량은 저장·복원되고, v23 저장은 비료 없이 이전된다', () => {
    const s = setup();
    buyFertilizer(s, 'bumper', 5);
    plant(s, 'wheat', 'bumper');
    s.recoveryProgress = 5000;
    const restored = decodeSave(encodeSave(s));
    expect(restored.fertilizers).toEqual(s.fertilizers);
    expect(restored.farmPlots).toEqual(s.farmPlots);
    expect(restored.recoveryProgress).toBe(5000);

    const raw = JSON.parse(encodeSave(setup()));
    delete raw.checksum;
    raw.version = 23;
    delete raw.fertilizers;
    delete raw.bumperProgress;
    delete raw.recoveryProgress;
    const migrated = decodeSave(JSON.stringify(raw));
    expect(migrated.version).toBe(SAVE_VERSION);
    expect(migrated.fertilizers).toEqual({speed: 0, bumper: 0, recovery: 0});
  });

  it('잘못된 비료 정보는 거부한다', () => {
    const s = setup();
    for (const patch of [
      {fertilizers: {speed: -1, bumper: 0, recovery: 0}},
      {fertilizers: {speed: 0, bumper: 0}},
      {bumperProgress: 10000},
      {farmPlots: [{cropId: 'wheat', progressMs: 0, fertilizer: 'magic'}]},
    ]) {
      expect(() => decodeSave(JSON.stringify({...s, ...patch}))).toThrow();
    }
    const raw = JSON.parse(encodeSave(s));
    delete raw.checksum;
    raw.version = 23;
    raw.farmPlots = [{cropId: 'wheat', progressMs: 0, fertilizer: 'speed'}]; // v23에는 칸별 비료가 없다
    expect(() => decodeSave(JSON.stringify(raw))).toThrow('농사밭 정보 오류');
  });
});
