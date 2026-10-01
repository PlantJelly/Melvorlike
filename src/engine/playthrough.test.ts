import { describe, expect, it } from 'vitest';
import { projectIds } from '../content/projects';
import { decodeSave, encodeSave } from './save';
import { buildGoals, kingdomGoals, playthroughScenarios, simulatePlaythrough } from './playthrough';
import { accessorySlots } from '../content/accessories';
import { playable } from '../content/resources';

const DAY = 86_400_000;

describe('전체 진행 경로 시뮬레이션 — 왕국 복원 구간', () => {
  for (const scenario of playthroughScenarios) {
    it(`${scenario.name}: 새 저장에서 11개 구역을 모두 복원하고 목표를 순서대로 달성한다`, () => {
      const result = simulatePlaythrough(scenario, {horizonMs: 30 * DAY}, kingdomGoals());
      expect(result.stuck).toBeNull();
      expect(projectIds.every(id => result.final.projects[id].phase === 'complete')).toBe(true);
      const done = result.goals.map(goal => goal.doneMs);
      expect(done.every(time => time !== null)).toBe(true);
      for (let i = 1; i < done.length; i++) expect(done[i]!).toBeGreaterThanOrEqual(done[i - 1]!);
    });
  }

  it('봇이 만든 최종 상태는 엔진 규칙 안에 있다(저장 검증 통과)', () => {
    const result = simulatePlaythrough(playthroughScenarios[1], {horizonMs: 30 * DAY}, kingdomGoals());
    const restored = decodeSave(encodeSave(result.final));
    expect(restored.projects).toEqual(result.final.projects);
    expect(restored.skills).toEqual(result.final.skills);
  });

  it('같은 시드면 같은 경로를 낸다', () => {
    const a = simulatePlaythrough(playthroughScenarios[0], {horizonMs: 30 * DAY, seed: 7}, kingdomGoals());
    const b = simulatePlaythrough(playthroughScenarios[0], {horizonMs: 30 * DAY, seed: 7}, kingdomGoals());
    expect(b.goals).toEqual(a.goals);
    expect(b.final).toEqual(a.final);
  });

  it('접속 간격이 길수록 같은 목표에 더 오래 걸리고, 시간은 활동과 유휴로 빠짐없이 나뉜다', () => {
    const [attentive, hourly] = playthroughScenarios.map(scenario => simulatePlaythrough(scenario, {horizonMs: 30 * DAY}, kingdomGoals()));
    expect(hourly.elapsedMs).toBeGreaterThan(attentive.elapsedMs);
    for (const result of [attentive, hourly]) {
      const active = Object.values(result.activeMs).reduce((sum, ms) => sum + ms, 0);
      expect(active + result.idleMs).toBeCloseTo(result.elapsedMs, 0);
    }
  });
});

describe('전체 진행 경로 시뮬레이션 — 왕국 이후 성장 구간', () => {
  const result = simulatePlaythrough(playthroughScenarios[0], {horizonMs: 30 * DAY});
  const doneIndex = result.goals.findIndex(goal => goal.doneMs === null);

  it('도구 철 티어·밭 3칸·축사 2단계·동물 3마리·금 장신구까지 멈추지 않고 달성한다', () => {
    expect(result.stuck).toBeNull();
    const s = result.final;
    expect(playable.every(skill => s.tools[skill] >= 3)).toBe(true);
    expect(s.farmPlots).toHaveLength(3);
    expect(s.barnLevel).toBe(2);
    expect([s.ranchCounts.chicken, s.ranchCounts.sheep, s.ranchCounts.cow]).toEqual([3, 3, 3]);
    expect(accessorySlots.every(slot => s.accessories[slot.id]?.tier === 3)).toBe(true);
    // 남은 목표는 마지막(전 스킬 Lv99)뿐이다.
    expect(result.goals.slice(doneIndex).map(goal => goal.id)).toEqual(['max']);
  });

  it('자동 파종/수확을 설치하고도 칸 비우기로 다른 작물을 심어 진행한다', () => {
    expect(buildGoals().some(goal => goal.id === 'farm:auto')).toBe(true);
    expect(result.final.farmAuto).toBe(true);
    // 설치 뒤에도 서로 다른 약초(쑥·마법쑥·신비 허브)가 필요한 장신구 리롤까지 끝났다.
    expect(result.goals.find(goal => goal.id === 'reroll:ring:3')?.doneMs).not.toBeNull();
  });

  it('성장 구간의 최종 상태도 저장 검증을 통과한다', () => {
    const restored = decodeSave(encodeSave(result.final));
    expect(restored.accessories).toEqual(result.final.accessories);
    expect(restored.farmPlots).toEqual(result.final.farmPlots);
  });

  it('레벨 도달 기록은 스킬별로 시간 순서이고 1일마다 표본을 남긴다', () => {
    for (const skill of playable) {
      const marks = result.levelMarks.filter(mark => mark.skill === skill);
      for (let i = 1; i < marks.length; i++) expect(marks[i].timeMs).toBeGreaterThanOrEqual(marks[i - 1].timeMs);
    }
    expect(result.samples.filter(sample => sample.timeMs % DAY === 0).length).toBeGreaterThanOrEqual(30);
    // 수동 수확으로 오른 농사 레벨도 기록된다.
    const farming = result.final.skills.farming.level;
    expect(result.levelMarks.filter(mark => mark.skill === 'farming').map(mark => mark.level)).toEqual([10, 30, 50, 70, 99].filter(level => level <= farming));
  });
});
