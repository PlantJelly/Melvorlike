import { describe, expect, it } from 'vitest';
import { projectIds } from '../content/projects';
import { decodeSave, encodeSave } from './save';
import { kingdomGoals, playthroughScenarios, simulatePlaythrough } from './playthrough';

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
