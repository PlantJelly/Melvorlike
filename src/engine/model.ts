import { ResourceDB, toolTiers, playable } from '../content/resources';
import { FoodDB } from '../content/foods';
import type { SkillId } from '../content/types';

export interface Model {
  version: 3;
  gold: number;
  skills: Record<SkillId, { level: number; exp: number; maxExp: number }>;
  inventory: Record<string, number>;
  tools: Record<SkillId, number>;
  // progressMs는 속도 보정 전 작업량. 속도가 변해도 진행률은 유지한다.
  currentAction: { resourceId: string; progressMs: number } | null;
  meal: { foodId: string; remainingMs: number } | null;
  lastSaveTime: number;
  notice: string;
}

export function initial(time = Date.now()): Model {
  return {
    version: 3, gold: 1000,
    skills: Object.fromEntries(playable.map(id => [id, { level: 1, exp: 0, maxExp: 100 }])) as Model['skills'],
    tools: Object.fromEntries(playable.map(id => [id, 0])) as Model['tools'],
    inventory: {}, currentAction: null, meal: null, lastSaveTime: time, notice: '',
  };
}

export function speedMultiplier(s: Model, skill: SkillId) {
  const food = s.meal && s.meal.remainingMs > 0 ? FoodDB[s.meal.foodId] : null;
  return 1 + toolTiers[s.tools[skill]].bonus + (food?.skills.includes(skill) ? food.speedBonus : 0);
}

export function duration(s: Model, id: string) {
  return ResourceDB[id].baseDurationMs / speedMultiplier(s, ResourceDB[id].skill);
}

export function afford(s: Model, cost: Record<string, number>) {
  return Object.entries(cost).every(([id, n]) => (s.inventory[id] ?? 0) >= n);
}

function spend(s: Model, cost: Record<string, number>, count = 1) {
  for (const [id, n] of Object.entries(cost)) s.inventory[id] -= n * count;
}

function addExperience(s: Model, skillId: SkillId, amount: number) {
  const skill = s.skills[skillId];
  skill.exp += amount;
  while (skill.level < 99 && skill.exp >= skill.maxExp) {
    skill.exp -= skill.maxExp;
    skill.level++;
    skill.maxExp = Math.floor(100 * Math.pow(1.12, skill.level - 1));
  }
  if (skill.level === 99) skill.exp = Math.min(skill.exp, skill.maxExp);
}

// 한 구간 안에서는 속도가 일정하므로 횟수별 반복 없이 전체 생산량을 계산한다.
function advanceSegment(s: Model, elapsed: number) {
  const action = s.currentAction;
  if (!action) return 0;
  const r = ResourceDB[action.resourceId];
  action.progressMs += elapsed * speedMultiplier(s, r.skill);
  let count = Math.floor((action.progressMs + 1e-7) / r.baseDurationMs);
  if (!count) return 0;
  if (r.recipe) {
    count = Math.min(count, ...Object.entries(r.recipe).map(([id, n]) => Math.floor((s.inventory[id] ?? 0) / n)));
  }
  if (count) {
    if (r.recipe) spend(s, r.recipe, count);
    s.inventory[r.id] = (s.inventory[r.id] ?? 0) + count;
    addExperience(s, r.skill, r.exp * count);
    action.progressMs = Math.max(0, action.progressMs - count * r.baseDurationMs);
  }
  if (r.recipe && !afford(s, r.recipe)) {
    s.currentAction = null;
    s.notice = '재료가 부족해 제작을 멈췄습니다.';
  }
  return count;
}

export function advance(s: Model, time: number) {
  if (!Number.isFinite(time)) return 0;
  let elapsed = Math.max(0, time - s.lastSaveTime);
  s.lastSaveTime = Math.max(time, s.lastSaveTime);
  let count = 0;
  // 음식 만료 시점을 경계로 분리해 오프라인 전체에 효과가 적용되지 않게 한다.
  if (s.meal) {
    const boostedTime = Math.min(elapsed, s.meal.remainingMs);
    count += advanceSegment(s, boostedTime);
    elapsed -= boostedTime;
    s.meal.remainingMs -= boostedTime;
    if (s.meal.remainingMs <= 0) s.meal = null;
  }
  count += advanceSegment(s, elapsed);
  return count;
}

export function begin(s: Model, id: string) {
  const r = Object.hasOwn(ResourceDB, id) ? ResourceDB[id] : undefined;
  if (!r || s.skills[r.skill].level < r.reqLevel || !afford(s, r.recipe ?? {})) return false;
  s.currentAction = { resourceId: id, progressMs: 0 };
  s.notice = '';
  return true;
}

export function upgrade(s: Model, skill: SkillId) {
  const tier = toolTiers[s.tools[skill] + 1];
  if (!tier || s.skills[skill].level < tier.level || !afford(s, tier.cost)) return false;
  spend(s, tier.cost);
  s.tools[skill]++;
  return true;
}

export function sell(s: Model, id: string, count: number) {
  if (!Object.hasOwn(ResourceDB, id) || !Number.isInteger(count) || count <= 0 || (s.inventory[id] ?? 0) < count) return false;
  s.inventory[id] -= count;
  s.gold += ResourceDB[id].sell * count;
  return true;
}

export function eat(s: Model, foodId: string, count = 1) {
  const food = Object.hasOwn(FoodDB, foodId) ? FoodDB[foodId] : undefined;
  if (!food || !Number.isInteger(count) || count < 1 || count > 5 || (s.inventory[foodId] ?? 0) < count) return false;
  s.inventory[foodId] -= count;
  const remaining = s.meal?.foodId === foodId ? s.meal.remainingMs : 0;
  s.meal = { foodId, remainingMs: remaining + food.durationMs * count };
  s.notice = `${ResourceDB[foodId].name} ${count}개 사용 · ${food.description}`;
  return true;
}
