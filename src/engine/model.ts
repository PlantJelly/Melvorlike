import { ResourceDB, toolTiers, playable, cropYield, passiveSkills, skillNames } from '../content/resources';
import { AnimalDB } from '../content/animals';
import { FoodDB } from '../content/foods';
import { ExchangeDB, exchangeRate, guildTiers, milestoneById, type MilestoneId } from '../content/guild';
import {
  accessoryOptionIds,
  accessoryOptions,
  accessorySlots,
  accessoryTiers,
  emptyAccessories,
  enchantmentStoneByResource,
  type AccessoryOptionId,
  type AccessorySlotId,
  type AccessoryState,
} from '../content/accessories';
import type { SkillId } from '../content/types';
import {
  ProjectDB,
  featureIds,
  projectIds,
  starterFeatures,
  starterSkills,
  type FeatureId,
  type ProjectId,
  type ProjectPhase,
} from '../content/projects';
import { experienceToNextLevel, getSpeedMultiplier, MAX_SKILL_LEVEL } from './formulas';

export interface DailyQuest { resourceId: string; amount: number; done: boolean }

export interface ProjectState {
  phase: ProjectPhase;
  clearingProgressMs: number;
  restorationProgressMs: number;
  delivered: Record<string, number>;
}

export type CurrentAction =
  | {kind: 'production'; resourceId: string; progressMs: number}
  | {kind: 'project'; projectId: ProjectId; stage: 'clearing' | 'restoring'; progressMs: number};

export interface Model {
  version: 14;
  gold: number;
  skills: Record<SkillId, { level: number; exp: number; maxExp: number }>;
  inventory: Record<string, number>;
  tools: Record<SkillId, number>;
  // progressMs는 속도 보정 전 작업량. 속도가 변해도 진행률은 유지한다.
  currentAction: CurrentAction | null;
  unlockedSkills: SkillId[];
  unlockedFeatures: FeatureId[];
  projects: Record<ProjectId, ProjectState>;
  meal: { foodId: string; remainingMs: number } | null;
  // 농사는 액티브 작업과 별개로 항상 병행 진행된다. 수확 전까지 진행률은 성장 시간에서 멈춘다.
  farmPlot: { cropId: string; progressMs: number } | null;
  // 키 존재 여부가 보유 여부. 값은 다음 산출까지의 진행량(속도 보정 전).
  ranch: Record<string, number>;
  // guildTiers 인덱스. 등급이 오를수록 환전 가능한 티어 차이가 늘어난다.
  guild: number;
  // day는 UTC 날짜 id(dayId 참고). 날짜가 바뀌면 advance()가 완료 여부와 무관하게 새로 갱신한다.
  dailyQuests: { day: number; quests: DailyQuest[] };
  // 달성 조건은 기존 영구 상태에서 계산하고 수령 여부만 저장한다. 과거 상태로 추론할 수 없는 환전만 별도 기록한다.
  milestones: { claimed: MilestoneId[]; exchangeUsed: boolean };
  // 슬롯별 장신구는 없거나 정확히 하나만 존재한다. 승급은 동일 객체의 재질만 올려 옵션을 보존한다.
  accessories: Record<AccessorySlotId, AccessoryState | null>;
  lastSaveTime: number;
  notice: string;
}

function dayId(time: number) {
  return Math.floor(time / 86400000);
}

// 날짜 id를 시드로 하는 결정론적 의사난수(xorshift32) — 같은 날짜·같은 해금 상태면 항상
// 같은 퀘스트가 나오게 해서, 이 프로젝트의 다른 시간 정산과 마찬가지로 온라인(짧은 틱)과
// 오프라인(긴 시간 한 번에 정산)이 같은 결과를 내도록 한다.
function seededRandom(seed: number): () => number {
  let x = seed >>> 0 || 1;
  return () => {
    x ^= x << 13; x >>>= 0;
    x ^= x >>> 17;
    x ^= x << 5; x >>>= 0;
    return x / 4294967296;
  };
}

