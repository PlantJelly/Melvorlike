// 전체 진행 경로 시뮬레이션: 새 저장에서 실제 엔진 함수만 호출하는 결정론적 플레이 정책(봇)으로
// 목표를 차례로 진행하며, 레벨 해금·보유 재화·패시브 일정이 서로 막는 지점을 측정한다.
// 측정 도구이므로 게임 규칙을 우회하지 않는다 — 모든 상태 변화는 model.ts의 공개 함수를 거친다.
import { ResourceDB, passiveSkills, playable, skillNames, toolNames, toolTiers } from '../content/resources';
import { ProjectDB, projectIds, type ProjectId } from '../content/projects';
import { AnimalDB } from '../content/animals';
import { COAL_CHANCE } from '../content/mining';
import { CHANCE_SCALE } from '../content/chance';
import { milestoneIds } from '../content/guild';
import type { SkillId } from '../content/types';
import { experienceToNextLevel, MAX_SKILL_LEVEL } from './formulas';
import {
  advance, animalCount, begin, buyAnimal, buyResource, claimMilestone, deliverProjectMaterial, duration,
  farmRemainingMs, harvest, initial, plant, ranchRemainingMs, ranchStarved, recipeFor, sell, skillUnlocked,
  startProjectWork, surveyProject, upgrade, type Model,
} from './model';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
export const LEVEL_MARKS = [10, 30, 50, 70, 99] as const;

export interface PlaythroughScenario {
  id: string;
  name: string;
  // 0이면 작업이 끝나거나 밭·동물이 다 자라는 즉시 반응한다. 양수면 그 간격으로만 접속해 결정한다.
  checkIntervalMs: number;
}

export const playthroughScenarios: readonly PlaythroughScenario[] = [
  {id: 'attentive', name: '상시 접속', checkIntervalMs: 0},
  {id: 'hourly', name: '1시간마다 확인', checkIntervalMs: HOUR},
];

export interface PlaythroughOptions {
  horizonMs: number;
  seed?: number;
  // 이 목표를 달성하면 멈춘다(테스트·부분 보고용).
  stopAfterGoal?: string;
}

export interface GoalRecord {
  id: string;
  label: string;
  phase: string;
  startMs: number | null;
  doneMs: number | null;
  // 이 목표가 패시브 산출·해금을 기다린 시간(사유별).
  waitMs: Record<string, number>;
}

export interface PlaythroughSample {
  timeMs: number;
  gold: number;
  goldEarned: number;
  levels: Record<SkillId, number>;
  restored: number;
}

export interface PlaythroughResult {
  scenario: PlaythroughScenario;
  goals: GoalRecord[];
  levelMarks: {skill: SkillId; level: number; timeMs: number}[];
  activeMs: Record<string, number>;
  idleMs: number;
  elapsedMs: number;
  samples: PlaythroughSample[];
  decisions: number;
  stuck: string | null;
  final: Model;
}

type Plan =
  | {kind: 'produce'; resourceId: string; target: number}
  | {kind: 'project'; projectId: ProjectId}
  | {kind: 'wait'; reason: string}
  // 즉시 행동(납품·구매·강화 등)으로 상태가 바뀌었다 — 같은 시각에 다시 계획한다.
  | {kind: 'progress'};

interface Context {
  demand: Record<string, number>;
  reserve: Set<string>;
  random: () => number;
  scenario: PlaythroughScenario;
}

export interface Goal {
  id: string;
  label: string;
  phase: string;
  done(s: Model): boolean;
  step(s: Model, ctx: Context): Plan;
}

const produce = (resourceId: string, target: number): Plan => ({kind: 'produce', resourceId, target: Math.max(1, Math.ceil(target))});
const wait = (reason: string): Plan => ({kind: 'wait', reason});
const PROGRESS: Plan = {kind: 'progress'};

function seededRandom(seed: number) {
  let x = seed >>> 0 || 1;
  return () => {
    x ^= x << 13; x >>>= 0;
    x ^= x >>> 17;
    x ^= x << 5; x >>>= 0;
    return x / 4294967296;
  };
}

