import { describe, expect, it } from 'vitest';
import { advance, begin, harvest, plant, SAVE_VERSION, unlockedGame as initial } from './model';
import { decodeSave, encodeSave } from './save';
import { CHANCE_SCALE } from '../content/chance';
import { SAPLING_CHANCE, saplingHarvest } from '../content/saplings';
import { ResourceDB } from '../content/resources';

const actionsPerSapling = CHANCE_SCALE / SAPLING_CHANCE;

describe('벌목 ↔ 농사: 나무묘목', () => {
  it('벌목 산출이 1회분만큼 쌓이면 벤 나무와 같은 티어 묘목을 얻는다', () => {
    const s = initial(0);
    begin(s, 'wood');
    advance(s, actionsPerSapling * 3000);
    expect(s.inventory.wood).toBe(actionsPerSapling);
    expect(s.inventory.sapling_wood).toBe(1);
    expect(s.saplingProgress).toBe(0);

    const oak = initial(0);
    oak.skills.logging.level = 10;
    begin(oak, 'oak');
    advance(oak, actionsPerSapling * 5000);
    expect(oak.inventory.sapling_oak).toBe(1);
    expect(oak.inventory.sapling_wood).toBeUndefined();
  });

  it('벌목이 아닌 작업은 묘목 누적량을 쌓지 않는다', () => {
    const s = initial(0);
    begin(s, 'stone');
    advance(s, 4000 * 200);
    expect(s.saplingProgress).toBe(0);
  });

  it('묘목을 밭에 심으면 원목을 수확하고, 묘목은 돌려받지 않는다', () => {
    const s = initial(0);
    s.inventory.sapling_wood = 1;
    expect(plant(s, 'sapling_wood')).toBe(true);
    expect(s.inventory.sapling_wood).toBe(0);
    advance(s, ResourceDB.sapling_wood.baseDurationMs);
    expect(harvest(s)).toBe(true);
    expect(s.inventory.wood).toBe(saplingHarvest.sapling_wood.count);
    expect(s.inventory.sapling_wood).toBe(0);
    expect(s.skills.farming.level).toBeGreaterThan(1);
  });

  it('상위 묘목은 해당 농사 레벨이 되어야 심을 수 있다', () => {
    const s = initial(0);
    s.inventory.sapling_magic = 1;
    s.skills.farming.level = 39;
    expect(plant(s, 'sapling_magic')).toBe(false);
    s.skills.farming.level = 40;
    expect(plant(s, 'sapling_magic')).toBe(true);
  });

  it('긴 오프라인 정산과 짧은 틱 정산의 결과가 같다', () => {
    const setup = () => {
      const s = initial(0);
      begin(s, 'wood');
      return s;
    };
    const a = setup(), b = setup();
    advance(a, 3000 * 777);
    for (let t = 999; t < 3000 * 777; t += 999) advance(b, t);
    advance(b, 3000 * 777);
    expect(b.inventory).toEqual(a.inventory);
    expect(b.saplingProgress).toBe(a.saplingProgress);
  });

  it('묘목 누적량은 저장·복원되고, 범위를 벗어난 값은 거부한다', () => {
    const s = initial(0);
    s.saplingProgress = 1234;
    expect(decodeSave(encodeSave(s)).saplingProgress).toBe(1234);
    for (const saplingProgress of [-1, 0.5, CHANCE_SCALE, '0', null]) {
      expect(() => decodeSave(JSON.stringify({...s, saplingProgress}))).toThrow('묘목 정보 오류');
    }
  });

  it('v21 저장은 광맥 누적량을 보존하고 묘목 누적량은 0에서 시작한다', () => {
    const s = initial(0);
    s.veinProgress = 777;
    const raw = JSON.parse(encodeSave(s));
    delete raw.checksum;
    raw.version = 21;
    delete raw.saplingProgress;
    const migrated = decodeSave(JSON.stringify(raw));
    expect(migrated.version).toBe(SAVE_VERSION);
    expect(migrated.veinProgress).toBe(777);
    expect(migrated.saplingProgress).toBe(0);
  });
});
