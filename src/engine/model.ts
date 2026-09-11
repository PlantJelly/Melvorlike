import { ResourceDB, toolTiers, playable, cropYield, passiveSkills } from '../content/resources';
import { AnimalDB } from '../content/animals';
import { FoodDB } from '../content/foods';
import { ExchangeDB, exchangeRate, guildTiers } from '../content/guild';
import type { SkillId } from '../content/types';

export interface Model {
  version: 6;
  gold: number;
  skills: Record<SkillId, { level: number; exp: number; maxExp: number }>;
  inventory: Record<string, number>;
  tools: Record<SkillId, number>;
  // progressMs는 속도 보정 전 작업량. 속도가 변해도 진행률은 유지한다.
  currentAction: { resourceId: string; progressMs: number } | null;
  meal: { foodId: string; remainingMs: number } | null;
  // 농사는 액티브 작업과 별개로 항상 병행 진행된다. 수확 전까지 진행률은 성장 시간에서 멈춘다.
  farmPlot: { cropId: string; progressMs: number } | null;
  // 키 존재 여부가 보유 여부. 값은 다음 산출까지의 진행량(속도 보정 전).
  ranch: Record<string, number>;
  // guildTiers 인덱스. 등급이 오를수록 환전 가능한 티어 차이가 늘어난다.
  guild: number;
  lastSaveTime: number;
  notice: string;
}