const have = (s: Model, id: string) => s.inventory[id] ?? 0;
const isPassive = (skill: SkillId) => passiveSkills.includes(skill);

function expToLevel(s: Model, skill: SkillId, level: number) {
  const state = s.skills[skill];
  if (state.level >= level) return 0;
  let total = state.maxExp - state.exp;
  for (let l = state.level + 1; l < level; l++) total += experienceToNextLevel(l);
  return total;
}

// 목표에 쓰일 자원과 그 하위 재료 전체를 판매 대상에서 뺀다.
function reserveTree(s: Model, ctx: Context, id: string) {
  if (ctx.reserve.has(id)) return;
  ctx.reserve.add(id);
  for (const m of Object.keys(recipeFor(s, id))) reserveTree(s, ctx, m);
}

// 레시피 전체를 액티브 슬롯으로 한 번 만드는 데 드는 대략의 시간. 패시브 재료는 0으로 본다.
function chainTime(s: Model, id: string): number {
  const r = ResourceDB[id];
  if (r.dropOnly) return duration(s, 'stone') * CHANCE_SCALE / COAL_CHANCE;
  if (isPassive(r.skill)) return 0;
  return duration(s, id) + Object.entries(recipeFor(s, id)).reduce((sum, [m, n]) => sum + n * chainTime(s, m), 0);
}

function needsPassive(s: Model, id: string): boolean {
  const r = ResourceDB[id];
  return isPassive(r.skill) || Object.keys(recipeFor(s, id)).some(m => needsPassive(s, m));
}

function reachable(s: Model, id: string): boolean {
  const r = ResourceDB[id];
  if (!skillUnlocked(s, r.skill) || s.skills[r.skill].level < r.reqLevel) return false;
  return Object.keys(recipeFor(s, id)).every(m => reachable(s, m));
}

// 필요한 개수를 채울 다음 행동. 이미 있으면 null.
function acquire(s: Model, ctx: Context, id: string, qty: number, depth = 0): Plan | null {
  reserveTree(s, ctx, id);
  const missing = qty - have(s, id);
  if (missing <= 0) return null;
  if (depth > 12) return wait('재료 경로 과다');
  const r = ResourceDB[id];
  if (!skillUnlocked(s, r.skill)) return wait(`${skillNames[r.skill]} 미해금`);
  if (r.dropOnly) return produce('stone', (missing * CHANCE_SCALE - s.coalProgress) / COAL_CHANCE);
  if (s.skills[r.skill].level < r.reqLevel) return train(s, ctx, r.skill, r.reqLevel, depth + 1);
  if (r.skill === 'farming') return needCrop(s, ctx, id, missing);
  if (r.skill === 'ranching') return needAnimalProduct(s, ctx, id, missing);
  if (!r.recipe) return produce(id, missing);
  return craft(s, ctx, id, missing, depth);
}

// 여러 재료 중 지금 바로 할 수 있는 일을 먼저 고른다. 모두 패시브 대기면 첫 대기를 돌려준다.
function acquireAll(s: Model, ctx: Context, needs: [string, number][], depth = 0): Plan | null {
  let waiting: Plan | null = null;
  for (const [id, qty] of needs) {
    const plan = acquire(s, ctx, id, qty, depth);
    if (!plan) continue;
    if (plan.kind !== 'wait') return plan;
    waiting ??= plan;
  }
  return waiting;
}

function craft(s: Model, ctx: Context, id: string, count: number, depth: number): Plan {
  const recipe = recipeFor(s, id);
  const craftable = Math.min(...Object.entries(recipe).map(([m, n]) => Math.floor(have(s, m) / n)));
  if (craftable >= count) return produce(id, count);
  const plan = acquireAll(s, ctx, Object.entries(recipe).map(([m, n]) => [m, n * count]), depth + 1);
  if (plan && plan.kind !== 'wait') return plan;
  if (craftable > 0) return produce(id, craftable);
  return plan ?? produce(id, count);
}

function growing(s: Model, id: string) {
  return s.farmPlots.some(plot => plot?.cropId === id);
}

