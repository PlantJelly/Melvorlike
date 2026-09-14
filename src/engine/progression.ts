import { ResourceDB, cropYield, passiveSkills, playable, toolTiers } from '../content/resources';
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

export interface ProductionRouteStep {
  resourceId: string;
  requiredUnits: number;
  actions: number;
  producedUnits: number;
  durationMs: number;
}

export interface ProductionRoute {
  steps: ProductionRouteStep[];
  rawRequirements: Record<string, number>;
  timeBySkillMs: Record<SkillId, number>;
  activeTimeMs: number;
}

function assertBonus(value: number, name: string) {
  if (!Number.isFinite(value) || value < 0) throw new RangeError(`${name} 보너스가 올바르지 않습니다.`);
}

function assertScenario(scenario: ProgressionScenario) {
  assertBonus(scenario.foodSpeedBonus, '음식 속도');
  assertBonus(scenario.accessorySpeedBonus, '장신구 속도');
  assertBonus(scenario.experienceBonus, '경험치');
}

function unitsPerAction(resource: ResourceDef) {
  return resource.skill === 'farming' ? cropYield[resource.id] ?? 1 : 1;
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
  const output = unitsPerAction(resource);
  return {
    resourceId: resource.id,
    durationMs,
    actionsPerHour,
    unitsPerHour: actionsPerHour * output,
    experiencePerHour: actionsPerHour * resource.exp * (1 + scenario.experienceBonus),
    grossGoldPerHour: actionsPerHour * output * resource.sell,
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

export function planProductionRequirements(
  targets: Record<string, number>,
  scenario: ProgressionScenario,
  levels: Partial<Record<SkillId, number>> = {},
): ProductionRoute {
  assertScenario(scenario);
  if (Object.keys(targets).length === 0) throw new RangeError('생산 목표가 비어 있습니다.');
  const required = new Map<string, number>();
  const order: string[] = [];
  const ordered = new Set<string>();

  const visit = (resourceId: string, count: number, ancestors: Set<string>) => {
    const resource = Object.hasOwn(ResourceDB, resourceId) ? ResourceDB[resourceId] : undefined;
    if (!resource) throw new RangeError(`알 수 없는 자원: ${resourceId}`);
    if (!Number.isSafeInteger(count) || count <= 0) throw new RangeError(`${resource.name} 요구량이 올바르지 않습니다: ${count}`);
    if (ancestors.has(resourceId)) throw new Error(`순환 레시피를 계산할 수 없습니다: ${[...ancestors, resourceId].join(' → ')}`);

    required.set(resourceId, (required.get(resourceId) ?? 0) + count);
    if (resource.recipe) {
      const nextAncestors = new Set(ancestors).add(resourceId);
      for (const [ingredientId, amount] of Object.entries(resource.recipe)) {
        visit(ingredientId, amount * count, nextAncestors);
      }
    }
    if (!ordered.has(resourceId)) {
      ordered.add(resourceId);
      order.push(resourceId);
    }
  };

  for (const [resourceId, count] of Object.entries(targets)) visit(resourceId, count, new Set());

  const timeBySkillMs = Object.fromEntries(playable.map(skill => [skill, 0])) as Record<SkillId, number>;
  const rawRequirements: Record<string, number> = {};
  const steps = order.map(resourceId => {
    const resource = ResourceDB[resourceId];
    const requiredUnits = required.get(resourceId)!;
    const output = unitsPerAction(resource);
    const actions = Math.ceil(requiredUnits / output);
    const level = levels[resource.skill] ?? resource.reqLevel;
    const durationMs = resourceRate(resourceId, scenario, level).durationMs * actions;
    timeBySkillMs[resource.skill] += durationMs;
    if (!resource.recipe) rawRequirements[resourceId] = requiredUnits;
    return {resourceId, requiredUnits, actions, producedUnits: actions * output, durationMs};
  });

  const activeTimeMs = playable
    .filter(skill => !passiveSkills.includes(skill))
    .reduce((sum, skill) => sum + timeBySkillMs[skill], 0);
  return {steps, rawRequirements, timeBySkillMs, activeTimeMs};
}

export function planProduction(resourceId: string, count: number, scenario: ProgressionScenario, levels: Partial<Record<SkillId, number>> = {}) {
  return planProductionRequirements({[resourceId]: count}, scenario, levels);
}
