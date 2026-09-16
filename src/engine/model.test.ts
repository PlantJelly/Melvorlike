import { describe, it, expect } from 'vitest';
import { unlockedGame as initial, advance, begin, upgrade, sell, duration } from './model';
import { decodeSave } from './save';
describe('생산과 저장', () => {
    it('긴 경과 시간과 짧은 틱의 생산량 및 잔여 시간이 같다', () => { const a = initial(0), b = initial(0); begin(a, 'wood'); begin(b, 'wood'); advance(a, 100000); for (let t = 200; t <= 100000; t += 200)
        advance(b, t); expect(a).toEqual(b); expect(a.inventory.wood).toBe(33); expect(a.currentAction?.progressMs).toBe(1000); });
    it('제작은 재료만큼만 정산하고 멈춘다', () => { const s = initial(0); s.inventory.stone = 7; begin(s, 'brick'); advance(s, 100000); expect(s.inventory).toEqual({ stone: 1, brick: 3 }); expect(s.currentAction).toBeNull(); });
    it('잠긴 자원과 재료 없는 제작은 시작하지 않는다', () => { const s = initial(0); expect(begin(s, 'oak')).toBe(false); expect(begin(s, 'brick')).toBe(false); expect(begin(s, 'missing')).toBe(false); });
    it('채집 → 가공 → 도구 제작 → 속도 상승', () => { const s = initial(0); begin(s, 'wood'); advance(s, 15000); begin(s, 'stone'); advance(s, 39000); begin(s, 'brick'); advance(s, 51000); expect(upgrade(s, 'logging')).toBe(true); expect(s.inventory.wood).toBe(0); expect(s.inventory.brick).toBe(0); expect(duration(s, 'wood')).toBeLessThan(3000); expect(upgrade(s, 'logging')).toBe(false); });
    it('저장 후 재접속은 부분 진행을 유지하고 중복 지급하지 않는다', () => { const s = initial(0); begin(s, 'wood'); advance(s, 4000); const loaded = decodeSave(JSON.stringify(s)); advance(loaded, 10000); expect(loaded.inventory.wood).toBe(3); advance(loaded, 10000); expect(loaded.inventory.wood).toBe(3); expect(loaded.currentAction?.progressMs).toBe(1000); });
    it('미래 시계에서 되돌아와도 중복 시간을 지급하지 않는다', () => { const s = initial(10000); begin(s, 'wood'); advance(s, 0); advance(s, 10000); expect(s.inventory.wood).toBeUndefined(); advance(s, 13000); expect(s.inventory.wood).toBe(1); });
    it('초기 저장 호환 및 손상/미래 버전 거부', () => { const s = initial(0); expect(decodeSave(JSON.stringify({ ...s, version: 1 })).inventory).toEqual({}); expect(() => decodeSave('{')).toThrow(); expect(() => decodeSave(JSON.stringify({ ...s, version: 19 }))).toThrow(); expect(() => decodeSave(JSON.stringify({ ...s, inventory: { wood: -1 } }))).toThrow(); });
    it('판매로 재료가 음수가 되지 않는다', () => { const s = initial(0); s.inventory.wood = 3; expect(sell(s, 'wood', 4)).toBe(false); expect(sell(s, 'wood', -1)).toBe(false); expect(sell(s, 'wood', 2)).toBe(true); expect(s.gold).toBe(1002); expect(s.inventory.wood).toBe(1); });
});