function needCrop(s: Model, ctx: Context, id: string, missing: number): Plan {
  ctx.demand[id] = (ctx.demand[id] ?? 0) + missing;
  if (!growing(s, id) && have(s, id) === 0) {
    const gold = ensureGold(s, ctx, ResourceDB[id].buy);
    if (gold) return gold;
    buyResource(s, id, 1);
    return PROGRESS;
  }
  return wait(`${ResourceDB[id].name} 재배`);
}

function animalFor(productId: string) {
  return Object.values(AnimalDB).find(a => a.productId === productId)!;
}

function needAnimalProduct(s: Model, ctx: Context, id: string, missing: number): Plan {
  ctx.demand[id] = (ctx.demand[id] ?? 0) + missing;
  const animal = animalFor(id);
  if (animalCount(s, animal.id) === 0) {
    const gold = ensureGold(s, ctx, animal.buyGold);
    if (gold) return gold;
    buyAnimal(s, animal.id);
    return PROGRESS;
  }
  // 밭이 사료를 못 따라가면 골드로 사료를 사 둔다(같은 사료를 먹는 모든 동물의 4주기분).
  const feedTarget = Object.values(AnimalDB).filter(a => a.feedId === animal.feedId).reduce((sum, a) => sum + a.feedAmount * animalCount(s, a.id) * 4, 0);
  if (have(s, animal.feedId) < feedTarget) {
    reserveTree(s, ctx, animal.feedId);
    const count = feedTarget - have(s, animal.feedId);
    const gold = ensureGold(s, ctx, ResourceDB[animal.feedId].buy * count);
    if (gold) return gold;
    buyResource(s, animal.feedId, count);
    return PROGRESS;
  }
  return wait(`${ResourceDB[id].name} 사육`);
}

// 스킬 레벨을 올린다. 액티브 스킬은 (경험치 ÷ 재료 포함 작업 시간)이 가장 좋은 자원을 만들고,
// 패시브 스킬은 밭·동물이 알아서 올리므로 대기한다(밭은 tend가 경험치 좋은 작물을 심는다).
function train(s: Model, ctx: Context, skill: SkillId, level: number, depth = 0): Plan {
  if (skill === 'farming') return wait('농사 레벨');
  if (skill === 'ranching') {
    if (Object.keys(s.ranch).length === 0) return needAnimalProduct(s, ctx, 'egg', 1);
    return wait('목장 레벨');
  }
  const id = trainingResource(s, skill);
  if (!id) {
    // 지금 레벨로 만들 수 있는 자원의 재료가 다른 스킬 레벨에 막혀 있다 — 그 재료부터 준비한다.
    const lowest = Object.values(ResourceDB).filter(r => r.skill === skill && !r.dropOnly).sort((a, b) => a.reqLevel - b.reqLevel)[0];
    return acquire(s, ctx, lowest.id, have(s, lowest.id) + 1, depth) ?? wait(`${skillNames[skill]} 훈련 불가`);
  }
  const r = ResourceDB[id];
  const time = Math.max(1, chainTime(s, id));
  const count = Math.min(Math.ceil(expToLevel(s, skill, level) / r.exp), Math.max(1, Math.floor(HOUR / time)));
  return acquire(s, ctx, id, have(s, id) + Math.max(1, count), depth) ?? wait(`${skillNames[skill]} 훈련`);
}

function trainingResource(s: Model, skill: SkillId) {
  const options = Object.values(ResourceDB).filter(r => r.skill === skill && !r.dropOnly && reachable(s, r.id));
  const active = options.filter(r => !needsPassive(s, r.id));
  const pool = active.length ? active : options;
  let best: string | null = null;
  let bestScore = -1;
  for (const r of pool) {
    const score = r.exp / Math.max(1, chainTime(s, r.id));
    if (score > bestScore) { bestScore = score; best = r.id; }
  }
  return best;
}