export function initial(time = Date.now()): Model {
  return {
    version: 6, gold: 1000,
    skills: Object.fromEntries(playable.map(id => [id, { level: 1, exp: 0, maxExp: 100 }])) as Model['skills'],
    tools: Object.fromEntries(playable.map(id => [id, 0])) as Model['tools'],
    inventory: {}, currentAction: null, meal: null, farmPlot: null, ranch: {}, guild: 0, lastSaveTime: time, notice: '',
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

// 밭은 재접속 여부와 무관하게 항상 흐르고, 다 자란 뒤에는 수확 전까지 더 진행되지 않는다.
function advanceFarm(s: Model, elapsed: number) {
  const plot = s.farmPlot;
  if (!plot) return;
  const r = ResourceDB[plot.cropId];
  plot.progressMs = Math.min(r.baseDurationMs, plot.progressMs + elapsed * speedMultiplier(s, r.skill));
}

// 작은 틱이 누적되며 생기는 부동소수점 오차로 수확이 한 틱 밀리지 않게 advanceSegment와 같은 여유를 둔다.
export function farmReady(s: Model) {
  const plot = s.farmPlot;
  return !!plot && plot.progressMs + 1e-7 >= ResourceDB[plot.cropId].baseDurationMs;
}

// progressMs는 속도 보정 전 작업량이므로 실제 남은 시간으로 바꾸려면 현재 속도로 나눈다.
export function farmRemainingMs(s: Model) {
  const plot = s.farmPlot;
  if (!plot) return 0;
  const r = ResourceDB[plot.cropId];
  return Math.max(0, r.baseDurationMs - plot.progressMs) / speedMultiplier(s, r.skill);
}

// 사육 중인 모든 동물을 병행 정산한다. 사료가 모자라면 주기 1회분에서 진행을 멈춰
// 무한정 적체됐다가 사료를 채우는 순간 몰아서 나오는 것을 막는다(D007 참고).
function advanceRanch(s: Model, elapsed: number) {
  for (const id of Object.keys(s.ranch)) {
    const a = AnimalDB[id];
    const p = ResourceDB[a.productId];
    let progressMs = s.ranch[id] + elapsed * speedMultiplier(s, p.skill);
    const timeCount = Math.floor((progressMs + 1e-7) / p.baseDurationMs);
    if (timeCount > 0) {
      const affordable = Math.floor((s.inventory[a.feedId] ?? 0) / a.feedAmount);
      const count = Math.min(timeCount, affordable);
      if (count > 0) {
        s.inventory[a.feedId] -= a.feedAmount * count;
        s.inventory[p.id] = (s.inventory[p.id] ?? 0) + count;
        addExperience(s, p.skill, p.exp * count);
      }
      progressMs = count < timeCount ? p.baseDurationMs : progressMs - count * p.baseDurationMs;
    }
    s.ranch[id] = progressMs;
  }
}

// advanceSegment와 같은 여유(1e-7)로 주기 완료 여부를 판정한다.
function ranchCycleReady(s: Model, id: string) {
  const p = ResourceDB[AnimalDB[id].productId];
  return s.ranch[id] + 1e-7 >= p.baseDurationMs;
}

// 주기를 채웠지만 사료가 없어 다음 산출을 만들지 못하는 상태 — 손해 없이 대기, 사료를 채우면 바로 재개.
export function ranchStarved(s: Model, id: string) {
  if (!Object.hasOwn(s.ranch, id)) return false;
  const a = AnimalDB[id];
  return ranchCycleReady(s, id) && (s.inventory[a.feedId] ?? 0) < a.feedAmount;
}

export function ranchRemainingMs(s: Model, id: string) {
  if (!Object.hasOwn(s.ranch, id)) return 0;
  const a = AnimalDB[id];
  const p = ResourceDB[a.productId];
  return Math.max(0, p.baseDurationMs - s.ranch[id]) / speedMultiplier(s, p.skill);
}

export function advance(s: Model, time: number) {
  if (!Number.isFinite(time)) return 0;
  let elapsed = Math.max(0, time - s.lastSaveTime);
  s.lastSaveTime = Math.max(time, s.lastSaveTime);
  advanceFarm(s, elapsed);
  advanceRanch(s, elapsed);
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
  // 패시브 스킬(농사/목장) 산출물은 밭/축사에서만 나온다. 액티브 슬롯으로도 생산되면 이중 생산이 된다.
  if (!r || passiveSkills.includes(r.skill) || s.skills[r.skill].level < r.reqLevel || !afford(s, r.recipe ?? {})) return false;
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

// 가공품(recipe가 있는 아이템)은 제작으로만 얻을 수 있다. 원재료만 해금된 스킬 레벨 이상이면 즉시 구매 가능
// (game_design.md의 "이미 해금한 하위 티어 기본 재료는 골드로 즉시 구매 가능" 캐치업 규칙).
export function buyResource(s: Model, id: string, count: number) {
  const r = Object.hasOwn(ResourceDB, id) ? ResourceDB[id] : undefined;
  if (!r || r.recipe || !Number.isInteger(count) || count <= 0 || s.skills[r.skill].level < r.reqLevel) return false;
  const cost = r.buy * count;
  if (s.gold < cost) return false;
  s.gold -= cost;
  s.inventory[id] = (s.inventory[id] ?? 0) + count;
  return true;
}

// 상위 티어 원재료를 하위 티어로 환전한다. 하위 티어(targetId)는 그 자체로 환전 대상이 없어
// 역방향 경로가 존재하지 않으므로, 환전을 반복해도 가치를 만들어내는 순환 거래가 될 수 없다.
export function exchangeResource(s: Model, id: string, count: number) {
  const ex = Object.hasOwn(ExchangeDB, id) ? ExchangeDB[id] : undefined;
  if (!ex || !Number.isInteger(count) || count <= 0 || ex.tierGap > s.guild + 1 || (s.inventory[id] ?? 0) < count) return false;
  const gained = Math.floor(count * Math.pow(exchangeRate, ex.tierGap));
  if (gained <= 0) return false;
  s.inventory[id] -= count;
  s.inventory[ex.targetId] = (s.inventory[ex.targetId] ?? 0) + gained;
  return true;
}

export function upgradeGuild(s: Model) {
  const tier = guildTiers[s.guild + 1];
  if (!tier || s.gold < tier.goldCost) return false;
  s.gold -= tier.goldCost;
  s.guild++;
  s.notice = `${tier.name} 승급 · 환전 가능 티어 ${s.guild + 1}단계까지 확대`;
  return true;
}

export function plant(s: Model, id: string) {
  const r = Object.hasOwn(ResourceDB, id) ? ResourceDB[id] : undefined;
  if (!r || r.skill !== 'farming' || s.farmPlot || s.skills.farming.level < r.reqLevel || (s.inventory[id] ?? 0) < 1) return false;
  s.inventory[id]--;
  s.farmPlot = { cropId: id, progressMs: 0 };
  s.notice = '';
  return true;
}

export function harvest(s: Model) {
  const plot = s.farmPlot;
  if (!plot || !farmReady(s)) return false;
  const r = ResourceDB[plot.cropId];
  const n = cropYield[plot.cropId] ?? 1;
  s.inventory[plot.cropId] = (s.inventory[plot.cropId] ?? 0) + n;
  addExperience(s, 'farming', r.exp);
  s.farmPlot = null;
  s.notice = `${r.name} ${n}개 수확 · 경험치 +${r.exp}`;
  return true;
}

export function buyAnimal(s: Model, id: string) {
  const a = Object.hasOwn(AnimalDB, id) ? AnimalDB[id] : undefined;
  if (!a || Object.hasOwn(s.ranch, id)) return false;
  const p = ResourceDB[a.productId];
  if (s.skills.ranching.level < p.reqLevel || s.gold < a.buyGold) return false;
  s.gold -= a.buyGold;
  s.ranch[id] = 0;
  s.notice = `${a.name} 입주 · 사료(${ResourceDB[a.feedId].name})를 채워두면 자동으로 ${p.name}을(를) 만듭니다.`;
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
