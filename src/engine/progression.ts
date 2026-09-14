import { ResourceDB, cropYield, playable, toolTiers } from '../content/resources';
import type { ResourceDef, SkillId } from '../content/types';
import { experienceToNextLevel, getSpeedMultiplier, MAX_SKILL_LEVEL } from './formulas';

export const progressionCheckpoints = [10, 30, 50, 99] as const;

export interface ProgressionScenario {
  id: string;
  name: string;
  automaticTools: boolean;
  foodSpeedBonus: number;
  accessorySpeedBonus: number;
  experienceBonus: number;
}

export const progressionScenarios: readonly ProgressionScenario[] = [
  {id: 'bare', name: '무도구', automaticTools: false, foodSpeedBonus: 0, accessorySpeedBonus: 0, experienceBonus: 0},
  {id: 'tools', name: '해금 도구', automaticTools: true, foodSpeedBonus: 0, accessorySpeedBonus: 0, experienceBonus: 0},
  {id: 'food', name: '도구+속도 음식 10%', automaticTools: true, foodSpeedBonus: .1, accessorySpeedBonus: 0, experienceBonus: 0},
  {id: 'food-xp', name: '도구+음식+경험치 18%', automaticTools: true, foodSpeedBonus: .1, accessorySpeedBonus: 0, experienceBonus: .18},
];

export interface ResourceRate {
  resourceId: string;
  durationMs: number;
  actionsPerHour: number;
  unitsPerHour: number;
  experiencePerHour: number;
  grossGoldPerHour: number;
}

export interface SkillProgressionResult {
  skill: SkillId;
  targetLevel: number;
  elapsedMs: number;
  actions: number;
}

function assertBonus(value: number, name: string) {
  if (!Number.isFinite(value) || value < 0) throw new RangeError(`${name} 보너스가 올바르지 않습니다.`);
}

function assertScenario(scenario: ProgressionScenario) {
  assertBonus(scenario.foodSpeedBonus, '음식 속도');
  assertBonus(scenario.accessorySpeedBonus, '장신구 속도');
  assertBonus(scenario.experienceBonus, '경험치');
}

export function toolTierAtLevel(level: number, automaticTools: boolean): number {
  if (!automaticTools) return 0;
  let tier = 0;
  for (let i = 1; i < toolTiers.length; i++) {
    if (toolTiers[i].level <= level) tier = i;
  }
  return tier;
}

function rateFor(resource: ResourceDef, scenario: ProgressionScenario, level: number): ResourceRate {
  assertScenario(scenario);
  const toolTier = toolTierAtLevel(level, scenario.automaticTools);
  const speed = getSpeedMultiplier(toolTiers[toolTier].bonus, scenario.foodSpeedBonus, scenario.accessorySpeedBonus);
  const durationMs = resource.baseDurationMs / speed;
  const actionsPerHour = 3_600_000 / durationMs;
  const unitsPerAction = resource.skill === 'farming' ? cropYield[resource.id] ?? 1 : 1;
  return {
    resourceId: resource.id,
    durationMs,
    actionsPerHour,
    unitsPerHour: actionsPerHour * unitsPerAction,
    experiencePerHour: actionsPerHour * resource.exp * (1 + scenario.experienceBonus),
    grossGoldPerHour: actionsPerHour * unitsPerAction * resource.sell,
  };
}

export function resourceRate(resourceId: string, scenario: ProgressionScenario, level = ResourceDB[resourceId]?.reqLevel): ResourceRate {
  const resource = Object.hasOwn(ResourceDB, resourceId) ? ResourceDB[resourceId] : undefined;
  if (!resource) throw new RangeError(`알 수 없는 자원: ${resourceId}`);
  if (!Number.isInteger(level) || level < resource.reqLevel || level > MAX_SKILL_LEVEL) {
    throw new RangeError(`${resource.name}을 사용할 수 없는 레벨입니다: ${level}`);
  }
  return rateFor(resource, scenario, level);
}

export function totalExperienceToLevel(targetLevel: number, startLevel = 1): number {
  if (!Number.isInteger(startLevel) || !Number.isInteger(targetLevel) || startLevel < 1 || targetLevel < startLevel || targetLevel > MAX_SKILL_LEVEL) {
    throw new RangeError(`유효하지 않은 레벨 구간: ${startLevel} → ${targetLevel}`);
  }
  let total = 0;
  for (let level = startLevel; level < targetLevel; level++) total += experienceToNextLevel(level);
  return total;
}

function bestUnlockedResource(skill: SkillId, level: number, scenario: ProgressionScenario): ResourceDef {
  const resources = Object.values(ResourceDB).filter(resource => resource.skill === skill && resource.reqLevel <= level);
  if (!resources.length) throw new Error(`${skill} Lv.${level}에서 사용할 수 있는 자원이 없습니다.`);
  return resources.reduce((best, resource) =>
    rateFor(resource, scenario, level).experiencePerHour > rateFor(best, scenario, level).experiencePerHour ? resource : best,
  );
}

export function simulateSkillToLevel(skill: SkillId, targetLevel: number, scenario: ProgressionScenario): SkillProgressionResult {
  if (!playable.includes(skill)) throw new RangeError(`알 수 없는 스킬: ${skill}`);
  if (!Number.isInteger(targetLevel) || targetLevel < 1 || targetLevel > MAX_SKILL_LEVEL) {
    throw new RangeError(`유효하지 않은 목표 레벨: ${targetLevel}`);
  }
  assertScenario(scenario);
  let level = 1;
  let exp = 0;
  let maxExp = experienceToNextLevel(level);
  let elapsedMs = 0;
  let actions = 0;

  while (level < targetLevel) {
    const resource = bestUnlockedResource(skill, level, scenario);
    const rate = rateFor(resource, scenario, level);
    const expPerAction = resource.exp * (1 + scenario.experienceBonus);
    const neededActions = Math.ceil((maxExp - exp) / expPerAction);
    actions += neededActions;
    elapsedMs += neededActions * rate.durationMs;
    exp += neededActions * expPerAction;
    while (level < targetLevel && exp >= maxExp) {
      exp -= maxExp;
      level++;
      maxExp = experienceToNextLevel(level);
    }
  }

  return {skill, targetLevel, elapsedMs, actions};
}
