import { describe, expect, it } from 'vitest';
import { advance, clearPlot, deliverProjectMaterial, initial, plant, startProjectWork, surveyProject, unlockedGame } from './model';
import { decodeSave, encodeSave } from './save';
import { ResourceDB } from '../content/resources';

describe('밭 비우기', () => {
  it('자동 파종/수확 중에도 칸을 비우면 다른 작물로 바꿔 심을 수 있다', () => {
    const s = unlockedGame(0);
    s.farmAuto = true;
    s.inventory = {wheat: 1, chamomile: 1};
    expect(plant(s, 'wheat')).toBe(true);
    advance(s, ResourceDB.wheat.baseDurationMs * 3 + 1000);
    // 자동 수확은 수확물로 같은 작물을 다시 심는다.
    expect(s.farmPlots[0]?.cropId).toBe('wheat');
    expect(clearPlot(s, 0)).toBe(true);
    expect(s.farmPlots[0]).toBeNull();
    expect(plant(s, 'chamomile')).toBe(true);
    advance(s, s.lastSaveTime + ResourceDB.chamomile.baseDurationMs * 2);
    expect(s.farmPlots[0]?.cropId).toBe('chamomile');
    expect(s.inventory.chamomile).toBeGreaterThan(1);
  });

  it('자라는 중인 칸을 비우면 작물과 비료가 사라지고 씨앗을 돌려받지 않는다', () => {
    const s = unlockedGame(0);
    s.inventory = {wheat: 1};
    s.fertilizers.speed = 1;
    plant(s, 'wheat', 'speed');
    advance(s, 1000);
    expect(clearPlot(s, 0)).toBe(true);
    expect(s.farmPlots[0]).toBeNull();
    expect(s.inventory.wheat).toBe(0);
    expect(s.fertilizers.speed).toBe(0);
  });

  it('회수비료로 씨앗을 아낀 칸을 비워도 씨앗이 늘어나지 않는다', () => {
    const s = unlockedGame(0);
    s.inventory = {wheat: 5};
    s.fertilizers.recovery = 10;
    for (let i = 0; i < 10; i++) {
      plant(s, 'wheat', 'recovery');
      clearPlot(s, 0);
    }
    expect(s.inventory.wheat).toBeLessThanOrEqual(5);
  });

  it('다 자란 칸을 비우면 먼저 수확해 손실이 없다', () => {
    const s = unlockedGame(0);
    s.inventory = {wheat: 1};
    plant(s, 'wheat');
    advance(s, ResourceDB.wheat.baseDurationMs);
    const exp = s.skills.farming.exp + (s.skills.farming.level - 1) * 1e9;
    expect(clearPlot(s, 0)).toBe(true);
    expect(s.inventory.wheat).toBe(3);
    expect(s.skills.farming.exp + (s.skills.farming.level - 1) * 1e9).toBeGreaterThan(exp);
  });

  it('빈 칸·없는 칸·농사 미해금이면 비우지 않는다', () => {
    const s = unlockedGame(0);
    expect(clearPlot(s, 0)).toBe(false);
    expect(clearPlot(s, 5)).toBe(false);
    expect(clearPlot(s, -1)).toBe(false);
    expect(clearPlot(s, 0.5)).toBe(false);
    expect(clearPlot(initial(0), 0)).toBe(false);
  });

  it('비운 뒤의 상태는 저장·복원된다', () => {
    const s = unlockedGame(0);
    s.inventory = {wheat: 1};
    plant(s, 'wheat');
    clearPlot(s, 0);
    expect(decodeSave(encodeSave(s)).farmPlots).toEqual([null]);
  });
});

describe('왕국 공사 진행량 보정', () => {
  it('오차 범위 안에서 끝난 정리·복원 단계는 진행량이 기간과 같아 저장 검증을 통과한다', () => {
    const s = initial(0);
    surveyProject(s, 'ruined_forge');
    startProjectWork(s, 'ruined_forge');
    advance(s, 29_999.99999999);
    const state = s.projects.ruined_forge;
    expect(state.phase).toBe('delivery');
    expect(state.clearingProgressMs).toBe(30_000);
    expect(() => decodeSave(encodeSave(s))).not.toThrow();

    s.inventory.wood = 12;
    s.inventory.stone = 10;
    deliverProjectMaterial(s, 'ruined_forge', 'wood', 12);
    deliverProjectMaterial(s, 'ruined_forge', 'stone', 10);
    startProjectWork(s, 'ruined_forge');
    advance(s, s.lastSaveTime + 44_999.99999999);
    expect(state.phase).toBe('complete');
    expect(state.restorationProgressMs).toBe(45_000);
    expect(decodeSave(encodeSave(s)).projects.ruined_forge.phase).toBe('complete');
  });
});