// 시간당 판매가가 가장 높은, 목표에 쓰이지 않는 액티브 원재료.
function moneyResource(s: Model, ctx: Context) {
  let best: string | null = null;
  let bestRate = -1;
  for (const r of Object.values(ResourceDB)) {
    if (r.recipe || r.dropOnly || isPassive(r.skill) || ctx.reserve.has(r.id) || !reachable(s, r.id)) continue;
    const rate = r.sell / duration(s, r.id);
    if (rate > bestRate) { bestRate = rate; best = r.id; }
  }
  return best;
}

// 씨앗·사료로 남겨 둘 최소 수량.
function keepAmount(s: Model, id: string) {
  const r = ResourceDB[id];
  let keep = r.skill === 'farming' ? 5 : 0;
  for (const a of Object.values(AnimalDB)) if (a.feedId === id) keep = Math.max(keep, a.feedAmount * animalCount(s, a.id) * 4);
  return keep;
}

function sellSurplus(s: Model, ctx: Context) {
  for (const [id, count] of Object.entries(s.inventory)) {
    if (ctx.reserve.has(id)) continue;
    const extra = count - keepAmount(s, id);
    if (extra > 0) sell(s, id, extra);
  }
}

function ensureGold(s: Model, ctx: Context, amount: number): Plan | null {
  if (s.gold >= amount) return null;
  sellSurplus(s, ctx);
  if (s.gold >= amount) return null;
  const id = moneyResource(s, ctx);
  if (!id) return wait('골드 부족');
  const perUnit = ResourceDB[id].sell;
  return produce(id, Math.min(Math.ceil((amount - s.gold) / perUnit), Math.max(1, Math.floor(HOUR / duration(s, id)))));
}

// ── 패시브 관리 ── 다 자란 밭을 거두고, 빈 칸에 필요한 작물(목표·사료) 또는 경험치가 가장 좋은 작물을 심는다.
function tend(s: Model, ctx: Context) {
  if (!skillUnlocked(s, 'farming')) return;
  for (const a of Object.values(AnimalDB)) {
    const heads = animalCount(s, a.id);
    const stock = a.feedAmount * heads * 4;
    if (heads && have(s, a.feedId) < stock) ctx.demand[a.feedId] = (ctx.demand[a.feedId] ?? 0) + stock - have(s, a.feedId);
  }
  if (!s.farmAuto) harvest(s);
  for (let i = 0; i < s.farmPlots.length; i++) {
    if (s.farmPlots[i]) continue;
    const crop = chooseCrop(s, ctx);
    if (!crop) return;
    if (have(s, crop) === 0 && !buyResource(s, crop, 1)) return;
    if (!plant(s, crop)) return;
  }
}

function chooseCrop(s: Model, ctx: Context): string | null {
  const level = s.skills.farming.level;
  const crops = Object.values(ResourceDB).filter(r => r.skill === 'farming' && r.reqLevel <= level && !r.id.startsWith('sapling_'));
  const demanded = crops.filter(r => (ctx.demand[r.id] ?? 0) > 0 && (have(s, r.id) > 0 || s.gold >= r.buy));
  const pool = demanded.length ? demanded : crops.filter(r => have(s, r.id) > 0 || s.gold >= r.buy * 2);
  let best: string | null = null;
  let bestScore = -1;
  for (const r of pool) {
    const score = r.exp / r.baseDurationMs;
    if (score > bestScore) { bestScore = score; best = r.id; }
  }
  return best;
}

// 목표가 패시브를 기다리는 동안에는 가장 레벨이 낮은 채집 스킬을 올린다(재료를 소모하지 않는 일).
function fallback(s: Model, ctx: Context): Plan {
  const gathering = playable.filter(skill => !isPassive(skill) && skillUnlocked(s, skill) && s.skills[skill].level < MAX_SKILL_LEVEL
    && Object.values(ResourceDB).some(r => r.skill === skill && !r.recipe && !r.dropOnly));
  gathering.sort((a, b) => s.skills[a].level - s.skills[b].level);
  for (const skill of gathering) {
    const plan = train(s, ctx, skill, s.skills[skill].level + 1);
    if (plan.kind === 'produce') return plan;
  }
  return wait('할 일 없음');
}

