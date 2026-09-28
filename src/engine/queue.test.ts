import { describe, expect, it } from 'vitest';
import { advance, begin, clearQueuedAction, initial as fresh, queueAction, SAVE_VERSION, startProjectWork, surveyProject, unlockedGame as initial } from './model';
import { decodeSave, encodeSave } from './save';
import { ProjectDB } from '../content/projects';

describe('편의 기능: 목표 수량과 다음 작업 예약', () => {
  it('목표 수량을 채우면 작업이 멈춘다', () => {
    const s = initial(0);
    expect(begin(s, 'wood', 5)).toBe(true);
    advance(s, 3000 * 20);
    expect(s.inventory.wood).toBe(5);
    expect(s.currentAction).toBeNull();
    expect(s.notice).toContain('목표 수량');
  });

  it('목표 수량이 올바르지 않으면 시작하지 않는다', () => {
    const s = initial(0);
    for (const target of [0, -1, 1.5, Number.NaN]) expect(begin(s, 'wood', target)).toBe(false);
    expect(s.currentAction).toBeNull();
  });

  it('작업 중에 예약하면 목표 달성 뒤 남은 시간으로 예약 작업이 이어서 시작된다', () => {
    const s = initial(0);
    begin(s, 'wood', 5);
    expect(queueAction(s, 'stone', 3)).toBe(true);
    expect(s.currentAction?.kind === 'production' && s.currentAction.resourceId).toBe('wood');
    advance(s, 3000 * 5 + 4000 * 3 + 999);
    expect(s.inventory.wood).toBe(5);
    expect(s.inventory.stone).toBe(3);
    expect(s.queuedAction).toBeNull();
    expect(s.currentAction).toBeNull();
  });

  it('재료가 떨어져 제작이 멈춰도 예약 작업이 이어서 시작된다', () => {
    const s = initial(0);
    s.inventory.stone = 4;
    begin(s, 'brick');
    queueAction(s, 'wood');
    advance(s, 4000 * 2 + 3000 * 3);
    expect(s.inventory.brick).toBe(2);
    expect(s.inventory.wood).toBe(3);
    expect(s.currentAction?.kind === 'production' && s.currentAction.resourceId).toBe('wood');
  });

  it('예약 작업을 시작할 수 없으면 예약을 지우고 알린다', () => {
    const s = initial(0);
    begin(s, 'wood', 1);
    queueAction(s, 'brick'); // 돌이 없다
    advance(s, 10000);
    expect(s.queuedAction).toBeNull();
    expect(s.currentAction).toBeNull();
    expect(s.notice).toContain('시작하지 못했습니다');
  });

  it('쉬는 중에 예약하면 바로 시작하고, 만들 수 없는 자원은 예약하지 않는다', () => {
    const s = initial(0);
    expect(queueAction(s, 'wood')).toBe(true);
    expect(s.currentAction?.kind).toBe('production');
    expect(s.queuedAction).toBeNull();
    for (const id of ['wheat', 'coal', 'magic_wood', 'nothing']) expect(queueAction(s, id)).toBe(false);
    expect(queueAction(s, 'stone', 0)).toBe(false);
    expect(queueAction(s, 'stone')).toBe(true);
    expect(clearQueuedAction(s)).toBe(true);
    expect(s.queuedAction).toBeNull();
  });

  it('왕국 프로젝트 단계가 끝나도 예약 작업이 남은 시간으로 이어진다', () => {
    const s = fresh(0);
    surveyProject(s, 'ruined_forge');
    startProjectWork(s, 'ruined_forge');
    queueAction(s, 'wood');
    advance(s, ProjectDB.ruined_forge.clearingDurationMs + 3000 * 4);
    expect(s.projects.ruined_forge.phase).toBe('delivery');
    expect(s.inventory.wood).toBe(ProjectDB.ruined_forge.salvage.wood + 4);
  });

  it('예약이 이어지는 구간도 긴 오프라인 정산과 짧은 틱 정산의 결과가 같다', () => {
    const setup = () => {
      const s = initial(0);
      s.inventory.stone = 21;
      begin(s, 'brick');
      queueAction(s, 'copper', 7);
      return s;
    };
    const a = setup(), b = setup();
    advance(a, 200_000);
    for (let t = 200; t < 200_000; t += 200) advance(b, t);
    advance(b, 200_000);
    expect(b.inventory).toEqual(a.inventory);
    expect(b.skills).toEqual(a.skills);
    expect(b.currentAction).toEqual(a.currentAction);
    expect(a.inventory.copper).toBe(7);
  });

  it('목표 수량과 예약은 저장·복원되고, v27 저장은 예약 없이 이전된다', () => {
    const s = initial(0);
    begin(s, 'wood', 9);
    queueAction(s, 'stone', 4);
    const restored = decodeSave(encodeSave(s));
    expect(restored.currentAction).toEqual(s.currentAction);
    expect(restored.queuedAction).toEqual({resourceId: 'stone', target: 4});

    const raw = JSON.parse(encodeSave(initial(0)));
    delete raw.checksum;
    raw.version = 27;
    delete raw.queuedAction;
    const migrated = decodeSave(JSON.stringify(raw));
    expect(migrated.version).toBe(SAVE_VERSION);
    expect(migrated.queuedAction).toBeNull();
  });

  it('잘못된 목표 수량·예약은 거부하고, v27 저장의 목표 수량도 거부한다', () => {
    const s = initial(0);
    const action = {kind: 'production', resourceId: 'wood', progressMs: 0};
    for (const patch of [
      {currentAction: {...action, target: 0}},
      {queuedAction: {resourceId: 'wheat'}},
      {queuedAction: {resourceId: 'coal'}},
      {queuedAction: {resourceId: 'wood', target: 2.5}},
      {queuedAction: 'wood'},
    ]) {
      expect(() => decodeSave(JSON.stringify({...s, ...patch}))).toThrow('작업 정보 오류');
    }
    const raw = JSON.parse(encodeSave(s));
    delete raw.checksum;
    raw.version = 27;
    raw.currentAction = {...action, target: 3};
    expect(() => decodeSave(JSON.stringify(raw))).toThrow('작업 정보 오류');
  });
});