// 이미 해금한 원재료 중에서만 골라 중복 없이 최대 3개 뽑는다(해금 재료가 3개 미만인
// 극단적인 경우에는 있는 만큼만 반환). decodeSave가 옛 저장을 이전할 때, 스킬을 복원한
// 뒤 해금 상태를 다시 반영해 퀘스트를 새로 뽑기 위해 이 함수를 그대로 가져다 쓴다.
export function generateDailyQuests(s: Model, day: number, random: () => number = seededRandom(day)): DailyQuest[] {
  const pool = Object.values(ResourceDB).filter(r => !r.recipe && skillUnlocked(s, r.skill) && s.skills[r.skill].level >= r.reqLevel);
  const quests: DailyQuest[] = [];
  // 뽑힌 항목을 후보군에서 제거하면 난수 함수가 같은 값을 반복해도 루프가 반드시 끝난다.
  while (quests.length < 3 && pool.length) {
    const [r] = pool.splice(Math.floor(random() * pool.length), 1);
    quests.push({ resourceId: r.id, amount: 5 + Math.floor(random() * 11), done: false });
  }
  return quests;
}

// 날짜가 바뀌면 완료 여부와 무관하게 새 퀘스트 3개로 교체한다(연체·이월 없음).
function refreshDailyQuests(s: Model, time: number) {
  const today = dayId(time);
  if (s.dailyQuests.day !== today) {
    s.dailyQuests = { day: today, quests: generateDailyQuests(s, today) };
  }
}

function projectStates(completed: boolean): Record<ProjectId, ProjectState> {
  return Object.fromEntries(projectIds.map(id => {
    const project = ProjectDB[id];
    return [id, completed ? {
      phase: 'complete',
      clearingProgressMs: project.clearingDurationMs,
      restorationProgressMs: project.restorationDurationMs,
      delivered: {...project.materials},
    } : {
      phase: 'surveyable',
      clearingProgressMs: 0,
      restorationProgressMs: 0,
      delivered: Object.fromEntries(Object.keys(project.materials).map(resourceId => [resourceId, 0])),
    }];
  })) as Record<ProjectId, ProjectState>;
}

function createModel(time: number, unlockedSkills: SkillId[], unlockedFeatures: FeatureId[], completedProjects: boolean): Model {
  const s: Model = {
    version: 14, gold: 1000,
    skills: Object.fromEntries(playable.map(id => [id, { level: 1, exp: 0, maxExp: experienceToNextLevel(1) }])) as Model['skills'],
    tools: Object.fromEntries(playable.map(id => [id, 0])) as Model['tools'],
    inventory: {}, currentAction: null, meal: null, farmPlot: null, ranch: {}, guild: 0,
    unlockedSkills: [...unlockedSkills], unlockedFeatures: [...unlockedFeatures], projects: projectStates(completedProjects),
    dailyQuests: { day: dayId(time), quests: [] }, milestones: {claimed: [], exchangeUsed: false},
    accessories: emptyAccessories(), lastSaveTime: time, notice: '',
  };
  s.dailyQuests.quests = generateDailyQuests(s, s.dailyQuests.day);
  return s;
}

export function initial(time = Date.now()): Model {
  return createModel(time, starterSkills, starterFeatures, false);
}

// 기존 기능 단위 테스트와 진행 시뮬레이터가 각 시스템을 바로 다룰 때 사용하는 완전 해금 기준 상태.
export function unlockedGame(time = Date.now()): Model {
  return createModel(time, playable, featureIds, true);
}

export function skillUnlocked(s: Model, skill: SkillId) {
  return s.unlockedSkills.includes(skill);
}

export function featureUnlocked(s: Model, feature: FeatureId) {
  return s.unlockedFeatures.includes(feature);
}

export function kingdomRestoration(s: Model) {
  return projectIds.reduce((total, id) => total + (s.projects[id].phase === 'complete' ? ProjectDB[id].restorationPoints : 0), 0);
}