// ── 목표 ──
function projectGoal(id: ProjectId): Goal {
  const project = ProjectDB[id];
  return {
    id: `project:${id}`, label: `${project.icon} ${project.name} 복원`, phase: '왕국 복원',
    done: s => s.projects[id].phase === 'complete',
    step: (s, ctx) => {
      const state = s.projects[id];
      if (state.phase === 'surveyable') { surveyProject(s, id); return PROGRESS; }
      if (state.phase !== 'delivery') return {kind: 'project', projectId: id};
      for (const [m, amount] of Object.entries(project.materials)) {
        const left = amount - (state.delivered[m] ?? 0);
        if (left > 0 && have(s, m) > 0) { deliverProjectMaterial(s, id, m, left); return PROGRESS; }
      }
      return acquireAll(s, ctx, Object.entries(project.materials).map(([m, amount]) => [m, amount - (state.delivered[m] ?? 0)])) ?? PROGRESS;
    },
  };
}

function toolGoal(skill: SkillId, tier: number): Goal {
  const def = toolTiers[tier];
  return {
    id: `tool:${skill}:${tier}`, label: `${def.name} ${toolNames[skill]}(${skillNames[skill]})`, phase: '도구',
    done: s => s.tools[skill] >= tier,
    step: (s, ctx) => {
      if (!skillUnlocked(s, skill)) return wait(`${skillNames[skill]} 미해금`);
      if (s.skills[skill].level < def.level) return train(s, ctx, skill, def.level);
      const plan = acquireAll(s, ctx, Object.entries(def.cost));
      if (plan) return plan;
      return upgrade(s, skill) ? PROGRESS : wait('도구 제작 실패');
    },
  };
}

// 구역을 복원하면 그 구역이 연 스킬의 돌 도구를 바로 만든다(대장간 이후).
export function kingdomGoals(): Goal[] {
  const goals: Goal[] = [];
  for (const id of projectIds) {
    goals.push(projectGoal(id));
    const skills = id === 'ruined_forge' ? ['logging', 'mining', ...ProjectDB[id].unlockSkills] as SkillId[] : ProjectDB[id].unlockSkills;
    for (const skill of skills) goals.push(toolGoal(skill, 1));
  }
  return goals;
}

export function buildGoals(): Goal[] {
  return kingdomGoals();
}

// ── 실행 ──
function actionRemainingMs(s: Model) {
  const action = s.currentAction;
  if (!action) return 0;
  if (action.kind === 'project') {
    const project = ProjectDB[action.projectId];
    const total = action.stage === 'clearing' ? project.clearingDurationMs : project.restorationDurationMs;
    return Math.max(0, total - action.progressMs);
  }
  const r = ResourceDB[action.resourceId];
  const speed = r.baseDurationMs / duration(s, r.id);
  return Math.max(0, ((action.target ?? 1) * r.baseDurationMs - action.progressMs) / speed);
}

function nextPassiveMs(s: Model) {
  let next = Infinity;
  for (let i = 0; i < s.farmPlots.length; i++) if (s.farmPlots[i]) next = Math.min(next, farmRemainingMs(s, i) || Infinity);
  for (const id of Object.keys(s.ranch)) if (!ranchStarved(s, id)) next = Math.min(next, ranchRemainingMs(s, id) || Infinity);
  return next;
}

function apply(s: Model, plan: Plan, ctx: Context): boolean {
  if (plan.kind === 'wait' || plan.kind === 'progress') { s.currentAction = null; return true; }
  if (plan.kind === 'project') {
    const action = s.currentAction;
    if (action?.kind === 'project' && action.projectId === plan.projectId) return true;
    return startProjectWork(s, plan.projectId);
  }
  let target = plan.target;
  // 가끔 접속하는 플레이어는 원재료 채집을 다음 접속까지 이어지게 넉넉히 건다.
  if (ctx.scenario.checkIntervalMs > 0 && !ResourceDB[plan.resourceId].recipe) {
    target = Math.max(target, Math.floor(ctx.scenario.checkIntervalMs / duration(s, plan.resourceId)));
  }
  const action = s.currentAction;
  if (action?.kind === 'production' && action.resourceId === plan.resourceId) { action.target = target; return true; }
  return begin(s, plan.resourceId, target);
}

