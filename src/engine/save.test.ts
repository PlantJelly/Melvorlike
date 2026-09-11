import { describe, expect, it } from 'vitest';
import { begin, advance, buyAnimal, buyResource, craftAccessory, initial, plant, upgradeGuild } from './model';
import { decodeSave, encodeSave } from './save';

describe('백업 내보내기/복원', () => {
  it('encodeSave 후 decodeSave하면 저장 시점 상태와 동일하다', () => {
    const s = initial(0);
    s.gold = 10000;
    begin(s, 'wood');
    advance(s, 9000);
    expect(buyResource(s, 'wheat', 2)).toBe(true);
    plant(s, 'wheat');
    expect(buyAnimal(s, 'chicken')).toBe(true);
    expect(upgradeGuild(s)).toBe(true);
    s.inventory.brick = 5;
    expect(craftAccessory(s, 'crown')).toBe(true);
    s.lastSaveTime = 9000;

    const restored = decodeSave(encodeSave(s));
    expect(restored.gold).toBe(s.gold);
    expect(restored.inventory).toEqual(s.inventory);
    expect(restored.skills).toEqual(s.skills);
    expect(restored.tools).toEqual(s.tools);
    expect(restored.currentAction).toEqual(s.currentAction);
    expect(restored.farmPlot).toEqual(s.farmPlot);
    expect(restored.ranch).toEqual(s.ranch);
    expect(restored.guild).toBe(s.guild);
    expect(restored.accessories).toEqual(s.accessories);
    expect(restored.lastSaveTime).toBe(s.lastSaveTime);
  });

  it('형식이 잘못되었거나 지원하지 않는 버전의 백업은 거부된다', () => {
    const s = initial(0);
    const broken = JSON.parse(encodeSave(s));
    broken.version = 999;
    expect(() => decodeSave(JSON.stringify(broken))).toThrow('지원하지 않는 저장 버전');
    expect(() => decodeSave('{not json')).toThrow();
    expect(() => decodeSave('null')).toThrow();
  });
});