export function accessoryBonus(s: Model, optionId: AccessoryOptionId) {
  let total = 0;
  for (const accessory of Object.values(s.accessories)) {
    if (accessory?.optionId === optionId && accessory.rarity !== null) {
      total += accessoryOptions[optionId].values[accessory.rarity];
    }
  }
  return total;
}

export function speedMultiplier(s: Model, skill: SkillId) {
  const food = s.meal && s.meal.remainingMs > 0 ? FoodDB[s.meal.foodId] : null;
  return getSpeedMultiplier(
    toolTiers[s.tools[skill]].bonus,
    food?.skills.includes(skill) ? food.speedBonus : 0,
    accessoryBonus(s, 'speed'),
  );
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
  skill.exp += amount * (1 + accessoryBonus(s, 'experience'));
  while (skill.level < MAX_SKILL_LEVEL && skill.exp >= skill.maxExp) {
    skill.exp -= skill.maxExp;
    skill.level++;
    skill.maxExp = experienceToNextLevel(skill.level);
  }
  if (skill.level === MAX_SKILL_LEVEL) skill.exp = Math.min(skill.exp, skill.maxExp);
}

// 한 구간 안에서는 속도가 일정하므로 횟수별 반복 없이 전체 생산량을 계산한다.
function advanceSegment(s: Model, elapsed: number) {
  const action = s.currentAction;
  if (!action) return 0;
  if (action.kind === 'project') {
    advanceProjectAction(s, action, elapsed);
    return 0;
  }
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

function addUnique<T>(values: T[], additions: T[]) {
  for (const value of additions) if (!values.includes(value)) values.push(value);
}

function advanceProjectAction(s: Model, action: Extract<CurrentAction, {kind: 'project'}>, elapsed: number) {
  const project = ProjectDB[action.projectId];
  const state = s.projects[action.projectId];
  if (action.stage === 'clearing') {
    if (state.phase !== 'clearing') { s.currentAction = null; return; }
    state.clearingProgressMs = Math.min(project.clearingDurationMs, state.clearingProgressMs + elapsed);
    action.progressMs = state.clearingProgressMs;
    if (state.clearingProgressMs + 1e-7 < project.clearingDurationMs) return;
    state.phase = 'delivery';
    for (const [id, count] of Object.entries(project.salvage)) s.inventory[id] = (s.inventory[id] ?? 0) + count;
    s.currentAction = null;
    s.notice = `${project.name} 정리 완료 · 회수품을 확보했습니다.`;
    return;
  }
  if (state.phase !== 'restoring') { s.currentAction = null; return; }
  state.restorationProgressMs = Math.min(project.restorationDurationMs, state.restorationProgressMs + elapsed);
  action.progressMs = state.restorationProgressMs;
  if (state.restorationProgressMs + 1e-7 < project.restorationDurationMs) return;
  state.phase = 'complete';
  addUnique(s.unlockedSkills, project.unlockSkills);
  addUnique(s.unlockedFeatures, project.unlockFeatures);
  s.currentAction = null;
  s.notice = `${project.name} 복원 완료 · ${project.unlockSkills.map(skill => skillNames[skill]).join(', ')} 해금`;
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
  // 시간이 거슬러 오는 호출(과거 time)에도 방금 위에서 고정한 s.lastSaveTime을 날짜 기준으로
  // 써야, 생산 정산이 쓰는 시계와 퀘스트 갱신이 쓰는 시계가 서로 어긋나지 않는다.
  refreshDailyQuests(s, s.lastSaveTime);
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
  if (!r || !skillUnlocked(s, r.skill) || passiveSkills.includes(r.skill) || s.skills[r.skill].level < r.reqLevel || !afford(s, r.recipe ?? {})) return false;
  s.currentAction = {kind: 'production', resourceId: id, progressMs: 0};
  s.notice = '';
  return true;
}

export function surveyProject(s: Model, projectId: ProjectId) {
  const state = s.projects[projectId];
  if (!state || state.phase !== 'surveyable') return false;
  state.phase = 'clearing';
  s.notice = `${ProjectDB[projectId].name} 조사 완료 · 폐허를 정리할 수 있습니다.`;
  return true;
}

export function startProjectWork(s: Model, projectId: ProjectId) {
  const state = s.projects[projectId];
  if (!state || (state.phase !== 'clearing' && state.phase !== 'restorable' && state.phase !== 'restoring')) return false;
  if (state.phase === 'restorable') state.phase = 'restoring';
  const stage = state.phase === 'clearing' ? 'clearing' : 'restoring';
  const progressMs = stage === 'clearing' ? state.clearingProgressMs : state.restorationProgressMs;
  s.currentAction = {kind: 'project', projectId, stage, progressMs};
  s.notice = '';
  return true;
}

export function deliverProjectMaterial(s: Model, projectId: ProjectId, resourceId: string, count: number) {
  const project = ProjectDB[projectId];
  const state = s.projects[projectId];
  const required = project?.materials[resourceId];
  if (!project || !state || state.phase !== 'delivery' || !required || !Number.isInteger(count) || count <= 0) return 0;
  const remaining = required - (state.delivered[resourceId] ?? 0);
  const moved = Math.min(count, remaining, s.inventory[resourceId] ?? 0);
  if (moved <= 0) return 0;
  s.inventory[resourceId] -= moved;
  state.delivered[resourceId] = (state.delivered[resourceId] ?? 0) + moved;
  if (Object.entries(project.materials).every(([id, amount]) => state.delivered[id] === amount)) state.phase = 'restorable';
  s.notice = `${ResourceDB[resourceId].name} ${moved}개 납품`;
  return moved;
}

export function upgrade(s: Model, skill: SkillId) {
  const tier = toolTiers[s.tools[skill] + 1];
  if (!skillUnlocked(s, skill) || !featureUnlocked(s, 'tools') || !tier || s.skills[skill].level < tier.level || !afford(s, tier.cost)) return false;
  spend(s, tier.cost);
  s.tools[skill]++;
  return true;
}

export function sell(s: Model, id: string, count: number) {
  if (!Object.hasOwn(ResourceDB, id) || !Number.isInteger(count) || count <= 0 || (s.inventory[id] ?? 0) < count) return false;
  s.inventory[id] -= count;
  s.gold += Math.floor(ResourceDB[id].sell * count * (1 + accessoryBonus(s, 'sale')));
  return true;
}

export function craftAccessory(s: Model, slotId: AccessorySlotId) {
  if (!featureUnlocked(s, 'equipment') || !skillUnlocked(s, 'blacksmithing') || !accessorySlots.some(slot => slot.id === slotId) || s.accessories[slotId]) return false;
  const tier = accessoryTiers[0];
  if (s.skills.blacksmithing.level < tier.reqLevel || s.gold < tier.goldCost || !afford(s, tier.cost)) return false;
  s.gold -= tier.goldCost;
  spend(s, tier.cost);
  s.accessories[slotId] = {tier: 0, optionId: null, rarity: null};
  s.notice = `${accessorySlots.find(slot => slot.id === slotId)!.name} 제작 완료`;
  return true;
}

export function upgradeAccessory(s: Model, slotId: AccessorySlotId) {
  if (!featureUnlocked(s, 'equipment') || !skillUnlocked(s, 'blacksmithing')) return false;
  const accessory = s.accessories[slotId];
  if (!accessory) return false;
  const next = accessoryTiers[accessory.tier + 1];
  if (!next || s.skills.blacksmithing.level < next.reqLevel || s.gold < next.goldCost || !afford(s, next.cost)) return false;
  s.gold -= next.goldCost;
  spend(s, next.cost);
  accessory.tier++;
  s.notice = `${accessorySlots.find(slot => slot.id === slotId)!.name} · ${next.name} 재질로 승급`;
  return true;
}

export function rollAccessoryRarity(accessoryTier: number, stoneTier: number, roll: number) {
  const accessoryTierDef = accessoryTiers[accessoryTier];
  const stone = Object.values(enchantmentStoneByResource).find(candidate => candidate.tier === stoneTier);
  if (!accessoryTierDef || !stone || stoneTier < accessoryTier || !Number.isFinite(roll) || roll < 0 || roll >= 1) return null;
  const allowed = stone.weights.slice(0, accessoryTierDef.maxRarity + 1);
  const total = allowed.reduce((sum, weight) => sum + weight, 0);
  if (total <= 0) return null;
  const target = roll * total;
  let cumulative = 0;
  for (let rarity = 0; rarity < allowed.length; rarity++) {
    cumulative += allowed[rarity];
    if (target < cumulative) return rarity;
  }
  return allowed.length - 1;
}

export function rerollAccessory(s: Model, slotId: AccessorySlotId, stoneId: string, random: () => number = Math.random) {
  if (!featureUnlocked(s, 'equipment') || !skillUnlocked(s, 'magic')) return false;
  const accessory = s.accessories[slotId];
  const stone = Object.hasOwn(enchantmentStoneByResource, stoneId) ? enchantmentStoneByResource[stoneId] : undefined;
  if (!accessory || !stone || stone.tier < accessory.tier || (s.inventory[stoneId] ?? 0) < 1) return false;
  const rarityRoll = random();
  const optionRoll = random();
  const rarity = rollAccessoryRarity(accessory.tier, stone.tier, rarityRoll);
  if (rarity === null || !Number.isFinite(optionRoll) || optionRoll < 0 || optionRoll >= 1) return false;
  const optionId = accessoryOptionIds[Math.floor(optionRoll * accessoryOptionIds.length)];
  s.inventory[stoneId]--;
  accessory.optionId = optionId;
  accessory.rarity = rarity;
  s.notice = `${accessoryOptions[optionId].name} · ${accessoryOptions[optionId].description} +${Math.round(accessoryOptions[optionId].values[rarity] * 100)}%`;
  return true;
}

// 가공품(recipe가 있는 아이템)은 제작으로만 얻을 수 있다. 원재료만 해금된 스킬 레벨 이상이면 즉시 구매 가능
// (game_design.md의 "이미 해금한 하위 티어 기본 재료는 골드로 즉시 구매 가능" 캐치업 규칙).
export function buyResource(s: Model, id: string, count: number) {
  const r = Object.hasOwn(ResourceDB, id) ? ResourceDB[id] : undefined;
  if (!r || !skillUnlocked(s, r.skill) || r.recipe || !Number.isInteger(count) || count <= 0 || s.skills[r.skill].level < r.reqLevel) return false;
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
  if (!featureUnlocked(s, 'guild') || !ex || !Number.isInteger(count) || count <= 0 || ex.tierGap > s.guild + 1 || (s.inventory[id] ?? 0) < count) return false;
  const gained = Math.floor(count * Math.pow(exchangeRate, ex.tierGap));
  if (gained <= 0) return false;
  s.inventory[id] -= count;
  s.inventory[ex.targetId] = (s.inventory[ex.targetId] ?? 0) + gained;
  s.milestones.exchangeUsed = true;
  return true;
}

function skillHasProgress(s: Model, skill: SkillId) {
  return s.skills[skill].level > 1 || s.skills[skill].exp > 0;
}

export function milestoneReady(s: Model, id: MilestoneId) {
  switch (id) {
    case 'first_gather': return (['logging', 'mining', 'fishing'] as const).some(skill => skillHasProgress(s, skill));
    case 'any_skill_10': return playable.some(skill => s.skills[skill].level >= 10);
    case 'first_tool': return playable.some(skill => s.tools[skill] > 0);
    case 'first_meal': return skillHasProgress(s, 'cooking');
    case 'first_animal': return Object.keys(s.ranch).length > 0;
    case 'first_harvest': return skillHasProgress(s, 'farming');
    case 'first_exchange': return s.milestones.exchangeUsed;
    case 'any_skill_50': return playable.some(skill => s.skills[skill].level >= 50);
    case 'first_enchantment_stone': return skillHasProgress(s, 'magic');
  }
}

export function claimMilestone(s: Model, id: MilestoneId) {
  const milestone = milestoneById[id];
  if (!featureUnlocked(s, 'guild') || !milestone || s.milestones.claimed.includes(id) || !milestoneReady(s, id)) return false;
  s.milestones.claimed.push(id);
  s.gold += milestone.reward;
  s.notice = `마일스톤 완료 · ${milestone.name} · ${milestone.reward} G 획득`;
  return true;
}

// 판매가의 2배(그냥 파는 것보다 낫게)에 판매가 장신구 보너스를 반영한다 — sell()과 같은 규칙.
// 엔진과 화면(GuildView)이 항상 같은 값을 쓰도록 이 함수 하나로 계산한다.
export function dailyQuestReward(s: Model, quest: DailyQuest) {
  return Math.floor(quest.amount * ResourceDB[quest.resourceId].sell * 2 * (1 + accessoryBonus(s, 'sale')));
}

// 요구량만큼 인벤토리에서 소모하고 골드로 보상한다. resourceId까지 함께 확인해, 클릭과 날짜
// 갱신이 겹쳐 퀘스트 배열이 통째로 바뀐 사이에 다른 퀘스트를 잘못 완료 처리하지 않게 한다.
export function completeDailyQuest(s: Model, index: number, resourceId: string) {
  const quest = s.dailyQuests.quests[index];
  if (!featureUnlocked(s, 'guild') || !quest || quest.resourceId !== resourceId || quest.done || (s.inventory[quest.resourceId] ?? 0) < quest.amount) return false;
  const r = ResourceDB[quest.resourceId];
  const reward = dailyQuestReward(s, quest);
  s.inventory[quest.resourceId] -= quest.amount;
  quest.done = true;
  s.gold += reward;
  s.notice = `일일 퀘스트 완료 · ${r.name} ${quest.amount}개 납품 · ${reward} G 획득`;
  return true;
}

export function upgradeGuild(s: Model) {
  const tier = guildTiers[s.guild + 1];
  if (!featureUnlocked(s, 'guild') || !tier || s.gold < tier.goldCost) return false;
  s.gold -= tier.goldCost;
  s.guild++;
  s.notice = `${tier.name} 승급 · 환전 가능 티어 ${s.guild + 1}단계까지 확대`;
  return true;
}

export function plant(s: Model, id: string) {
  const r = Object.hasOwn(ResourceDB, id) ? ResourceDB[id] : undefined;
  if (!skillUnlocked(s, 'farming') || !r || r.skill !== 'farming' || s.farmPlot || s.skills.farming.level < r.reqLevel || (s.inventory[id] ?? 0) < 1) return false;
  s.inventory[id]--;
  s.farmPlot = { cropId: id, progressMs: 0 };
  s.notice = '';
  return true;
}

export function harvest(s: Model) {
  const plot = s.farmPlot;
  if (!skillUnlocked(s, 'farming') || !plot || !farmReady(s)) return false;
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
  if (!skillUnlocked(s, 'ranching') || !a || Object.hasOwn(s.ranch, id)) return false;
  const p = ResourceDB[a.productId];
  if (s.skills.ranching.level < p.reqLevel || s.gold < a.buyGold) return false;
  s.gold -= a.buyGold;
  s.ranch[id] = 0;
  s.notice = `${a.name} 입주 · 사료(${ResourceDB[a.feedId].name})를 채워두면 자동으로 ${p.name}을(를) 만듭니다.`;
  return true;
}

export function eat(s: Model, foodId: string, count = 1) {
  const food = Object.hasOwn(FoodDB, foodId) ? FoodDB[foodId] : undefined;
  if (!skillUnlocked(s, 'cooking') || !food || !Number.isInteger(count) || count < 1 || count > 5 || (s.inventory[foodId] ?? 0) < count) return false;
  s.inventory[foodId] -= count;
  const remaining = s.meal?.foodId === foodId ? s.meal.remainingMs : 0;
  s.meal = { foodId, remainingMs: remaining + food.durationMs * count };
  s.notice = `${ResourceDB[foodId].name} ${count}개 사용 · ${food.description}`;
  return true;
}
