import { describe, expect, it } from 'vitest';
import { experienceToNextLevel } from './formulas';
import { progressionScenarios, resourceRate, simulateSkillToLevel, totalExperienceToLevel } from './progression';

describe('성장 곡선 시뮬레이터', () => {
  const bare = progressionScenarios[0];
  const tools = progressionScenarios[1];

  it('게임 엔진과 같은 레벨 경험치 공식을 사용한다', () => {
    expect(experienceToNextLevel(1)).toBe(100);
    expect(experienceToNextLevel(10)).toBe(277);
    expect(totalExperienceToLevel(10)).toBe(1475);
  });

  it('무도구 나무의 시간당 생산·경험치·골드를 계산한다', () => {
    const rate = resourceRate('wood', bare, 1);
    expect(rate.durationMs).toBe(3000);
    expect(rate.actionsPerHour).toBe(1200);
    expect(rate.experiencePerHour).toBe(30000);
    expect(rate.grossGoldPerHour).toBe(1200);
  });

  it('농사 생산량에는 한 번에 돌려받는 수확량을 반영한다', () => {
    const rate = resourceRate('wheat', bare, 1);
    expect(rate.actionsPerHour).toBe(20);
    expect(rate.unitsPerHour).toBe(60);
    expect(rate.grossGoldPerHour).toBe(120);
  });

  it('벌목 Lv10까지 현재 기준 59회, 177초가 걸린다', () => {
    const result = simulateSkillToLevel('logging', 10, bare);
    expect(result.actions).toBe(59);
    expect(result.elapsedMs).toBe(177000);
  });

  it('해금 도구와 경험치 보너스가 도달 시간을 줄인다', () => {
    const baseline = simulateSkillToLevel('mining', 30, bare);
    const withTools = simulateSkillToLevel('mining', 30, tools);
    const withBonuses = simulateSkillToLevel('mining', 30, progressionScenarios[3]);
    expect(withTools.elapsedMs).toBeLessThan(baseline.elapsedMs);
    expect(withBonuses.elapsedMs).toBeLessThan(withTools.elapsedMs);
  });

  it('알 수 없는 자원과 잘못된 레벨 구간을 거부한다', () => {
    expect(() => resourceRate('missing', bare, 1)).toThrow('알 수 없는 자원');
    expect(() => totalExperienceToLevel(100)).toThrow('유효하지 않은 레벨 구간');
    expect(() => simulateSkillToLevel('logging', 0, bare)).toThrow('유효하지 않은 목표 레벨');
  });
});