function snapshot(s: Model, timeMs: number): PlaythroughSample {
  return {
    timeMs, gold: s.gold, goldEarned: s.goldEarned,
    levels: Object.fromEntries(playable.map(skill => [skill, s.skills[skill].level])) as Record<SkillId, number>,
    restored: projectIds.filter(id => s.projects[id].phase === 'complete').length,
  };
}

export function simulatePlaythrough(scenario: PlaythroughScenario, options: PlaythroughOptions, goals = buildGoals()): PlaythroughResult {
  const s = initial(0);
  const random = seededRandom(options.seed ?? 1);
  const records: GoalRecord[] = goals.map(goal => ({id: goal.id, label: goal.label, phase: goal.phase, startMs: null, doneMs: null, waitMs: {}}));
  const activeMs: Record<string, number> = {};
  const levelMarks: PlaythroughResult['levelMarks'] = [];
  const samples: PlaythroughSample[] = [snapshot(s, 0)];
  let idleMs = 0;
  let t = 0;
  let gi = 0;
  let decisions = 0;
  let stuck: string | null = null;
  let nextSample = DAY;

  const finishGoals = () => {
    while (gi < goals.length && goals[gi].done(s)) {
      records[gi].startMs ??= t;
      records[gi].doneMs = t;
      gi++;
    }
  };

  while (t < options.horizonMs) {
    decisions++;
    if (skillUnlocked(s, 'cooking') || s.unlockedFeatures.includes('guild')) for (const id of milestoneIds) claimMilestone(s, id);
    const ctx: Context = {demand: {}, reserve: new Set(), random, scenario};
    let plan: Plan = wait('목표 없음');
    for (let guard = 0; guard < 500; guard++) {
      finishGoals();
      if (gi >= goals.length) break;
      records[gi].startMs ??= t;
      plan = goals[gi].step(s, ctx);
      if (plan.kind !== 'progress') break;
    }
    finishGoals();
    if (gi >= goals.length) break;
    if (options.stopAfterGoal && records.find(r => r.id === options.stopAfterGoal)?.doneMs !== null) break;
    if (plan.kind === 'wait' && plan.reason.endsWith('미해금')) { stuck = `${records[gi].label}: ${plan.reason}`; break; }

    tend(s, ctx);
    const effective = plan.kind === 'wait' ? fallback(s, ctx) : plan;
    if (!apply(s, effective, ctx)) { stuck = `${records[gi].label}: 작업 시작 실패(${JSON.stringify(effective)})`; break; }

    const busy = actionRemainingMs(s);
    let dt = Math.min(busy || Infinity, nextPassiveMs(s), HOUR);
    if (!Number.isFinite(dt)) dt = HOUR;
    let next = t + Math.max(1000, dt);
    if (scenario.checkIntervalMs > 0) next = Math.ceil(next / scenario.checkIntervalMs) * scenario.checkIntervalMs;
    next = Math.min(next, options.horizonMs);
    const step = next - t;

    const action = s.currentAction;
    const worked = Math.min(step, busy);
    const key = !action ? null : action.kind === 'project' ? 'kingdom' : ResourceDB[action.resourceId].skill;
    if (key) activeMs[key] = (activeMs[key] ?? 0) + worked;
    idleMs += step - (key ? worked : 0);
    if (plan.kind === 'wait') records[gi].waitMs[plan.reason] = (records[gi].waitMs[plan.reason] ?? 0) + step;

    const before = playable.map(skill => s.skills[skill].level);
    advance(s, next);
    t = next;
    playable.forEach((skill, i) => {
      for (const mark of LEVEL_MARKS) if (before[i] < mark && s.skills[skill].level >= mark) levelMarks.push({skill, level: mark, timeMs: t});
    });
    while (t >= nextSample) { samples.push(snapshot(s, nextSample)); nextSample += DAY; }
  }
  finishGoals();
  samples.push(snapshot(s, t));
  return {scenario, goals: records, levelMarks, activeMs, idleMs, elapsedMs: t, samples, decisions, stuck, final: s};
}
