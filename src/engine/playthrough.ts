// 전체 진행 경로 시뮬레이션: 새 저장에서 실제 엔진 함수만 호출하는 결정론적 플레이 정책(봇)으로
// 목표를 차례로 진행하며, 레벨 해금·보유 재화·패시브 일정이 서로 막는 지점을 측정한다.
// 측정 도구이므로 게임 규칙을 우회하지 않는다 — 모든 상태 변화는 model.ts의 공개 함수를 거친다.
import { ResourceDB, passiveSkills, playable, skillNames, toolNames, toolTiers } from '../content/resources';
import { ProjectDB, projectIds, type ProjectId } from '../content/projects';
import { AnimalDB, barnUpgrades } from '../content/animals';
import { COAL_CHANCE } from '../content/mining';
import { CHANCE_SCALE } from '../content/chance';
import { guildTiers, milestoneIds } from '../content/guild';
import { accessorySlots, accessoryTiers, enchantmentStones, type AccessorySlotId } from '../content/accessories';
import { farmAutomation, plotUpgrades } from '../content/farm';
import type { SkillId } from '../content/types';
import { experienceToNextLevel, MAX_SKILL_LEVEL } from './formulas';
import {
  advance, animalCount, automateFarm, begin, clearPlot, clearQueuedAction, queueAction, buyAnimal, buyResource, claimMilestone, craftAccessory,
  deliverProjectMaterial, duration, expandBarn, expandFarm, farmRemainingMs, harvest, harvestOutput, initial, plant, ranchRemainingMs,
  ranchStarved, recipeFor, rerollAccessory, sell, skillUnlocked, startProjectWork, surveyProject, upgrade, upgradeAccessory,
  upgradeGuild, type Model,
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
  // 한 시간 분량을 목표로 한다. 재료가 이미 쌓여 있으면 제작 시간만, 아니면 재료 채집까지 포함한 시간으로 나눈다.
  const hourOfCrafting = Math.max(1, Math.floor(HOUR / duration(s, id)));
  const stocked = Object.entries(recipeFor(s, id)).every(([m, n]) => have(s, m) >= n * hourOfCrafting);
  const perHour = stocked ? hourOfCrafting : Math.max(1, Math.floor(HOUR / Math.max(1, chainTime(s, id))));
  const count = Math.min(Math.ceil(expToLevel(s, skill, level) / r.exp), perHour);
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

// 그 사료를 먹는 모든 동물이 한 주기에 먹는 양.
function feedPerCycle(s: Model, feedId: string) {
  return Object.values(AnimalDB).filter(a => a.feedId === feedId).reduce((sum, a) => sum + a.feedAmount * animalCount(s, a.id), 0);
}

// 씨앗·사료로 남겨 둘 최소 수량.
function keepAmount(s: Model, id: string) {
  const r = ResourceDB[id];
  return Math.max(r.skill === 'farming' ? 5 : 0, feedPerCycle(s, id) * 4);
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

// ── 패시브 관리 ── 다 자란 밭을 거두고, 빈 칸에 목표에 필요한 작물 → 모자란 사료 → 경험치가 가장 좋은 작물
// 순으로 심는다. 사료가 다음 한 주기분도 없으면 남는 보유품을 팔아 4주기분을 산다(밭은 목표 작물에 먼저 쓴다).
function tend(s: Model, ctx: Context) {
  if (!skillUnlocked(s, 'farming')) return;
  const feedDemand: Record<string, number> = {};
  for (const feedId of new Set(Object.values(AnimalDB).map(a => a.feedId))) {
    const cycle = feedPerCycle(s, feedId);
    if (!cycle || have(s, feedId) >= cycle * 4) continue;
    feedDemand[feedId] = cycle * 4 - have(s, feedId);
    if (have(s, feedId) < cycle) {
      sellSurplus(s, ctx);
      const count = cycle * 4 - have(s, feedId);
      if (s.gold >= ResourceDB[feedId].buy * count) buyResource(s, feedId, count);
    }
  }
  if (!s.farmAuto) harvest(s);
  // 자동 파종 중에는 칸이 비지 않으므로, 목표·사료 작물이 어느 칸에도 없으면 필요 없는 작물 칸 하나를 비운다(D045).
  if (s.farmAuto) {
    for (const demand of [ctx.demand, feedDemand]) {
      const wanted = chooseCrop(s, demand);
      if (!wanted || growing(s, wanted)) continue;
      const spare = s.farmPlots.findIndex(plot => !!plot && !(ctx.demand[plot.cropId] > 0) && !(feedDemand[plot.cropId] > 0));
      if (spare >= 0) clearPlot(s, spare);
    }
  }
  for (let i = 0; i < s.farmPlots.length; i++) {
    if (s.farmPlots[i]) continue;
    const [crop, demand] = [ctx.demand, feedDemand, null].map(d => [chooseCrop(s, d), d] as const).find(([id]) => id) ?? [null, null];
    if (!crop) return;
    if (have(s, crop) === 0 && !buyResource(s, crop, 1)) return;
    if (!plant(s, crop)) return;
    // 같은 부족분에 칸을 몰아 심지 않도록 한 칸의 수확량만큼 수요를 줄인다.
    if (demand) demand[crop] -= harvestOutput(crop).count;
  }
}

// demand가 있으면 부족분이 남은 작물 중에서, 없으면 전체에서 경험치 효율이 가장 좋은 작물. 씨앗이 없으면 살 수 있어야 한다.
function chooseCrop(s: Model, demand: Record<string, number> | null): string | null {
  const level = s.skills.farming.level;
  let best: string | null = null;
  let bestScore = -1;
  for (const r of Object.values(ResourceDB)) {
    if (r.skill !== 'farming' || r.reqLevel > level || r.id.startsWith('sapling_')) continue;
    if (demand ? (demand[r.id] ?? 0) <= 0 : false) continue;
    if (have(s, r.id) === 0 && s.gold < r.buy * (demand ? 1 : 2)) continue;
    const score = r.exp / r.baseDurationMs;
    if (score > bestScore) { bestScore = score; best = r.id; }
  }
  return best;
}

// 목표가 패시브를 기다리는 동안에는 가장 레벨이 낮은 채집 스킬을 올린다(재료를 소모하지 않는 일).
// 채집 스킬이 모두 만렙이면 패시브 재료가 필요 없는 제작 스킬을 올린다.
function fallback(s: Model, ctx: Context, except: SkillId | null = null): Plan {
  const open = playable.filter(skill => skill !== except && !isPassive(skill) && skillUnlocked(s, skill) && s.skills[skill].level < MAX_SKILL_LEVEL);
  const gathers = (skill: SkillId) => Object.values(ResourceDB).some(r => r.skill === skill && !r.recipe && !r.dropOnly);
  const gathering = open.filter(gathers);
  const pool = gathering.length ? gathering : open.filter(skill => { const id = trainingResource(s, skill); return !!id && !needsPassive(s, id); });
  pool.sort((a, b) => s.skills[a].level - s.skills[b].level);
  for (const skill of pool) {
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

// 골드·재료를 내고 즉시 적용되는 시설/구매형 목표의 공통 절차: 레벨 → 재료 → 골드 → 실행.
function purchaseGoal(id: string, label: string, phase: string, req: {skill: SkillId; level: number; goldCost: number; cost: Record<string, number>},
  done: (s: Model) => boolean, act: (s: Model) => boolean): Goal {
  return {
    id, label, phase, done,
    step: (s, ctx) => {
      if (!skillUnlocked(s, req.skill)) return wait(`${skillNames[req.skill]} 미해금`);
      if (s.skills[req.skill].level < req.level) return train(s, ctx, req.skill, req.level);
      const plan = acquireAll(s, ctx, Object.entries(req.cost));
      if (plan) return plan;
      const gold = ensureGold(s, ctx, req.goldCost);
      if (gold) return gold;
      return act(s) ? PROGRESS : wait(`${label} 실패`);
    },
  };
}

function animalGoal(animalId: string, count: number): Goal {
  const a = AnimalDB[animalId];
  return purchaseGoal(`animal:${animalId}:${count}`, `${a.icon} ${a.name} ${count}마리`, '목장',
    {skill: 'ranching', level: ResourceDB[a.productId].reqLevel, goldCost: a.buyGold, cost: {}},
    s => animalCount(s, animalId) >= count, s => buyAnimal(s, animalId));
}

const slotName = (slot: AccessorySlotId) => accessorySlots.find(entry => entry.id === slot)!.name;
const REROLL_LIMIT = 10;

function accessoryGoals(tier: number): Goal[] {
  const def = accessoryTiers[tier];
  const stone = enchantmentStones[tier].resourceId;
  const goals: Goal[] = [];
  for (const {id: slot} of accessorySlots) {
    goals.push(purchaseGoal(`accessory:${slot}:${tier}`, `${slotName(slot)} ${def.name} 재질`, '장신구',
      {skill: 'blacksmithing', level: def.reqLevel, goldCost: def.goldCost, cost: def.cost},
      s => (s.accessories[slot]?.tier ?? -1) >= tier,
      s => tier === 0 ? craftAccessory(s, slot) : upgradeAccessory(s, slot)));
    // 그 재질의 최고 희귀도가 나올 때까지(최대 REROLL_LIMIT번) 같은 등급 부여석으로 리롤한다.
    let attempts = 0;
    goals.push({
      id: `reroll:${slot}:${tier}`, label: `${slotName(slot)} ${def.name} 리롤`, phase: '장신구',
      done: s => s.accessories[slot]?.rarity === def.maxRarity || attempts >= REROLL_LIMIT,
      step: (s, ctx) => {
        const plan = acquire(s, ctx, stone, 1);
        if (plan) return plan;
        if (!rerollAccessory(s, slot, stone, ctx.random)) return wait(`${slotName(slot)} 리롤 실패`);
        attempts++;
        return PROGRESS;
      },
    });
  }
  return goals;
}

function guildGoal(tier: number): Goal {
  return {
    id: `guild:${tier}`, label: guildTiers[tier].name, phase: '길드',
    done: s => s.guild >= tier,
    step: (s, ctx) => ensureGold(s, ctx, guildTiers[tier].goldCost) ?? (upgradeGuild(s) ? PROGRESS : wait('길드 승급 실패')),
  };
}

// 모든 스킬 Lv99: 가장 낮은 액티브 스킬부터 올린다(패시브는 밭·동물이 병행해서 올린다).
function maxAllGoal(): Goal {
  return {
    id: 'max', label: '전 스킬 Lv99', phase: '완주',
    done: s => playable.every(skill => s.skills[skill].level >= MAX_SKILL_LEVEL),
    step: (s, ctx) => {
      const active = playable.filter(skill => !isPassive(skill) && s.skills[skill].level < MAX_SKILL_LEVEL)
        .sort((a, b) => s.skills[a].level - s.skills[b].level);
      // 가장 낮은 스킬의 계획을 고르되, 나머지 스킬도 계획해 밭 작물 수요(마법 약초 등)를 빠짐없이 남긴다.
      let chosen: Plan | null = null;
      let waiting: Plan | null = null;
      for (const skill of active) {
        const plan = train(s, ctx, skill, s.skills[skill].level + 1);
        if (plan.kind === 'progress') return plan;
        if (plan.kind === 'wait') waiting ??= plan;
        else chosen ??= plan;
      }
      return chosen ?? waiting ?? wait('패시브 스킬 만렙 대기');
    },
  };
}

// 왕국 복원 이후의 성장 순서: 레벨 요구가 낮은 것부터 도구·시설·동물·장신구를 갖춘 뒤 전 스킬 만렙.
export function growthGoals(): Goal[] {
  const toolsAt = (tier: number) => playable.map(skill => toolGoal(skill, tier));
  const barn = (i: number) => purchaseGoal(`barn:${i + 1}`, `축사 강화 ${i + 1}단계`, '목장',
    {skill: 'ranching', level: barnUpgrades[i].reqLevel, goldCost: barnUpgrades[i].goldCost, cost: barnUpgrades[i].cost},
    s => s.barnLevel > i, expandBarn);
  const plot = (i: number) => purchaseGoal(`plot:${i + 2}`, `밭 ${i + 2}칸`, '농사',
    {skill: 'farming', level: plotUpgrades[i].reqLevel, goldCost: plotUpgrades[i].goldCost, cost: plotUpgrades[i].cost},
    s => s.farmPlots.length >= i + 2, expandFarm);
  const animalsTo = (count: number) => Object.keys(AnimalDB).map(id => animalGoal(id, count));
  return [
    ...accessoryGoals(0),
    ...toolsAt(2),
    plot(0), barn(0), animalGoal('chicken', 1), animalGoal('sheep', 1), guildGoal(1),
    purchaseGoal('farm:auto', '자동 파종/수확', '농사', {skill: 'farming', level: farmAutomation.reqLevel, goldCost: farmAutomation.goldCost, cost: farmAutomation.cost},
      s => s.farmAuto, automateFarm),
    ...accessoryGoals(1),
    animalGoal('cow', 1), ...animalsTo(2),
    ...toolsAt(3),
    guildGoal(2),
    ...accessoryGoals(2),
    plot(1), barn(1), ...animalsTo(3),
    ...accessoryGoals(3),
    maxAllGoal(),
  ];
}

export function buildGoals(): Goal[] {
  return [...kingdomGoals(), ...growthGoals()];
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
  if (!s.farmAuto) for (let i = 0; i < s.farmPlots.length; i++) if (s.farmPlots[i]) next = Math.min(next, farmRemainingMs(s, i) || Infinity);
  for (const id of Object.keys(s.ranch)) if (!ranchStarved(s, id)) next = Math.min(next, ranchRemainingMs(s, id) || Infinity);
  return next;
}

function apply(s: Model, plan: Plan, ctx: Context): boolean {
  clearQueuedAction(s);
  if (!start(s, plan, ctx)) return false;
  // 가끔 접속하는 플레이어는 지금 작업이 다음 접속 전에 끝나면 남는 시간을 채울 채집을 다음 작업으로 예약한다(D041).
  const interval = ctx.scenario.checkIntervalMs;
  const remaining = actionRemainingMs(s);
  if (interval > 0 && s.currentAction && remaining < interval) {
    const current = s.currentAction.kind === 'production' ? s.currentAction.resourceId : null;
    const filler = fallback(s, ctx, current ? ResourceDB[current].skill : null);
    if (filler.kind === 'produce' && filler.resourceId !== current) {
      queueAction(s, filler.resourceId, Math.max(1, Math.ceil((interval - remaining) / duration(s, filler.resourceId))));
    }
  }
  return true;
}

function start(s: Model, plan: Plan, ctx: Context): boolean {
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
  // 레벨은 시간 정산뿐 아니라 결정 중의 수동 수확으로도 오르므로, 마지막으로 본 레벨과 비교해 기록한다.
  const seen = playable.map(skill => s.skills[skill].level);
  const recordLevels = () => playable.forEach((skill, i) => {
    for (const mark of LEVEL_MARKS) if (seen[i] < mark && s.skills[skill].level >= mark) levelMarks.push({skill, level: mark, timeMs: t});
    seen[i] = s.skills[skill].level;
  });

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
    if (plan.kind === 'wait' && (plan.reason.endsWith('미해금') || plan.reason.endsWith('실패'))) { stuck = `${records[gi].label}: ${plan.reason}`; break; }

    tend(s, ctx);
    recordLevels();
    const effective = plan.kind === 'wait' ? fallback(s, ctx) : plan;
    // 계획한 뒤 밭 관리가 재료(씨앗)를 심어 버려 시작하지 못할 수 있다 — 그러면 다른 일을 하고 다음 결정에서 다시 계획한다.
    if (!apply(s, effective, ctx) && !apply(s, fallback(s, ctx), ctx)) { stuck = `${records[gi].label}: 작업 시작 실패(${JSON.stringify(effective)})`; break; }

    let dt = Math.min(actionRemainingMs(s) || Infinity, nextPassiveMs(s), HOUR);
    if (!Number.isFinite(dt)) dt = HOUR;
    // 실제 게임 시계(Date.now)처럼 정수 ms로만 시간을 흘린다.
    let next = t + Math.ceil(Math.max(1000, dt));
    if (scenario.checkIntervalMs > 0) next = Math.ceil(next / scenario.checkIntervalMs) * scenario.checkIntervalMs;
    next = Math.min(next, options.horizonMs);
    const step = next - t;

    if (plan.kind === 'wait') records[gi].waitMs[plan.reason] = (records[gi].waitMs[plan.reason] ?? 0) + step;

    // 작업이 끝나는 시점(예약 작업으로 넘어가는 시점)마다 나눠 정산해 활동 시간을 정확히 귀속한다.
    // 정산을 나눠도 결과는 한 번에 정산한 것과 같다(D038).
    for (let piece = 0; t < next; piece++) {
      const action = s.currentAction;
      if (!action) { idleMs += next - t; advance(s, next); t = next; break; }
      const key = action.kind === 'project' ? 'kingdom' : ResourceDB[action.resourceId].skill;
      const until = piece < 4 ? Math.min(next, t + Math.max(1, Math.ceil(actionRemainingMs(s)))) : next;
      advance(s, until);
      activeMs[key] = (activeMs[key] ?? 0) + until - t;
      t = until;
    }
    recordLevels();
    while (t >= nextSample) { samples.push(snapshot(s, nextSample)); nextSample += DAY; }
  }
  finishGoals();
  samples.push(snapshot(s, t));
  return {scenario, goals: records, levelMarks, activeMs, idleMs, elapsedMs: t, samples, decisions, stuck, final: s};
}
